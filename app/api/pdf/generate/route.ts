import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { generateSessionPDF } from '@/lib/pdfGenerator'
import { trackEvent } from '@/lib/analytics'

export async function POST(req: NextRequest) {
    try {
        const { session_id } = await req.json();

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

        // 1. Fetch Requesting User
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 2. Fetch session (Verify Ownership)
        const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .select('*, scenarios:scenario_id(*)')
            .eq('id', session_id)
            .eq('user_id', authUser.id) // Strict Ownership Check
            .single();

        if (sessionError || !sessionData) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }
        const session = sessionData as any;

        // 3. Fetch user (for tier)
        const { data: userData } = await supabase
            .from('users')
            .select('package_tier')
            .eq('id', session.user_id)
            .single();

        if (!userData) throw new Error('User not found');
        const user = userData as { package_tier: string };

        // OPTIMIZATION: If PDF already exists, just return a fresh signed URL
        if (session.pdf_url && session.pdf_url.endsWith('.pdf')) {
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

            const { data: signedData, error: signError } = await adminClient.storage
                .from('reports')
                .createSignedUrl(session.pdf_url, 3600);

            if (signedData?.signedUrl && !signError) {
                return NextResponse.json({ pdf_url: signedData.signedUrl });
            }
            // If error (e.g. file missing), fall through to regenerate
        }

        // 4. Construct Evaluation Data
        let evaluation: any = session.evaluation_data;

        if (evaluation) {
            evaluation = {
                ...evaluation,
                improvement_priorities: Array.isArray(evaluation.improvement_priorities) ? evaluation.improvement_priorities : [],
                alternative_approaches: Array.isArray(evaluation.alternative_approaches) ? evaluation.alternative_approaches : [],
                clarity: evaluation.clarity ?? 0,
                structure: evaluation.structure ?? 0,
                recovery: evaluation.recovery ?? 0,
                signal_noise: evaluation.signal_noise ?? 0,
                key_insight: evaluation.key_insight || "No insight available."
            };
        } else {
            // Fallback for legacy
            evaluation = {
                clarity: session.clarity || 0,
                structure: session.structure || 0,
                recovery: session.recovery || 0,
                signal_noise: session.signal_noise || 0,
                key_insight: session.key_insight || "No insight available.",
                improvement_priorities: session.improvement_priorities || [],
                alternative_approaches: session.alternative_approaches,
                pattern_analysis: session.pattern_analysis,
                risk_projection: session.risk_projection,
                readiness_assessment: session.readiness_assessment,
                framework_contrast: session.framework_contrast
            };
        }

        // 5. PDF Metadata
        const baseScenario = session.scenarios;
        const role = baseScenario?.role || 'User';
        const level = baseScenario?.level || 'Standard';
        const scenario_title = baseScenario?.prompt ? `${role} ${level}` : 'Interview Session';

        // 6. Generate PDF
        const pdfBuffer = await generateSessionPDF(
            evaluation,
            {
                role,
                level,
                scenario: scenario_title,
                date: new Date(session.created_at).toLocaleDateString(),
                duration: session.duration_seconds
                    ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s`
                    : 'N/A',
                session_id: session_id,
                session_type: 'Standard Interview'
            },
            user.package_tier
        );

        // 7. Upload (Secure)
        const sanitizedRole = role.replace(/[^a-zA-Z0-9]/g, '');
        const sanitizedLevel = level.replace(/[^a-zA-Z0-9]/g, '');
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `PraxisNow_${sanitizedRole}_${sanitizedLevel}_${session_id.toString().slice(0, 6)}_${dateStr}.pdf`;

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

        const { error: uploadError } = await adminClient.storage
            .from('reports')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });

        if (uploadError) throw new Error(`Upload Failed: ${uploadError.message}`);

        // 8. Generate Signed URL
        const { data: signedData } = await adminClient.storage
            .from('reports')
            .createSignedUrl(fileName, 3600);

        // 9. Update Session with PATH (not signed URL)
        const { error: updateError } = await (supabase.from('sessions') as any)
            .update({ pdf_url: fileName })
            .eq('id', session_id);

        if (updateError) throw new Error(`Session Update Failed: ${updateError.message}`);

        // Fire-and-forget analytics
        trackEvent('pdf_downloaded', authUser.id, {
            session_id,
            role,
            round: baseScenario?.round ?? null,
        })

        return NextResponse.json({ pdf_url: signedData?.signedUrl });

    } catch (error: unknown) {
        console.error('PDF Generation Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
