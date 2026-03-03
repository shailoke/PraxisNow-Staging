import { getAdminSupabase } from '@/lib/admin-server'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const supabase = await getAdminSupabase()

    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: sessionCount } = await supabase.from('sessions').select('*', { count: 'exact', head: true })
    const { count: pendingSessions } = await supabase.from('sessions').select('*', { count: 'exact', head: true }).eq('status', 'created')

    // Recent logs
    const { data: logs } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold uppercase tracking-tight">System Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total Users" value={userCount || 0} />
                <StatCard label="Total Sessions" value={sessionCount || 0} />
                <StatCard label="Pending Sessions" value={pendingSessions || 0} warning={(pendingSessions || 0) > 10} />
            </div>

            <div className="bg-white p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Recent Admin Activity</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase">
                            <tr>
                                <th className="px-4 py-2">Time</th>
                                <th className="px-4 py-2">Admin</th>
                                <th className="px-4 py-2">Action</th>
                                <th className="px-4 py-2">Target</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {logs?.map(log => (
                                <tr key={log.id}>
                                    <td className="px-4 py-2">{new Date(log.created_at).toLocaleString()}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{log.admin_id.slice(0, 8)}...</td>
                                    <td className="px-4 py-2 font-bold">{log.action}</td>
                                    <td className="px-4 py-2">{log.target_resource}: {log.target_id || 'N/A'}</td>
                                </tr>
                            ))}
                            {!logs?.length && (
                                <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-500">No logs found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, warning }: { label: string, value: number, warning?: boolean }) {
    return (
        <div className={`p-6 border ${warning ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'} shadow-sm`}>
            <div className="text-sm text-gray-500 uppercase">{label}</div>
            <div className="text-3xl font-mono font-bold mt-2">{value}</div>
        </div>
    )
}
