'use client'

import { getFlagEmoji, getTeamById } from '@/data/teams'
import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface GroupCardProps {
  groupLetter: string
  teamIds: number[]
  onReorder: (groupLetter: string, newOrder: number[]) => void
  disabled?: boolean
}

// Position 0-1: advance automatically (emerald)
// Position 2: possible 3rd-place qualifier (amber)
// Position 3: eliminated (rose/red)
const POSITION_CONFIG = [
  { badge: '🥇', bg: 'bg-emerald-500/15', border: 'border-emerald-400/25', text: 'text-emerald-200', label: 'עולה', labelColor: 'text-emerald-400/60' },
  { badge: '🥈', bg: 'bg-emerald-500/10', border: 'border-emerald-400/18', text: 'text-emerald-100/80', label: 'עולה', labelColor: 'text-emerald-400/50' },
  { badge: '🥉', bg: 'bg-amber-500/12',   border: 'border-amber-400/25',   text: 'text-amber-100/80',   label: '3rd?',  labelColor: 'text-amber-400/60' },
  { badge: '4️⃣', bg: 'bg-rose-500/8',    border: 'border-rose-400/18',    text: 'text-white/50',       label: 'יוצא',  labelColor: 'text-rose-400/50' },
]

export default function GroupCard({ groupLetter, teamIds, onReorder, disabled }: GroupCardProps) {
  function move(from: number, to: number) {
    const next = [...teamIds]
    ;[next[from], next[to]] = [next[to], next[from]]
    onReorder(groupLetter, next)
  }

  return (
    <GlassCard className="space-y-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <h3 className="font-bold text-sm text-white/80 uppercase tracking-wider">בית {groupLetter}</h3>
        {!disabled && <span className="text-[10px] text-white/25">▲▼ סדר</span>}
      </div>

      <div className="space-y-1">
        {teamIds.map((teamId, i) => {
          const team = getTeamById(teamId)
          if (!team) return null
          const cfg = POSITION_CONFIG[i]
          return (
            <div
              key={teamId}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all',
                cfg.bg, cfg.border
              )}
            >
              <span className="text-base w-5 text-center shrink-0 leading-none">{cfg.badge}</span>
              <span className="text-base shrink-0 leading-none">{getFlagEmoji(team.flag_code)}</span>
              <span className={cn('flex-1 text-xs font-semibold truncate', cfg.text)}>{team.name}</span>
              <span className={cn('text-[9px] font-bold shrink-0', cfg.labelColor)}>{cfg.label}</span>
              {!disabled && (
                <div className="flex flex-col gap-px shrink-0">
                  <button
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className={cn(
                      'w-7 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all',
                      i === 0 ? 'text-white/10 cursor-not-allowed' : 'text-white/40 hover:bg-white/15 hover:text-white active:scale-95'
                    )}
                  >▲</button>
                  <button
                    onClick={() => move(i, i + 1)}
                    disabled={i === teamIds.length - 1}
                    className={cn(
                      'w-7 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all',
                      i === teamIds.length - 1 ? 'text-white/10 cursor-not-allowed' : 'text-white/40 hover:bg-white/15 hover:text-white active:scale-95'
                    )}
                  >▼</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 pt-0.5 flex-wrap">
        <span className="flex items-center gap-1 text-[9px] text-emerald-400/50"><span className="w-2 h-2 rounded-sm bg-emerald-500/40 shrink-0" />עולה</span>
        <span className="flex items-center gap-1 text-[9px] text-amber-400/50"><span className="w-2 h-2 rounded-sm bg-amber-500/40 shrink-0" />אולי עולה</span>
        <span className="flex items-center gap-1 text-[9px] text-rose-400/50"><span className="w-2 h-2 rounded-sm bg-rose-500/30 shrink-0" />יוצא</span>
      </div>
    </GlassCard>
  )
}
