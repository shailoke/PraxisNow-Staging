'use client'

interface ProgressDataPoint {
    session: number
    date: string
    clarity: number | null
    structure: number | null
    signal: number | null
    isReplay: boolean
}

export default function ProgressGraph({ data }: { data: ProgressDataPoint[] }) {
    if (!data.length) return null

    const width = 280
    const height = 200
    const padding = { top: 20, right: 10, bottom: 30, left: 35 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // Y-axis: 0-10 scale
    const yMax = 10
    const yMin = 0

    // X-axis: session index
    const xMin = 0
    const xMax = data.length - 1

    const getX = (index: number) => padding.left + (index / Math.max(xMax, 1)) * chartWidth
    const getY = (value: number | null) => {
        if (value === null) return null
        return padding.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight
    }

    // Create path data for each metric
    const createPath = (metric: 'clarity' | 'structure' | 'signal') => {
        const points = data
            .map((d, i) => {
                const y = getY(d[metric])
                return y !== null ? `${getX(i)},${y}` : null
            })
            .filter(p => p !== null)

        if (points.length === 0) return ''
        return `M ${points.join(' L ')}`
    }

    const clarityPath = createPath('clarity')
    const structurePath = createPath('structure')
    const signalPath = createPath('signal')

    // Y-axis ticks
    const yTicks = [0, 2.5, 5, 7.5, 10]

    return (
        <div className="w-full">
            <svg width={width} height={height} className="overflow-visible">
                {/* Grid lines */}
                {yTicks.map(tick => {
                    const y = getY(tick)
                    return y !== null ? (
                        <line
                            key={tick}
                            x1={padding.left}
                            y1={y}
                            x2={padding.left + chartWidth}
                            y2={y}
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="1"
                        />
                    ) : null
                })}

                {/* Y-axis labels */}
                {yTicks.map(tick => {
                    const y = getY(tick)
                    return y !== null ? (
                        <text
                            key={tick}
                            x={padding.left - 8}
                            y={y + 4}
                            textAnchor="end"
                            className="text-[10px] fill-gray-500"
                        >
                            {tick}
                        </text>
                    ) : null
                })}

                {/* Signal line (purple) */}
                {signalPath && (
                    <path
                        d={signalPath}
                        fill="none"
                        stroke="rgba(168, 85, 247, 0.6)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {/* Structure line (green) */}
                {structurePath && (
                    <path
                        d={structurePath}
                        fill="none"
                        stroke="rgba(34, 197, 94, 0.6)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {/* Clarity line (blue) */}
                {clarityPath && (
                    <path
                        d={clarityPath}
                        fill="none"
                        stroke="rgba(59, 130, 246, 0.6)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {/* Data points */}
                {data.map((d, i) => {
                    const x = getX(i)
                    const points = []

                    if (d.clarity !== null) {
                        const y = getY(d.clarity)
                        if (y !== null) {
                            points.push(
                                <circle
                                    key={`clarity-${i}`}
                                    cx={x}
                                    cy={y}
                                    r="3"
                                    fill="rgba(59, 130, 246, 0.8)"
                                    className="hover:r-4 transition-all"
                                />
                            )
                        }
                    }

                    if (d.structure !== null) {
                        const y = getY(d.structure)
                        if (y !== null) {
                            points.push(
                                <circle
                                    key={`structure-${i}`}
                                    cx={x}
                                    cy={y}
                                    r="3"
                                    fill="rgba(34, 197, 94, 0.8)"
                                    className="hover:r-4 transition-all"
                                />
                            )
                        }
                    }

                    if (d.signal !== null) {
                        const y = getY(d.signal)
                        if (y !== null) {
                            points.push(
                                <circle
                                    key={`signal-${i}`}
                                    cx={x}
                                    cy={y}
                                    r="3"
                                    fill="rgba(168, 85, 247, 0.8)"
                                    className="hover:r-4 transition-all"
                                />
                            )
                        }
                    }

                    // Replay marker
                    if (d.isReplay) {
                        points.push(
                            <circle
                                key={`replay-${i}`}
                                cx={x}
                                cy={padding.top + chartHeight + 15}
                                r="2"
                                fill="rgba(234, 179, 8, 0.6)"
                            />
                        )
                    }

                    return points
                })}

                {/* X-axis labels (session dates) - show every other for readability */}
                {data.map((d, i) => {
                    if (data.length > 5 && i % 2 !== 0) return null // Skip every other if too many
                    const x = getX(i)
                    return (
                        <text
                            key={`label-${i}`}
                            x={x}
                            y={padding.top + chartHeight + 20}
                            textAnchor="middle"
                            className="text-[9px] fill-gray-500"
                        >
                            {d.date}
                        </text>
                    )
                })}
            </svg>

            {/* Legend */}
            <div className="flex gap-4 justify-center mt-4 text-[10px]">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-blue-500/60 rounded"></div>
                    <span className="text-gray-400">Clarity</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-green-500/60 rounded"></div>
                    <span className="text-gray-400">Structure</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-purple-500/60 rounded"></div>
                    <span className="text-gray-400">Signal</span>
                </div>
            </div>
        </div>
    )
}
