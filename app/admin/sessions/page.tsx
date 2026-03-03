import { getAdminSupabase } from '@/lib/admin-server'
import Link from 'next/link'

export default async function SessionsPage({
    searchParams,
}: {
    searchParams: Promise<{ user_id?: string, status?: string }>
}) {
    const { user_id, status } = await searchParams
    const supabase = await getAdminSupabase()

    let query = supabase.from('sessions').select('*, users(email), scenarios(role, level)').order('created_at', { ascending: false }).limit(50)

    if (user_id) query = query.eq('user_id', user_id)
    if (status) query = query.eq('status', status)

    const { data: sessions } = await query

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Session Explorer</h2>
                {user_id && <div className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">Filtering by User: {user_id} <Link href="/admin/sessions" className="ml-2 font-bold hover:text-blue-900">×</Link></div>}
                <div className="flex gap-2 text-sm">
                    <Link href="/admin/sessions" className={`px-3 py-1 rounded border ${!status ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}>All</Link>
                    <Link href="/admin/sessions?status=active" className={`px-3 py-1 rounded border ${status === 'active' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}>Active</Link>
                    <Link href="/admin/sessions?status=completed" className={`px-3 py-1 rounded border ${status === 'completed' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}>Completed</Link>
                    <Link href="/admin/sessions?status=failed" className={`px-3 py-1 rounded border ${status === 'failed' ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}>Failed</Link>
                </div>
            </div>

            <div className="bg-white border rounded shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-2">ID / Time</th>
                            <th className="px-4 py-2">User</th>
                            <th className="px-4 py-2">Scenario</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Stats</th>
                            <th className="px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sessions?.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2">
                                    <div className="font-mono text-xs text-gray-400">#{s.id}</div>
                                    <div className="text-xs text-gray-500 mt-1">{new Date(s.created_at).toLocaleString()}</div>
                                </td>
                                <td className="px-4 py-2">
                                    <Link href={`/admin/users/${s.user_id}`} className="hover:underline text-blue-600 block truncate w-32" title={s.users?.email}>
                                        {s.users?.email || s.user_id}
                                    </Link>
                                </td>
                                <td className="px-4 py-2">
                                    <div className="font-medium">{s.scenarios?.role || 'Custom'}</div>
                                    <div className="text-xs text-gray-500">{s.scenarios?.level}</div>
                                </td>
                                <td className="px-4 py-2">
                                    <StatusBadge status={s.status} />
                                </td>
                                <td className="px-4 py-2 text-xs">
                                    <div>Score: <span className="font-bold">{s.confidence_score ? s.confidence_score.toFixed(1) : '-'}</span></div>
                                    <div className="text-gray-500 duration">{Math.round(s.duration_seconds / 60)}m {s.duration_seconds % 60}s</div>
                                </td>
                                <td className="px-4 py-2">
                                    <Link href={`/admin/sessions/${s.id}`} className="text-indigo-600 hover:text-indigo-900 border border-indigo-200 bg-indigo-50 px-3 py-1 rounded text-xs font-bold transition-colors">
                                        INSPECT
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {!sessions?.length && (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No sessions found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const colors = {
        created: 'bg-gray-100 text-gray-600',
        active: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800'
    }
    return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${colors[status as keyof typeof colors] || 'bg-gray-100'}`}>{status}</span>
}
