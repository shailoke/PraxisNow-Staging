import { getAdminSupabase } from '@/lib/admin-server'
import { updateScenario } from '@/app/admin/actions'
import Link from 'next/link'

export default async function ScenariosPage() {
    const supabase = await getAdminSupabase()

    // Core Scenarios
    const { data: scenarios } = await supabase.from('scenarios').select('*').order('id')

    // Custom ones (Top 20 recent)
    const { data: customScenarios } = await supabase.from('custom_scenarios').select('*, users(email)').order('created_at', { ascending: false }).limit(20)

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Scenario Control</h2>
                {/* Maybe Add New button later */}
            </div>

            {/* Core */}
            <div className="bg-white border rounded shadow-sm">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold">Core Scenarios</h3>
                    <span className="text-xs text-gray-500 font-mono">Global Templates</span>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                        <tr>
                            <th className="px-4 py-2">ID</th>
                            <th className="px-4 py-2">Role</th>
                            <th className="px-4 py-2">Level</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {scenarios?.map(s => (
                            <tr key={s.id} className={s.is_active === false ? 'bg-gray-50 opacity-60' : ''}>
                                <td className="px-4 py-2 font-mono text-xs">{s.id}</td>
                                <td className="px-4 py-2 font-bold">{s.role}</td>
                                <td className="px-4 py-2">{s.level}</td>
                                <td className="px-4 py-2">
                                    <ToggleScenario id={s.id} active={s.is_active !== false} />
                                </td>
                                <td className="px-4 py-2">
                                    <Link href={`/admin/scenarios/${s.id}`} className="text-blue-600 hover:underline font-medium">Edit Prompt</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Custom */}
            <div className="bg-white border rounded shadow-sm">
                <div className="p-4 bg-gray-50 border-b">
                    <h3 className="font-bold">Recent Custom Scenarios (User Created)</h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                        <tr>
                            <th className="px-4 py-2">User</th>
                            <th className="px-4 py-2">Title</th>
                            <th className="px-4 py-2">Context Preview</th>
                            <th className="px-4 py-2">Created</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {customScenarios?.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-xs truncate max-w-[150px]" title={s.users?.email || s.user_id}>{s.users?.email || s.user_id}</td>
                                <td className="px-4 py-2 font-medium">{s.title}</td>
                                <td className="px-4 py-2 text-gray-500 truncate max-w-[200px]">{s.company_context || '-'}</td>
                                <td className="px-4 py-2 text-gray-500 text-xs">{new Date(s.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {!customScenarios?.length && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No custom scenarios yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function ToggleScenario({ id, active }: { id: number, active: boolean }) {
    return (
        <form action={async () => {
            'use server'
            await updateScenario(id, !active)
        }}>
            <button className={`text-xs px-2 py-1 rounded font-bold transition-colors ${active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}>
                {active ? 'ACTIVE' : 'DISABLED'}
            </button>
        </form>
    )
}
