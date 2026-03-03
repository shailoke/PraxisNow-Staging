require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    // Try inserting with varying short texts
    const test1 = {
        role: 'A'.repeat(29), // Software Development Engineer is 29
        level: 'B'.repeat(6), // Senior
        scenario_title: 'C'.repeat(16), // AI Fluency Round
        evaluation_dimensions: ['ai_fluency'],
        persona: 'D'.repeat(35),
        prompt: 'E'.repeat(102),
    };

    const { data, error } = await supabase.from('scenarios').insert(test1).select();
    if (error) {
        console.error('Test 1 failed:', error);
    } else {
        console.log('Test 1 succeeded, deleting', data[0].id);
        await supabase.from('scenarios').delete().eq('id', data[0].id);
    }

    // Then try to isolate which one is 50.
}

main();
