'use client'

import type { CompletionStats } from '@/types'
import { cn } from '@/lib/utils'

const PARTS = [
  { key: 'groupMatches',   label: 'תוצאות', color: 'bg-blue-400' },
  { key: 'groupStandings', label: 'בתים',   color: 'bg-violet-400' },
  { key: 'thirdPlace',     label: 'שלישיים', color: 'bg-amber-400' },
  { key: 'knockout',       label: 'נוקאאוט', color: 'bg-emerald-400' },
  { key: 'futures',        label: 'עתידיות', color: 'bg-rose-400' },
] as const

interface BetProgressProps {
  stats: CompletionStats
}

export default function BetProgress({ stats }: BetProgressProps) {
  const pct = stats.overallPct

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/80">התקדמות הניחושים</span>
        <span className={cn('text-sm font-bold', pct === 100 ? 'text-emerald-400' : 'text-white/60')}>
          {pct === 100 ? '✓ הושלם!' : `${pct}%`}
        </span>
      </div>

      {/* Overall bar — dir=ltr so it fills left→right regardless of page direction */}
      <div dir="ltr" className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', pct === 100 ? 'bg-emerald-400' : 'bg-indigo-400')}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Per-part breakdown */}
      <div dir="ltr" className="grid grid-cols-5 gap-2">
        {PARTS.map(({ key, label, color }) => {
          const stat = stats[key]
          const partPct = stat.total > 0 ? Math.round((stat.filled / stat.total) * 100) : 0
          return (
            <div key={key} className="text-center space-y-1">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', color)}
                  style={{ width: `${partPct}%` }}
                />
              </div>
              <p className="text-[10px] text-white/40 leading-tight">{label}</p>
              <p className="text-[10px] text-white/60 font-mono">{stat.filled}/{stat.total}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
