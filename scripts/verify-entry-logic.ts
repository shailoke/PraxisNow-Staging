/**
 * VERIFICATION SCRIPT: Entry Randomization Logic
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { selectEntryFamily } from '../lib/runtime-scenario';

async function runVerification() {
    console.log('🧪 Starting Entry Randomization Verification...\n');

    // 1. Test Role Mapping
    console.log('1️⃣  Testing Role Mapping (Correct Family Type)');

    const sdeFamily = await selectEntryFamily('Senior Software Engineer', 'dummy-user', 'Starter');
    const sdeCorrect = sdeFamily && sdeFamily.startsWith('entry_sde');
    console.log(`   SDE Role  -> Family: ${sdeFamily} ${sdeCorrect ? '✅' : '❌'}`);

    const pmFamily = await selectEntryFamily('Product Manager', 'dummy-user', 'Starter');
    const pmCorrect = pmFamily && pmFamily.startsWith('entry_pm');
    console.log(`   PM Role   -> Family: ${pmFamily} ${pmCorrect ? '✅' : '❌'}`);

    const leadFamily = await selectEntryFamily('VP of Engineering', 'dummy-user', 'Starter');
    const leadCorrect = leadFamily && leadFamily.startsWith('entry_leadership');
    console.log(`   Lead Role -> Family: ${leadFamily} ${leadCorrect ? '✅' : '❌'}`);

    // 2. Test Determinism (Starter Tier)
    console.log('\n2️⃣  Testing Determinism (Starter)');
    const starter1 = await selectEntryFamily('Product Manager', 'u1', 'Starter');
    const starter2 = await selectEntryFamily('Product Manager', 'u2', 'Starter');

    console.log(`   Starter 1: ${starter1}`);
    console.log(`   Starter 2: ${starter2}`);
    console.log(`   Identical? ${starter1 === starter2 ? '✅' : '❌'}`);

    console.log('\n✨ Verification Logic Check Complete');
}

runVerification().catch(console.error);
