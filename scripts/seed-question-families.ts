/**
 * QUESTION FAMILY DATABASE SEEDING SCRIPT
 * 
 * Populates the question_families table with all defined question families.
 * Run this after creating the database schema with add_question_families.sql
 * 
 * Usage:
 *   npm run seed-families
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { QUESTION_FAMILIES } from '../lib/question-families'
import type { Database } from '../lib/database.types'

async function seedQuestionFamilies() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing environment variables')
        console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
        process.exit(1)
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseKey)

    console.log('🌱 Starting question family seeding...')
    console.log(`📦 Total families to insert: ${QUESTION_FAMILIES.length}`)

    // Prepare insert records
    const records = QUESTION_FAMILIES.map(family => ({
        id: family.id,
        dimension: family.dimension,
        family_name: family.family_name,
        prompt_guidance: family.prompt_guidance
    }))

    // Group by dimension for logging
    const byDimension = QUESTION_FAMILIES.reduce((acc, f) => {
        if (!acc[f.dimension]) acc[f.dimension] = []
        acc[f.dimension].push(f.family_name)
        return acc
    }, {} as Record<string, string[]>)

    console.log('\n📊 Families by dimension:')
    Object.entries(byDimension).forEach(([dim, families]) => {
        console.log(`  ${dim} (${families.length}):`, families.join(', '))
    })

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

    console.log(`✅ Successfully seeded ${QUESTION_FAMILIES.length} question families`)
    console.log('\n🎯 Verification:')

    // Verify counts per dimension
    for (const [dimension, families] of Object.entries(byDimension)) {
        const { count } = await supabase
            .from('question_families')
            .select('*', { count: 'exact', head: true })
            .eq('dimension', dimension)

        console.log(`  ${dimension}: ${count}/${families.length} families in DB`)
    }

    console.log('\n✨ Seeding complete!')
}

seedQuestionFamilies().catch(console.error)
