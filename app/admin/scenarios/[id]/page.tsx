import { getAdminSupabase } from '@/lib/admin-server'
import { updateScenario } from '@/app/admin/actions'
import Link from 'next/link'

export default async function ScenarioEditPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const scenarioId = parseInt(id)
    const supabase = await getAdminSupabase()

    const { data: scenario, error } = await supabase.from('scenarios').select('*').eq('id', scenarioId).single()

    if (error || !scenario) return <div className="p-8 text-red-500">Scenario not found</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/scenarios" className="text-gray-500 hover:text-black hover:underline text-sm">← Back to Scenarios</Link>
                <div className="flex-1"></div>
            </div>

            <h2 className="text-2xl font-bold flex items-center gap-2">
                {scenario.role} <span className="text-gray-400">/</span> {scenario.level}
                <span className={`text-xs ml-4 px-2 py-1 rounded ${scenario.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {scenario.is_active !== false ? 'ACTIVE' : 'DISABLED'}
                </span>
            </h2>

            <div className="bg-white p-6 border rounded shadow-sm">
                <h3 className="font-bold border-b pb-2 mb-4">Edit Scenario Prompt</h3>

                <div className="bg-amber-50 border border-amber-200 p-4 mb-4 text-sm text-amber-800 rounded">
                    <strong>Warning:</strong> This prompt describes the interview topic and context to the AI.
                    Changes apply immediately to all NEW sessions.
                </div>

                <form action={async (formData) => {
                    'use server'
                    const newPrompt = formData.get('prompt') as string
                    await updateScenario(scenarioId, scenario.is_active !== false, newPrompt)
                }} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">Scenario Description</label>
                        <textarea
                            name="prompt"
                            defaultValue={scenario.prompt}
                            className="w-full border border-gray-300 p-3 rounded h-64 font-mono text-sm focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button className="bg-black text-white px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 border rounded shadow-sm">
                <h3 className="font-bold border-b pb-2 mb-4">Evaluation Dimensions</h3>
                <div className="grid grid-cols-2 gap-3">
                    {scenario.evaluation_dimensions?.map((dim, i) => (
                        <div key={i} className="bg-gray-50 px-3 py-2 border rounded text-sm font-medium text-gray-700">{dim}</div>
                    ))}
                </div>
                <div className="text-xs text-gray-400 mt-4 italic">To edit dimensions, please use direct database access or contact engineering.</div>
            </div>
        </div>
    )
}
