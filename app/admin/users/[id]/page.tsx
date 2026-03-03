import { getAdminSupabase } from '@/lib/admin-server'
import { updateUserTier, addCredits } from '@/app/admin/actions'
import Link from 'next/link'

export default async function UserDetailsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await getAdminSupabase()

    // Check if user exists first to avoid 404
    const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single()

    if (error || !user) {
        return <div className="p-8 text-red-500">User not found</div>
    }

    const { data: sessions } = await supabase.from('sessions').select('*').eq('user_id', id).order('created_at', { ascending: false })

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/users" className="text-gray-500 hover:text-black text-sm">← Back to Users</Link>
                <div className="flex-1"></div>
            </div>

            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{user.email}</h2>
                <div className="text-xs font-mono text-gray-400">{user.id}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Package Control */}
                <div className="bg-white p-6 border rounded shadow-sm">
                    <h3 className="text-lg font-bold mb-4 border-b pb-2">Package & Credits</h3>

                    <div className="space-y-6">
                        <form action={async (formData) => {
                            'use server'
                            await updateUserTier(id, formData.get('tier') as 'Starter' | 'Pro' | 'Pro+')
                        }} className="flex flex-col gap-2">
                            <label className="font-medium text-sm text-gray-700">Package Tier</label>
                            <div className="flex gap-2">
                                <select name="tier" defaultValue={user.package_tier} className="border p-2 rounded flex-1">
                                    <option value="Starter">Starter</option>
                                    <option value="Pro">Pro</option>
                                    <option value="Pro+">Pro+</option>
                                    <option value="Free">Free</option>
                                </select>
                                <button className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800">Update</button>
                            </div>
                        </form>

                        <form action={async (formData) => {
                            'use server'
                            await addCredits(id, parseInt(formData.get('amount') as string), formData.get('type') as 'interview' | 'negotiation')
                        }} className="flex flex-col gap-2">
                            <label className="font-medium text-sm text-gray-700">Add Session Credits</label>
                            <div className="flex gap-2">
                                <input name="amount" type="number" defaultValue="1" className="border p-2 rounded w-24" />
                                <button name="type" value="interview" className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">Add Interview</button>
                                <button name="type" value="negotiation" className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">Add Negotiation</button>
                            </div>
                        </form>

                        <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-100 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-500">Interview Balance</div>
                                <div className="text-xl font-bold">{user.available_sessions} <span className="text-sm font-normal text-gray-400">sessions</span></div>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                                <div className="text-sm text-gray-500">Negotiation Balance</div>
                                <div className="text-xl font-bold text-purple-700">{user.negotiation_credits || 0} <span className="text-sm font-normal text-gray-400">sessions</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Data */}
                <div className="bg-white p-6 border rounded shadow-sm">
                    <h3 className="text-lg font-bold mb-4 border-b pb-2">Profile Data</h3>
                    <dl className="space-y-3 text-sm">
                        <div className="grid grid-cols-3 border-b border-gray-50 pb-2"><dt className="text-gray-500">Full Name</dt><dd className="col-span-2 font-medium">{user.full_name || '-'}</dd></div>
                        <div className="grid grid-cols-3 border-b border-gray-50 pb-2"><dt className="text-gray-500">Role</dt><dd className="col-span-2">{user.primary_role || '-'}</dd></div>
                        <div className="grid grid-cols-3 border-b border-gray-50 pb-2"><dt className="text-gray-500">Designation</dt><dd className="col-span-2">{user.designation || '-'}</dd></div>
                        <div className="grid grid-cols-3 border-b border-gray-50 pb-2"><dt className="text-gray-500">Company</dt><dd className="col-span-2">{user.current_company || '-'}</dd></div>
                        <div className="grid grid-cols-3 border-b border-gray-50 pb-2"><dt className="text-gray-500">Joined</dt><dd className="col-span-2">{new Date(user.created_at).toLocaleString()}</dd></div>
                        <div className="grid grid-cols-3"><dt className="text-gray-500">Last Active</dt><dd className="col-span-2 text-gray-400">Implementation Pending</dd></div>
                    </dl>
                </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-white border rounded shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold">Recent Sessions</h3>
                    <Link href={`/admin/sessions?user_id=${id}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">View All Sessions</Link>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-2">Date</th>
                            <th className="px-4 py-2">Session ID</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Score</th>
                            <th className="px-4 py-2">Duration</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sessions?.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2">{new Date(s.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-2 font-mono text-xs text-gray-400">{s.id}</td>
                                <td className="px-4 py-2">
                                    <StatusBadge status={s.status} />
                                </td>
                                <td className="px-4 py-2 font-bold">{s.confidence_score ? s.confidence_score.toFixed(1) : '-'}</td>
                                <td className="px-4 py-2">{Math.floor(s.duration_seconds / 60)}m {s.duration_seconds % 60}s</td>
                            </tr>
                        ))}
                        {!sessions?.length && (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No sessions found</td></tr>
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
