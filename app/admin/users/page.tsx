import { getAdminSupabase } from '@/lib/admin-server'
import Link from 'next/link'

export default async function UsersPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>
}) {
    const { q: query } = await searchParams
    const supabase = await getAdminSupabase()

    let userQuery = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(20)

    if (query) {
        // Basic search simulation (Supabase doesn't support complex OR across col types easily without RPC, but text casting works in newer PG)
        // We'll search email for now
        userQuery = supabase.from('users').select('*').ilike('email', `%${query}%`).limit(50)
    }

    const { data: users } = await userQuery

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">User Management</h2>
                <form className="flex gap-2">
                    <input
                        name="q"
                        defaultValue={query}
                        placeholder="Search by email..."
                        className="border p-2 rounded w-64 text-sm"
                    />
                    <button className="bg-black text-white px-4 py-2 rounded text-sm hover:bg-gray-800">Search</button>
                </form>
            </div>

            <div className="bg-white border rounded shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Sessions (Avail/Used)</th>
                            <th className="px-6 py-3">Tier</th>
                            <th className="px-6 py-3">Created</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {users?.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{user.email}</div>
                                    <div className="text-xs text-gray-400 font-mono mt-1">{user.id}</div>
                                    {user.is_admin && <span className="inline-block bg-red-100 text-red-800 text-[10px] px-1 rounded mt-1">ADMIN</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-lg font-bold">{user.available_sessions}</span>
                                        <span className="text-gray-400">/</span>
                                        <span className="text-gray-500">{user.total_sessions_used}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${user.package_tier === 'Pro+' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            user.package_tier === 'Pro' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}>
                                        {user.package_tier}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <Link href={`/admin/users/${user.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                                        Manage
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No users found matching query.</div>
                )}
            </div>
        </div>
    )
}
