import { getAdminSupabase } from '@/lib/admin-server'
import { forceCompleteSession, refundSession, reRunEvaluation } from '@/app/admin/actions'
import Link from 'next/link'

export default async function SessionDetailsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await getAdminSupabase()

    // Check if session exists
    const { data: session, error } = await supabase
        .from('sessions')
        .select('*, users(*), scenarios(*)')
        .eq('id', id)
        .single()

    if (error || !session) {
        return <div className="p-8 text-red-500">Session not found</div>
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/sessions" className="text-gray-500 hover:text-black">← Back to Sessions</Link>
                <div className="flex-1"></div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Session Detail</h2>
                    <div className="text-sm text-gray-400 font-mono">{session.id}</div>
                </div>
                <div className="flex gap-2">
                    <QuickAction id={id} action={forceCompleteSession} label="Force Complete" />
                    <QuickAction id={id} action={reRunEvaluation} label="Re-Run Eval" style="blue" />
                    <QuickAction id={id} action={refundSession} label="Refund / Void" style="red" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 space-y-6">
                    {/* Meta Card */}
                    <div className="bg-white p-6 border rounded shadow-sm">
                        <h3 className="font-bold border-b pb-2 mb-4">Metadata</h3>
                        <dl className="space-y-3 text-sm">
                            <div className="grid grid-cols-3"><dt className="text-gray-500">Status</dt><dd className="col-span-2 font-bold uppercase">{session.status}</dd></div>
                            <div className="grid grid-cols-3"><dt className="text-gray-500">Date</dt><dd className="col-span-2">{new Date(session.created_at).toLocaleString()}</dd></div>
                            <div className="grid grid-cols-3"><dt className="text-gray-500">Duration</dt><dd className="col-span-2">{session.duration_seconds}s</dd></div>
                            <div className="grid grid-cols-3"><dt className="text-gray-500">User</dt><dd className="col-span-2 truncate" title={session.user_id}><Link href={`/admin/users/${session.user_id}`} className="text-blue-600 hover:underline">{session.users?.email || 'Unknown'}</Link></dd></div>
                            <div className="grid grid-cols-3"><dt className="text-gray-500">Scenario</dt><dd className="col-span-2">{session.scenarios?.role || 'Custom'} ({session.scenarios?.level})</dd></div>
                            <div className="grid grid-cols-3"><dt className="text-gray-500">PDF Path</dt><dd className="col-span-2 break-all font-mono text-xs">{session.pdf_url || 'None'}</dd></div>
                        </dl>
                    </div>
                </div>

                <div className="col-span-2 space-y-6">
                    {/* Transcript */}
                    <div className="bg-white p-6 border rounded shadow-sm">
                        <h3 className="font-bold border-b pb-2 mb-4">Transcript</h3>
                        <div className="bg-gray-50 p-4 rounded text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {session.transcript || 'No transcript available.'}
                        </div>
                    </div>

                    {/* Raw JSON */}
                    <div className="bg-white p-6 border rounded shadow-sm">
                        <h3 className="font-bold border-b pb-2 mb-4">Evaluation Data</h3>
                        {session.evaluation_data ? (
                            <details>
                                <summary className="cursor-pointer text-sm text-blue-600 font-medium">Click to view raw JSON</summary>
                                <pre className="mt-4 bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(session.evaluation_data, null, 2)}
                                </pre>
                            </details>
                        ) : (
                            <div className="text-gray-400 text-sm">No evaluation data.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function QuickAction({ id, action, label, style = 'gray' }: any) {
    const bindAction = action.bind(null, id)
    return (
        <form action={async () => {
            'use server'
            await bindAction()
        }}>
            <button className={`px-4 py-2 rounded text-sm font-bold text-white shadow-sm transition-colors ${style === 'red' ? 'bg-red-600 hover:bg-red-700' :
                    style === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                        'bg-gray-800 hover:bg-gray-900'
                }`}>
                {label}
            </button>
        </form>
    )
}
