/**
 * ENTRY FAMILIES DATABASE SEEDING SCRIPT
 * 
 * Populates the question_families table with Entry Question Families.
 * Run this to enable randomized first post-TMAY questions.
 * 
 * Usage:
 *   npm run seed-entry
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { ENTRY_FAMILIES } from '../lib/entry-families'
import type { Database } from '../lib/database.types'

async function seedEntryFamilies() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing environment variables')
        console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
        process.exit(1)
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey)

    console.log('🌱 Starting Entry Family seeding...')
    console.log(`📦 Total Entry families to insert: ${ENTRY_FAMILIES.length}`)

    // Prepare insert records
    const records = ENTRY_FAMILIES.map(family => ({
        id: family.id,
        dimension: family.dimension,
        family_name: family.family_name,
        prompt_guidance: family.prompt_guidance
    }))

    // Upsert (insert or update on conflict)
    console.log('\n💾 Inserting into database...')

    const { data, error } = await supabase
        .from('question_families')
        .upsert(records as any, {
            onConflict: 'id',
            ignoreDuplicates: false  // Update if exists
        })
        .select()

    if (error) {
        console.error('❌ Seeding failed:', error)
        process.exit(1)
    }

    console.log(`✅ Successfully seeded ${ENTRY_FAMILIES.length} Entry families`)
    console.log('\n🎯 Verification:')

    const { count } = await supabase
        .from('question_families')
        .select('*', { count: 'exact', head: true })
        .eq('dimension', 'Entry')

    console.log(`  Entry Families in DB: ${count}`)
    console.log('\n✨ Seeding complete!')
}

seedEntryFamilies().catch(console.error)
