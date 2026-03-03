import { Button } from '@/components/ui/button'
import { Play, Star, Clock } from 'lucide-react'

// Define this type locally for now or import from db types
type Scenario = {
    id: string
    role: string
    level: string
    title: string
    description: string
}

export default function ScenarioCard({ scenario, disabled = false, duration = '30 mins' }: { scenario: Scenario & { dimensions?: string[] }, disabled?: boolean, duration?: string }) {
    return (
        <div className={`group glass-panel rounded-xl p-6 transition-all duration-300 flex flex-col h-full w-full ${disabled ? 'opacity-75 cursor-not-allowed border-red-500/20' : 'hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]'}`}>

            {/* 
                CRITICAL LAYOUT FIX: Badge and Title Spacing
                ---------------------------------------------
                Using normal document flow (flex column) to prevent overlap.
                The role badge and title are stacked vertically with proper spacing.
                This ensures the title's left edge is NEVER clipped or covered.
                
                WHY: Previously, layout issues caused titles like "Leadership & Stakeholder Management"
                     to render as "ership & Stakeholder Management" due to left-side clipping.
                     
                FIX: Vertical stacking in normal flow guarantees full title visibility.
            */}
            <div className="flex flex-col gap-3 mb-4">
                {/* Role Badge */}
                <div className="flex justify-start">
                    <div className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {scenario.role}
                    </div>
                </div>

                {/* Title - Full width, no clipping */}
                <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                    {scenario.title}
                </h3>
            </div>

            {/* Description */}
            <p className="text-gray-400 text-sm mb-4 flex-grow line-clamp-3">{scenario.description}</p>

            {/* Dimensions Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
                {scenario.dimensions?.slice(0, 3).map((dim, i) => (
                    <span key={i} className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded bg-white/[0.03] text-gray-500 border border-white/5">
                        {dim}
                    </span>
                ))}
                {(scenario.dimensions?.length || 0) > 3 && (
                    <span className="text-[10px] px-1 py-1 text-gray-600">+{((scenario.dimensions?.length || 0) - 3)}</span>
                )}
            </div>

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
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
                    disabled={disabled}
                    className={`${disabled ? 'opacity-50' : 'group-hover:bg-purple-600 group-hover:border-purple-500'} transition-colors text-xs h-8`}
                >
                    {disabled ? (
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
