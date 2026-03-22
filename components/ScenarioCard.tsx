import { Button } from '@/components/ui/button'
import { Play, Star, Clock, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Define this type locally for now or import from db types
type Scenario = {
    id: string
    role: string
    level: string
    title: string
    description: string
}

export default function ScenarioCard({ scenario, disabled = false, locked = false, duration = '45 mins', onClick }: { scenario: Scenario & { dimensions?: string[] }, disabled?: boolean, locked?: boolean, duration?: string, onClick?: () => void }) {
    const router = useRouter()

    const handleClick = (e: React.MouseEvent) => {
        if (locked) {
            e.preventDefault()
            e.stopPropagation()
            router.push('/pricing')
            return
        }
        if (disabled) {
            e.preventDefault()
            e.stopPropagation()
            router.push('/pricing')
            return
        }
        if (onClick) onClick()
    }

    return (
        <div
            onClick={handleClick}
            className={`relative group glass-panel rounded-xl p-6 transition-all duration-300 flex flex-col h-full w-full ${disabled && !locked ? 'opacity-75 cursor-not-allowed border-red-500/20' : locked ? 'cursor-pointer hover:border-purple-500/30' : 'cursor-pointer hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]'}`}
        >
            {locked && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[3px] rounded-xl border border-white/10 transition-colors group-hover:bg-black/50">
                    <div className="bg-purple-600/80 rounded-full p-3 mb-2 shadow-lg backdrop-blur-md border border-purple-400/30">
                        <Lock className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-semibold text-white tracking-wide">Unlock with a plan</span>
                </div>
            )}

            <div className={`flex flex-col gap-3 mb-4 ${locked ? 'opacity-40' : ''}`}>
                <div className="flex justify-start">
                    <div className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {scenario.role}
                    </div>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    {scenario.title}
                </h3>
            </div>

            <p className={`text-gray-400 text-sm mb-4 flex-grow line-clamp-3 ${locked ? 'opacity-40' : ''}`}>{scenario.description}</p>

            <div className={`flex flex-wrap gap-2 mb-4 ${locked ? 'opacity-40' : ''}`}>
                {scenario.dimensions?.slice(0, 3).map((dim, i) => (
                    <span key={i} className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded bg-white/[0.03] text-gray-500 border border-white/5">
                        {dim}
                    </span>
                ))}
                {(scenario.dimensions?.length || 0) > 3 && (
                    <span className="text-[10px] px-1 py-1 text-gray-600">+{((scenario.dimensions?.length || 0) - 3)}</span>
                )}
            </div>

            <div className={`mt-auto flex items-center justify-between pt-4 border-t border-white/5 ${locked ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {duration}
                    </div>
                    {scenario.level && (
                        <div className="text-[10px] opacity-40">
                            {scenario.level} calibration
                        </div>
                    )}
                </div>
                <Button
                    variant="glass"
                    disabled={disabled && !locked}
                    className={`${disabled && !locked ? 'opacity-50' : 'group-hover:bg-purple-600 group-hover:border-purple-500'} transition-colors text-xs h-8`}
                >
                    {locked ? (
                        <>
                            <Lock className="w-3 h-3 mr-2" />
                            Locked
                        </>
                    ) : disabled ? (
                        <>Out of Sessions</>
                    ) : (
                        <>
                            <Play className="w-3 h-3 mr-2" />
                            Practice
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
