/**
 * PDF Generator Test Script
 * Tests the new canonical PDF template v1 implementation
 */

import { generateSessionPDF } from './lib/pdfGenerator';
import * as fs from 'fs';
import * as path from 'path';

// Mock evaluation data for testing
const mockEvaluation = {
    primary_failure_mode: {
        label: 'Evidence',
        diagnosis: 'Your answers referenced actions but did not provide specific outcomes or metrics.',
        why_it_hurt: 'Interviewers rely on measurable results to assess business impact and decision quality.'
    },
    communication_diagnostics: {
        structure: 'Inconsistent',
        evidence_grounding: 'Partial',
        verbal_noise: {
            detected: true,
            patterns: ['Frequent use of "like" and "you know"', 'Long setups before getting to the point']
        }
    },
    corrections: [
        {
            issue: 'Answers lacked specific timeframes',
            do_instead: 'State when the situation occurred (e.g., "Last quarter" or "During Q2 2024")',
            rule_of_thumb: 'Timeframes anchor your stories in reality'
        },
        {
            issue: 'Outcomes were implied but not stated',
            do_instead: 'Explicitly state at least one measurable result',
            rule_of_thumb: 'Numbers matter more than adjectives'
        }
    ],
    evaluation_depth: 'full',
    evaluation_dimensions: [
        'Technical problem-solving and system design thinking',
        'Cross-functional collaboration and stakeholder management',
        'Impact measurement and decision-making under ambiguity',
        'Communication clarity and structured storytelling'
    ],
    answer_upgrades: [
        {
            issue: 'Your answer references impact, but does not anchor it to a concrete metric',
            why_it_matters: 'Interviewers rely on metrics to assess scale and business impact',
            what_to_change_next_time: 'Explicitly state at least one measurable outcome, even if approximate (e.g., "~30% reduction" or "saved 10 hours per week")'
        },
        {
            issue: 'Multiple examples were mixed in a single answer',
            why_it_matters: 'Jumping between examples makes it harder for interviewers to extract a coherent signal',
            what_to_change_next_time: 'Pick one example and go deep on context, actions, and outcome instead of listing several'
        }
    ]
};

const mockMetadata = {
    role: 'Senior Product Manager',
    level: 'L6',
    scenario: 'Cross-functional Product Leadership',
    date: '2026-02-01',
    duration: '18m 32s',
    session_id: 'abc123',
    session_type: 'Standard Interview'
};

async function testPDFGeneration(tier: string) {
    console.log(`\n🧪 Testing PDF generation for ${tier} tier...`);

    try {
        const pdfBuffer = await generateSessionPDF(
            mockEvaluation,
            mockMetadata,
            tier
        );

        const outputPath = path.join(__dirname, `test_output_${tier.toLowerCase()}.pdf`);
        fs.writeFileSync(outputPath, pdfBuffer);

        console.log(`✅ ${tier} PDF generated successfully: ${outputPath}`);
        console.log(`   Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    } catch (error) {
        console.error(`❌ ${tier} PDF generation failed:`, error);
        throw error;
    }
}

async function runTests() {
    console.log('🚀 Starting PDF Template v1 Tests\n');
    console.log('='.repeat(60));

    try {
        // Test all three tiers
        await testPDFGeneration('Starter');
        await testPDFGeneration('Pro');
        await testPDFGeneration('Pro+');

        console.log('\n' + '='.repeat(60));
        console.log('✅ All PDF generation tests passed!');
        console.log('\nGenerated PDFs:');
        console.log('  - test_output_starter.pdf (Sections 1-4)');
        console.log('  - test_output_pro.pdf (Sections 1-6)');
        console.log('  - test_output_pro+.pdf (Sections 1-7)');
        console.log('\n📄 Review the PDFs to verify tier gating and content structure.');
    } catch (error) {
        console.error('\n❌ Test suite failed');
        process.exit(1);
    }
}

// Run tests
runTests();
