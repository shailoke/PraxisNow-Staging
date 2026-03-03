'use client'

import { Search, Filter, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'

export interface FilterState {
    role: string
    dimension: string
    search: string
}

interface DashboardFiltersProps {
    onFilterChange: (filters: FilterState) => void
    roles: string[]
    dimensions: string[]
}

export default function DashboardFilters({ onFilterChange, roles, dimensions }: DashboardFiltersProps) {
    const [filters, setFilters] = useState<FilterState>({
        role: '',
        dimension: '',
        search: ''
    })

    const handleChange = (key: keyof FilterState, value: string) => {
        const newFilters = { ...filters, [key]: value }
        setFilters(newFilters)
        onFilterChange(newFilters)
    }

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onFilterChange(filters)
        }, 300)
        return () => clearTimeout(timer)
    }, [filters.search])

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm mb-8">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">

                {/* Role Filter */}
                <div className="relative group">
                    <select
                        className="appearance-none bg-black/40 border border-white/10 text-white rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors cursor-pointer hover:bg-black/60"
                        value={filters.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                    >
                        <option value="">Role: All</option>
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Dimension Filter - NOW PRIMARY */}
                <div className="relative group">
                    <select
                        className="appearance-none bg-black/40 border border-purple-500/20 text-white rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors cursor-pointer hover:bg-black/60"
                        value={filters.dimension}
                        onChange={(e) => handleChange('dimension', e.target.value)}
                    >
                        <option value="">Dimension: All</option>
                        {dimensions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Level filter REMOVED - dimension-first model */}
            </div>

            {/* Scale Search to fill remaining space */}
            <div className="relative flex-grow w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search scenarios..."
                    className="w-full bg-black/40 border border-white/10 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                    value={filters.search}
                    onChange={(e) => handleChange('search', e.target.value)}
                />
            </div>
        </div>
    )
}
