
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        envVars[key] = value;
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching most recent completed session...');
    const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, created_at, status, transcript, duration_seconds')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching session:', error);
        return;
    }

    if (!sessions || sessions.length === 0) {
        console.log('No completed sessions found.');
        return;
    }

    const session = sessions[0];
    console.log(`\n=== SESSION: ${session.id} ===`);
    console.log(`Created: ${session.created_at}`);
    console.log(`Duration: ${session.duration_seconds}s`);

    console.log('\n=== TRANSCRIPT PREVIEW (First 500 chars) ===');
    console.log(session.transcript ? session.transcript.substring(0, 500) : 'NULL');

    console.log('\n=== TRANSCRIPT STRUCTURE AUDIT ===');
    if (typeof session.transcript !== 'string') {
        console.log('TYPE:', typeof session.transcript);
        if (Array.isArray(session.transcript)) {
            console.log('IS ARRAY: Yes');
            console.log('First Element:', session.transcript[0]);
        } else {
            console.log('IS OBJECT');
        }
    } else {
        console.log('TYPE: STRING');
        console.log('Contains "ASSISTANT:":', session.transcript.includes('ASSISTANT:'));
        console.log('Contains "USER:":', session.transcript.includes('USER:'));
    }

    console.log('\n=== INTERVIEW TURNS ===');
    const { data: turns, error: turnsError } = await supabase
        .from('interview_turns')
        .select('*')
        .eq('session_id', session.id)
        .order('turn_index', { ascending: true });

    if (turnsError) {
        console.error('Error fetching turns:', turnsError);
    } else {
        console.log(`Found ${turns.length} turns.`);
        turns.forEach(t => {
            console.log(`#${t.turn_index} [${t.turn_type}] ${t.content.substring(0, 50)}... (${t.created_at})`);
        });
    }
}

main();
