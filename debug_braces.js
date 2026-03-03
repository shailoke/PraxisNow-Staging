const fs = require('fs');

const content = fs.readFileSync('c:/Users/okes/Desktop/Praxis/app/api/evaluate/route.ts', 'utf8');

let stack = [];
let line = 1;
let col = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    col++;
    if (char === '\n') {
        line++;
        col = 0;
    }

    if (char === '{') {
        stack.push({ char, line, col });
    } else if (char === '}') {
        if (stack.length === 0) {
            console.error(`Unmatched closing brace at line ${line} col ${col}`);
            process.exit(1);
        }
        stack.pop();
    }
}

if (stack.length > 0) {
    const last = stack[stack.length - 1];
    console.error(`Unmatched opening brace at line ${last.line} col ${last.col}`);
} else {
    console.log('Braces are balanced.');
}
