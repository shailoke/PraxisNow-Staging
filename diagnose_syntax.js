const fs = require('fs');

const content = fs.readFileSync('c:/Users/okes/Desktop/Praxis/lib/pdfGenerator.ts', 'utf8');
const lines = content.split('\n');

let stack = [];
let inBlockComment = false;
let blockCommentStart = null;
let inTemplateString = false;
let templateStringStart = null;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    const prevChar = content[i - 1];

    // Handle Block Comments
    if (!inTemplateString && !inBlockComment && char === '/' && nextChar === '*') {
        inBlockComment = true;
        blockCommentStart = getLineCol(i);
        i++; // skip *
        continue;
    }
    if (inBlockComment && char === '*' && nextChar === '/') {
        inBlockComment = false;
        i++; // skip /
        continue;
    }
    if (inBlockComment) continue;

    // Handle Template Strings
    if (char === '`' && prevChar !== '\\') { // Simple escape check
        if (inTemplateString) {
            inTemplateString = false;
        } else {
            inTemplateString = true;
            templateStringStart = getLineCol(i);
        }
        continue;
    }

    if (inTemplateString) {
        // Inside template string, only check for ${ } if we wanted to be super fancy, but for now just matching ` is enough.
        // Actually, braces inside ${} complicate things. 
        // For this diagnostic, let's just track ` ` as a pair.
        // If we are in a huge template string (the prompt), we ignore braces inside it?
        // Wait, the prompt IS a template string. And it contains JSON example braces!
        // So { and } inside a template string should NOT be pushed to stack.
        // But ${ starts a block that DOES need braces.

        if (char === '$' && nextChar === '{') {
            stack.push({ char: '${', ...getLineCol(i) });
            i++;
        } else if (char === '}' && stack.length > 0 && stack[stack.length - 1].char === '${') {
            stack.pop();
        }
        continue;
    }

    // Handle Braces/Parens/Brackets (outside strings/comments)
    if (['{', '(', '['].includes(char)) {
        stack.push({ char, ...getLineCol(i) });
    } else if (['}', ')', ']'].includes(char)) {
        if (stack.length === 0) {
            console.log(`EXTRA CLOSING '${char}' at line ${getLineCol(i).line}`);
            process.exit(1);
        }
        const last = stack.pop();
        const expected = getMatching(last.char);
        if (char !== expected) {
            console.log(`MISMATCH: Expected '${expected}' to close '${last.char}' from line ${last.line}, but got '${char}' at line ${getLineCol(i).line}`);
            process.exit(1);
        }
    }
}

// Final Report
if (inBlockComment) {
    console.log(`Root Cause:\n- Type: unclosed block comment\n- Opened at: line ${blockCommentStart.line}\n- Missing: */`);
} else if (inTemplateString) {
    console.log(`Root Cause:\n- Type: unclosed template literal\n- Opened at: line ${templateStringStart.line}\n- Missing: \``);
    console.log(`Evidence:\n${getLineContent(templateStringStart.line)}\n... (EOF)`);
} else if (stack.length > 0) {
    const last = stack[stack.length - 1];
    console.log(`Root Cause:\n- Type: unbalanced ${last.char === '${' ? 'template expression' : 'brace'}\n- Opened at: line ${last.line}\n- Missing: ${getMatching(last.char)}`);
    console.log(`Evidence:\n${getLineContent(last.line)}`);
} else {
    console.log("No syntax errors found.");
}

function getLineCol(index) {
    let line = 1;
    let col = 0;
    for (let j = 0; j <= index; j++) {
        if (content[j] === '\n') {
            line++;
            col = 0;
        } else {
            col++;
        }
    }
    return { line, col };
}

function getMatching(char) {
    if (char === '{') return '}';
    if (char === '(') return ')';
    if (char === '[') return ']';
    if (char === '${') return '}';
}

function getLineContent(lineNum) {
    // get 3 lines around
    const start = Math.max(0, lineNum - 2);
    const end = Math.min(lines.length, lineNum + 1);
    return lines.slice(start, end).map((l, idx) => `${start + idx + 1}: ${l}`).join('\n');
}
