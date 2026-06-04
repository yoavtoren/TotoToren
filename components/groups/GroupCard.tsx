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

const POSITION_BADGES = ['🥇', '🥈', '🥉', '4️⃣']

export default function GroupCard({ groupLetter, teamIds, onReorder, disabled }: GroupCardProps) {
  function move(from: number, to: number) {
    const next = [...teamIds]
    ;[next[from], next[to]] = [next[to], next[from]]
    onReorder(groupLetter, next)
  }

  return (
    <GlassCard className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-sm text-white/80 uppercase tracking-wider">בית {groupLetter}</h3>
        {!disabled && <span className="text-[10px] text-white/30">▲▼ לשינוי סדר</span>}
      </div>

      <div className="space-y-1.5">
        {teamIds.map((teamId, i) => {
          const team = getTeamById(teamId)
          if (!team) return null
          return (
            <div key={teamId} className="flex items-center gap-2 px-3 py-2.5 rounded-xl glass">
              <span className="text-lg w-6 text-center shrink-0">{POSITION_BADGES[i]}</span>
              <span className="text-lg shrink-0">{getFlagEmoji(team.flag_code)}</span>
              <span className="flex-1 text-sm font-medium text-white truncate">{team.name}</span>
              {!disabled && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className={cn(
                      'w-8 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all',
                      i === 0
                        ? 'text-white/10 cursor-not-allowed'
                        : 'text-white/50 hover:bg-white/15 hover:text-white active:scale-95'
                    )}
                  >▲</button>
                  <button
                    onClick={() => move(i, i + 1)}
                    disabled={i === teamIds.length - 1}
                    className={cn(
                      'w-8 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all',
                      i === teamIds.length - 1
                        ? 'text-white/10 cursor-not-allowed'
                        : 'text-white/50 hover:bg-white/15 hover:text-white active:scale-95'
                    )}
                  >▼</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
