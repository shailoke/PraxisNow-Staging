'use server'

import { getAdminSupabase, logAdminAction } from '@/lib/admin-server'
import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { BUILD_PROMPT } from '@/lib/eval-logic'

// USER ACTIONS
export async function updateUserTier(userId: string, tier: 'Starter' | 'Pro' | 'Pro+') {
    const supabase = await getAdminSupabase()

    const { error } = await supabase.from('users').update({ package_tier: tier }).eq('id', userId)
    if (error) throw error

    await logAdminAction('UPDATE_TIER', 'user', userId, { tier })
    revalidatePath(`/admin/users/${userId}`)
}

export async function addCredits(userId: string, amount: number, type: 'interview' | 'negotiation' = 'interview') {
    const supabase = await getAdminSupabase()

    // Get current
    const { data: user } = await supabase.from('users').select('available_sessions, negotiation_credits').eq('id', userId).single()
    if (!user) throw new Error('User not found')

    if (type === 'negotiation') {
        const newAmount = (user.negotiation_credits || 0) + amount
        const { error } = await supabase.from('users').update({ negotiation_credits: newAmount }).eq('id', userId)
        if (error) throw error
        await logAdminAction('ADD_CREDITS', 'user', userId, { type: 'negotiation', added: amount, total: newAmount })
    } else {
        const newAmount = (user.available_sessions || 0) + amount
        const { error } = await supabase.from('users').update({ available_sessions: newAmount }).eq('id', userId)
        if (error) throw error
        await logAdminAction('ADD_CREDITS', 'user', userId, { type: 'interview', added: amount, total: newAmount })
    }

    revalidatePath(`/admin/users/${userId}`)
}

// SESSION ACTIONS
export async function forceCompleteSession(sessionId: string) {
    const supabase = await getAdminSupabase()
    await supabase.from('sessions').update({ status: 'completed' }).eq('id', sessionId)
    await logAdminAction('FORCE_COMPLETE', 'session', sessionId)
    revalidatePath(`/admin/sessions`)
    revalidatePath(`/admin/sessions/${sessionId}`)
}

export async function refundSession(sessionId: string) {
    const supabase = await getAdminSupabase()

    const { data: session } = await supabase.from('sessions').select('user_id').eq('id', sessionId).single()
    if (!session) throw new Error('Session not found')

    // Mark failed and refund
    await supabase.from('sessions').update({ status: 'failed' }).eq('id', sessionId)

    const { data: user } = await supabase.from('users').select('available_sessions').eq('id', session.user_id).single()
    if (user) {
        await supabase.from('users').update({ available_sessions: (user.available_sessions || 0) + 1 }).eq('id', session.user_id)
    }

    await logAdminAction('REFUND_SESSION', 'session', sessionId, { refunded_to: session.user_id })
    revalidatePath(`/admin/sessions`)
    revalidatePath(`/admin/sessions/${sessionId}`)
}

export async function reRunEvaluation(sessionId: string) {
    const supabase = await getAdminSupabase()

    const { data: session, error } = await supabase
        .from('sessions')
        .select('*, scenarios:scenario_id(*), users:user_id(*)')
        .eq('id', sessionId)
        .single()

    if (error || !session) throw new Error('Session lookup failed: ' + (error?.message || 'Not found'))

    const s = session as any
    const role = s.scenarios?.role || 'User'
    const level = s.scenarios?.level || 'Standard'
    const scenario_title = s.scenarios?.prompt || 'Custom Scenario'
    const role_specific_dimensions = Array.isArray(s.scenarios?.evaluation_dimensions)
        ? s.scenarios.evaluation_dimensions.join('\n')
        : ''

    const full_transcript = s.transcript || ''
    const package_tier = s.users?.package_tier || 'Starter'

    if (!full_transcript) throw new Error('No transcript found')

    const prompt = BUILD_PROMPT({
        role,
        level,
        interview_type: 'Behavioral',
        scenario_title,
        role_specific_dimensions,
        package_tier,
        full_transcript,
        prior_session_summaries: ''
    })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: "json_object" }
    })

    let evaluation
    try {
        evaluation = JSON.parse(result.choices[0].message.content || '{}')
    } catch (e) {
        throw new Error('Failed to parse AI response')
    }

    await supabase.from('sessions').update({
        ...evaluation,
        evaluation_data: evaluation,
        status: 'completed'
    }).eq('id', sessionId)

    await logAdminAction('RERUN_EVAL', 'session', sessionId)
    revalidatePath(`/admin/sessions/${sessionId}`)
}

// SYSTEM ACTIONS
export async function toggleSystemSetting(key: string, value: boolean) {
    const supabase = await getAdminSupabase()

    const { data: existing } = await supabase.from('system_settings').select('*').eq('key', key).single()

    if (existing) {
        await supabase.from('system_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
    } else {
        await supabase.from('system_settings').insert({ key, value, updated_at: new Date().toISOString() })
    }

    await logAdminAction('TOGGLE_SETTING', 'system', key, { value })
    revalidatePath('/admin/system')
}

// SCENARIO ACTIONS
export async function updateScenario(id: number, active: boolean, prompt?: string) {
    const supabase = await getAdminSupabase()

    const updates: any = { is_active: active }
    if (prompt) updates.prompt = prompt

    await supabase.from('scenarios').update(updates).eq('id', id)

    await logAdminAction('UPDATE_SCENARIO', 'scenario', id.toString(), { active, prompt_updated: !!prompt })
    revalidatePath('/admin/scenarios')
}
