require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    const scenarios = [
        {
            role: 'Product Manager',
            level: 'Senior',
            scenario_title: 'AI Fluency Round',
            evaluation_dimensions: ['ai_fluency'],
            persona: 'Skeptical and technically rigorous.',
            prompt: 'AI-only interview round. Focus exclusively on ai_fluency. No definitions. Escalate depth aggressively.',
        },
        {
            role: 'Software Development Engineer',
            level: 'Senior',
            scenario_title: 'AI Fluency Round',
            evaluation_dimensions: ['ai_fluency'],
            persona: 'Skeptical and technically rigorous.',
            prompt: 'AI-only interview round. Focus exclusively on ai_fluency. No definitions. Escalate depth aggressively.',
        },
        {
            role: 'Data Scientist',
            level: 'Senior',
            scenario_title: 'AI Fluency Round',
            evaluation_dimensions: ['ai_fluency'],
            persona: 'Skeptical and technically rigorous.',
            prompt: 'AI-only interview round. Focus exclusively on ai_fluency. No definitions. Escalate depth aggressively.',
        },
        {
            role: 'Marketer',
            level: 'Senior',
            scenario_title: 'AI Fluency Round',
            evaluation_dimensions: ['ai_fluency'],
            persona: 'Skeptical and technically rigorous.',
            prompt: 'AI-only interview round. Focus exclusively on ai_fluency. No definitions. Escalate depth aggressively.',
        }
    ];

    const { data, error } = await supabase.from('scenarios').insert(scenarios).select();

    if (error) {
        console.error('Error inserting scenarios:', error);
        process.exit(1);
    }

    console.log('Successfully inserted scenarios:');
    console.log(data.map(s => ({ id: s.id, role: s.role })));
    process.exit(0);
}

main();
