'use client'

import { useState } from 'react'
import { GROUP_LETTERS } from '@/lib/constants'
import { GROUP_MATCHES_BY_GROUP } from '@/data/match-schedule'
import { getTeamIdByName, getFlagEmoji, getTeamById } from '@/data/teams'
import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import type { GroupMatchScores } from '@/types'

interface GroupMatchScorelineSectionProps {
  scores: GroupMatchScores
  onScoreChange: (matchId: number, side: 'home' | 'away', value: string) => void
  disabled?: boolean
}

function outcomeLabel(home: string, away: string): string {
  const h = parseInt(home)
  const a = parseInt(away)
  if (isNaN(h) || isNaN(a)) return ''
  if (h > a) return '1'
  if (a > h) return '2'
  return 'X'
}

const OUTCOME_COLOR: Record<string, string> = {
  '1': 'text-blue-300',
  'X': 'text-amber-300',
  '2': 'text-rose-300',
}

export default function GroupMatchScorelineSection({
  scores, onScoreChange, disabled,
}: GroupMatchScorelineSectionProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['A']))

  const toggleGroup = (g: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">Part 1 — Group Match Scorelines</h2>
        <p className="text-sm text-white/50 mt-0.5">
          Predict the score of all 72 group matches. The 1X2 outcome is derived from your scores.
        </p>
      </div>

      <div className="space-y-2">
        {GROUP_LETTERS.map((g) => {
          const matches = GROUP_MATCHES_BY_GROUP[g] ?? []
          const filledCount = matches.filter(
            (m) => scores[m.match]?.home !== '' && scores[m.match]?.away !== ''
          ).length
          const isOpen = openGroups.has(g)

          return (
            <GlassCard key={g} className="p-0 overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(g)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-white/80">Group {g}</span>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-mono',
                    filledCount === 6 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40'
                  )}>
                    {filledCount}/6
                  </span>
                </div>
                <span className="text-white/30 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>

              {/* Match rows */}
              {isOpen && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {matches.map((match) => {
                    const homeId = getTeamIdByName(match.home)
                    const awayId = getTeamIdByName(match.away)
                    const homeTeam = homeId ? getTeamById(homeId) : null
                    const awayTeam = awayId ? getTeamById(awayId) : null
                    const s = scores[match.match]
                    const label = outcomeLabel(s?.home ?? '', s?.away ?? '')

                    return (
                      <div key={match.match} className="flex items-center gap-3 px-4 py-2.5">
                        {/* Date */}
                        <span className="text-[10px] text-white/30 w-20 shrink-0 font-mono">
                          {new Date(match.kickoff_utc).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short',
                          })}
                        </span>

                        {/* Home */}
                        <div className="flex items-center gap-1.5 flex-1 justify-end">
                          <span className="text-sm font-medium text-white truncate">{match.home}</span>
                          {homeTeam && <span className="text-base">{getFlagEmoji(homeTeam.flag_code)}</span>}
                        </div>

                        {/* Score inputs */}
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number" min="0" max="20"
                            value={s?.home ?? ''}
                            onChange={(e) => onScoreChange(match.match, 'home', e.target.value)}
                            disabled={disabled}
                            placeholder="–"
                            className="glass-input w-10 text-center py-1 text-sm"
                          />
                          <span className="text-white/30 text-xs font-bold">:</span>
                          <input
                            type="number" min="0" max="20"
                            value={s?.away ?? ''}
                            onChange={(e) => onScoreChange(match.match, 'away', e.target.value)}
                            disabled={disabled}
                            placeholder="–"
                            className="glass-input w-10 text-center py-1 text-sm"
                          />
                        </div>

                        {/* 1X2 label */}
                        <span className={cn('text-xs font-bold w-4 text-center shrink-0', OUTCOME_COLOR[label] ?? 'text-transparent')}>
                          {label}
                        </span>

                        {/* Away */}
                        <div className="flex items-center gap-1.5 flex-1">
                          {awayTeam && <span className="text-base">{getFlagEmoji(awayTeam.flag_code)}</span>}
                          <span className="text-sm font-medium text-white truncate">{match.away}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </GlassCard>
          )
        })}
      </div>
    </section>
  )
}
