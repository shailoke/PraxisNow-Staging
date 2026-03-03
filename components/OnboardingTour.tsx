'use client'

import React, { useState, useEffect } from 'react'
import { X, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TourStep {
    targetId?: string
    title: string
    description: string
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
    tierRequirement?: string
}

interface OnboardingTourProps {
    isOpen: boolean
    onComplete: () => void
    onSkip: () => void
    userTier?: string | null
}

const RAW_STEPS: TourStep[] = [
    {
        title: "Welcome to PraxisNow!",
        description: "Your personal AI interview coach. Let's get you started with a quick tour.",
        position: 'center'
    },
    {
        targetId: 'tour-start-session',
        title: "Start Your Free Session",
        description: "You have a free session waiting! Click here to jump straight into an interview.",
        position: 'bottom',
        tierRequirement: 'Free'
    },
    {
        targetId: 'tour-scenarios',
        title: "Choose Your Path",
        description: "Pick from our curated scenarios for various roles like PM, SDE, and more.",
        position: 'top'
    },
    {
        targetId: 'tour-custom-builder',
        title: "Build Your Own",
        description: "Want something specific? Create a custom scenario tailored to your exact needs.",
        position: 'top'
    },
    {
        title: "Simulation Experience",
        description: "In the interview, simply speak into your microphone. The AI will respond live. When you're done, click 'End Session' to get instant, detailed feedback.",
        position: 'center'
    }
]

export function OnboardingTour({ isOpen, onComplete, onSkip, userTier }: OnboardingTourProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [style, setStyle] = useState<React.CSSProperties>({})
    const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({})
    const [placement, setPlacement] = useState<'top' | 'bottom' | 'center'>('center')

    // Filter steps based on tier
    // We filter RAW_STEPS everytime isOpen changes or tier changes
    const steps = React.useMemo(() => {
        return RAW_STEPS.filter(step => {
            if (step.tierRequirement && step.tierRequirement !== userTier) return false
            return true
        })
    }, [userTier])

    // Reset to 0 when opening
    useEffect(() => {
        if (isOpen) setCurrentStepIndex(0)
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onSkip()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onSkip])

    useEffect(() => {
        if (!isOpen) return
        if (!steps[currentStepIndex]) return // Safety

        const step = steps[currentStepIndex]

        if (step.targetId) {
            const el = document.getElementById(step.targetId)
            if (el) {
                const rect = el.getBoundingClientRect()
                const padding = 16 // increased padding for arrow space
                const popoverHeight = 220
                const popoverWidth = 320

                let top = 0
                let left = 0
                let newPlacement = step.position || 'bottom'

                // Calculate Position clearly
                if (newPlacement === 'top') {
                    // Try to place ABOVE
                    top = rect.top - popoverHeight - padding + 20
                    // If runs off top, flip strictly to bottom
                    if (top < 10) {
                        newPlacement = 'bottom'
                        top = rect.bottom + padding
                    }
                } else {
                    // Place BELOW
                    top = rect.bottom + padding
                }

                // Center Horizontally
                left = rect.left + (rect.width / 2) - (popoverWidth / 2)

                // Horizontal Clamping
                if (left < 10) left = 10
                if (left + popoverWidth > window.innerWidth) left = window.innerWidth - popoverWidth - 10

                setPlacement(newPlacement as any)
                setStyle({ top, left, position: 'fixed' })

                // Arrow Calculation
                // The arrow should point to the center of the target (rect.left + rect.width/2)
                // The popup is at 'left'. 
                // So arrow relative to popup is: (TargetCenter - PopupLeft)
                const targetCenter = rect.left + (rect.width / 2)
                let arrowLeft = targetCenter - left
                // Clamp arrow to be within the popup rounded corners
                if (arrowLeft < 20) arrowLeft = 20
                if (arrowLeft > popoverWidth - 20) arrowLeft = popoverWidth - 20

                setArrowStyle({ left: arrowLeft })

                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            } else {
                // Fallback
                setPlacement('center')
                setStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' })
            }
        } else {
            // Center
            setPlacement('center')
            setStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', position: 'fixed' })
        }
    }, [currentStepIndex, isOpen, steps])

    if (!isOpen) return null
    if (!steps[currentStepIndex]) return null // Safety

    const step = steps[currentStepIndex]
    const isLast = currentStepIndex === steps.length - 1

    const handleNext = () => {
        if (isLast) {
            onComplete()
        } else {
            setCurrentStepIndex(prev => prev + 1)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-start pointer-events-none">
            {/* Dark Overlay - Reduced Blur/Opacity per user request */}
            <div className="absolute inset-0 bg-black/40 pointer-events-auto transition-opacity duration-500" />

            {/* Popover Card */}
            <div
                className="pointer-events-auto bg-[#1a1a24] border border-purple-500/30 rounded-xl p-6 shadow-2xl shadow-purple-900/40 w-[320px] transition-all duration-300 animate-in fade-in zoom-in-95 relative"
                style={style}
            >
                {/* Visual Arrow */}
                {placement !== 'center' && (
                    <div
                        className={`absolute w-4 h-4 bg-[#1a1a24] border-l border-t border-purple-500/30 transform rotate-45 ${placement === 'top'
                            ? 'bottom-[-9px] border-l-0 border-t-0 border-b border-r' // pointing down
                            : 'top-[-9px] border-b-0 border-r-0' // pointing up
                            }`}
                        style={arrowStyle}
                    />
                )}

                <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-purple-400 tracking-wider">
                        STEP {currentStepIndex + 1}/{steps.length}
                    </span>
                    <button onClick={onSkip} className="text-gray-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-300 mb-6 leading-relaxed">
                    {step.description}
                </p>

                <div className="flex justify-between items-center">
                    <button
                        onClick={onSkip}
                        className="text-sm text-gray-500 hover:text-gray-300 underline underline-offset-4"
                    >
                        Skip Tour
                    </button>
                    <Button
                        onClick={handleNext}
                        className="bg-purple-600 hover:bg-purple-500 text-white rounded-full px-6"
                    >
                        {isLast ? (
                            <span className="flex items-center gap-2">Finish <Check className="w-4 h-4" /></span>
                        ) : (
                            <span className="flex items-center gap-2">Next <ArrowRight className="w-4 h-4" /></span>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
