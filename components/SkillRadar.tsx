'use client'

interface SkillData {
    subject: string
    A: number
    fullMark: number
}

// Mock data based on the prompt
const mockData: SkillData[] = [
    { subject: 'Architecture', A: 7.2, fullMark: 10 },
    { subject: 'Scale', A: 6.8, fullMark: 10 },
    { subject: 'Leadership', A: 8.1, fullMark: 10 },
    { subject: 'Metrics', A: 7.5, fullMark: 10 },
    { subject: 'Strategy', A: 6.5, fullMark: 10 },
]

export default function SkillRadar({ data = mockData }: { data?: SkillData[] }) {
    // Replacement: Horizontal Bar Chart for better readability and no truncation issues
    return (
        <div className="w-full h-[250px] flex flex-col justify-center px-2 space-y-5">
            {data.map((skill, i) => (
                <div key={i} className="group">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm text-gray-400 font-medium group-hover:text-gray-300 transition-colors">
                            {skill.subject}
                        </span>
                        <span className="text-sm font-bold text-purple-400">
                            {skill.A}
                        </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-purple-500/40 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min((skill.A / skill.fullMark) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}
