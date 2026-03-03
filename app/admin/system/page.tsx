import { getAdminSupabase } from '@/lib/admin-server'
import { toggleSystemSetting } from '@/app/admin/actions'

export default async function SystemHealthPage() {
    const supabase = await getAdminSupabase()

    // Fetch settings
    const { data: settings } = await supabase.from('system_settings').select('*')
    // Safe reduce
    const settingsMap: any = {}
    settings?.forEach(s => {
        settingsMap[s.key] = s.value
    })

    // Fetch recent errors
    // Note: system_errors table must exist. If not, this might fail silently or error out.
    // We wrap in try catch or assume migration runs.
    let errors: any[] = []
    try {
        const { data } = await supabase.from('system_errors' as any).select('*').order('created_at', { ascending: false }).limit(20)
        errors = data || []
    } catch (e) {
        // Table probably doesn't exist yet
    }

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold">System Health & Controls</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Feature Flags */}
                <div className="bg-white p-6 border rounded shadow-sm">
                    <h3 className="font-bold border-b pb-2 mb-4">Feature Toggles (Kill Switches)</h3>
                    <div className="space-y-6">
                        <ToggleSwitch label="Maintenance Mode" settingKey="maintenance_mode" currentValue={settingsMap['maintenance_mode'] === true} allowToggle={true} />
                        <ToggleSwitch label="Enable Interview Simulations" settingKey="enable_interviews" currentValue={settingsMap['enable_interviews'] !== false} allowToggle={true} />
                        <ToggleSwitch label="Enable PDF Generation" settingKey="enable_pdf" currentValue={settingsMap['enable_pdf'] !== false} allowToggle={true} />
                        <ToggleSwitch label="Enable Salary Negotiation" settingKey="enable_negotiation" currentValue={settingsMap['enable_negotiation'] !== false} allowToggle={true} />
                        <ToggleSwitch label="Global Session Throttling" settingKey="throttle_sessions" currentValue={settingsMap['throttle_sessions'] === true} allowToggle={true} />
                        <ToggleSwitch label="Use Backup LLM (GPT-3.5)" settingKey="use_backup_model" currentValue={settingsMap['use_backup_model'] === true} allowToggle={true} />
                    </div>
                </div>

                {/* Error Log */}
                <div className="bg-white p-6 border rounded shadow-sm">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h3 className="font-bold">Recent System Errors</h3>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {errors.map(err => (
                            <div key={err.id} className="p-3 bg-red-50 border border-red-100 rounded text-sm">
                                <div className="flex justify-between font-bold text-red-800">
                                    <span>{err.category}</span>
                                    <span className="text-xs text-red-600">{new Date(err.created_at).toLocaleTimeString()}</span>
                                </div>
                                <div className="mt-1 text-red-700">{err.message}</div>
                                {err.session_id && <div className="mt-1 text-xs text-red-500 font-mono">Session: {err.session_id}</div>}
                            </div>
                        ))}
                        {!errors.length && <div className="text-gray-500 text-center py-4">No recent errors logged.</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ToggleSwitch({ label, settingKey, currentValue }: { label: string, settingKey: string, currentValue: boolean, allowToggle: boolean }) {
    // Using hidden input form approach compatible with Server Actions
    return (
        <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">{label}</span>
            <form action={async () => {
                'use server'
                await toggleSystemSetting(settingKey, !currentValue)
            }}>
                <button className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 duration-200 ${currentValue ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </button>
            </form>
        </div>
    )
}
