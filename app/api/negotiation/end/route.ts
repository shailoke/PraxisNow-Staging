
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { generateNegotiationPDF, NegotiationEvaluation } from '@/lib/negotiation-pdf'

export async function POST(req: NextRequest) {
    try {
        const { session_id } = await req.json()

        const cookieStore = await cookies()
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options)
                            })
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 1. Fetch Transcript & Session
        const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', session_id)
            .eq('user_id', user.id)
            .single()

        if (sessionError || !sessionData) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

        const session = sessionData as any

        // 2. Mark as Completed (Safety)
        if (session.status !== 'completed') {
            const { error: updateError } = await (supabase.from('sessions') as any)
                .update({ status: 'completed' })
                .eq('id', session_id)
        }

        // 3. Analyze Transcript with OpenAI
        const transcript = session.transcript || "No transcript available."

        const analyzeResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: "system",
                        content: `You are an expert Salary Negotiation Coach reviewing a session transcript.
                        Analyze the user's performance and output a JSON object with the following fields:
                        - context: string (Role, Level, Company Type, Offer details identified from conversation)
                        - tactics_encountered: string[] (List of employer tactics used)
                        - strengths: string[] (List of user's strong points)
                        - weak_phrasing: string[] (List of 3-5 weak phrases the CANDIDATE used. Do NOT include phrases spoken by the Coach/Interviewer.)
                        - strong_alternatives: string[] (List of 3-5 improved alternatives corresponding to the weak phrases)
                        - strategy_notes: string (A paragraph of strategic advice for next time)
                        
                        CRITICAL RULES:
                        1. **Strict Speaker Attribution**: You must strictly identify who is speaking. The transcript assigns roles (Assistant/User). ONLY analyze phrases spoken by the 'User' / 'Candidate' for the 'weak_phrasing' section.
                        2. **No False Attribution**: If the candidate did not use weak phrasing, or if the transcript is ambiguous, return an empty array for 'weak_phrasing' and 'strong_alternatives'. Do NOT guess or attribute Coach's words to the Candidate.
                        3. Focus on Indian tech industry context (CTC, ESOPs, etc) if relevant.
                        `
                    },
                    {
                        role: "user",
                        content: `Transcript:\n${transcript}`
                    }
                ],
                response_format: { type: "json_object" }
            })
        })

        if (!analyzeResponse.ok) throw new Error('Analysis failed')
        const analysisData = await analyzeResponse.json()
        const summary: NegotiationEvaluation = JSON.parse(analysisData.choices[0].message.content)

        // 4. Save Analysis to DB
        // We use evaluation_data field
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

        await adminClient
            .from('sessions')
            .update({ evaluation_data: summary as any } as any)
            .eq('id', session_id)

        // 5. Generate PDF
        const pdfBuffer = await generateNegotiationPDF(summary, {
            role: "Negotiation",
            level: "Pro+",
            date: new Date().toLocaleDateString(),
            duration: session.duration_seconds
                ? `${Math.floor(session.duration_seconds / 60)}m`
                : '30m'
        })

        // 6. Upload PDF
        const fileName = `Negotiation_ProPlus_${session_id}_${Date.now()}.pdf`
        const { error: uploadError } = await adminClient.storage
            .from('reports')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            })

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

        // 7. Get Signed URL
        const { data: signedData } = await adminClient.storage
            .from('reports')
            .createSignedUrl(fileName, 3600 * 24) // 24h link

        // 8. Update Session with PDF Filename
        await adminClient
            .from('sessions')
            .update({ pdf_url: fileName } as any)
            .eq('id', session_id)

        return NextResponse.json({
            summary,
            pdf_url: signedData?.signedUrl
        })

    } catch (error: any) {
        console.error('Negotiation End Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
