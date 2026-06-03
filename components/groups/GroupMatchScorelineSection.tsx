'use client'

import { useState, useRef } from 'react'
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

// Derive 1X2 from current score inputs
function deriveOutcome(home: string, away: string): '1' | 'X' | '2' | null {
  const h = parseInt(home), a = parseInt(away)
  if (isNaN(h) || isNaN(a)) return null
  if (h > a) return '1'
  if (a > h) return '2'
  return 'X'
}

// Default scores for each outcome (used when clicking 1/X/2 buttons)
const OUTCOME_DEFAULTS: Record<'1' | 'X' | '2', { home: string; away: string }> = {
  '1': { home: '1', away: '0' },
  'X': { home: '1', away: '1' },
  '2': { home: '0', away: '1' },
}

const OUTCOME_STYLES: Record<'1' | 'X' | '2', string> = {
  '1': 'bg-blue-500/30 text-blue-200 border-blue-400/50',
  'X': 'bg-amber-500/30 text-amber-200 border-amber-400/50',
  '2': 'bg-rose-500/30 text-rose-200 border-rose-400/50',
}

const ALL_INPUT_KEYS: string[] = GROUP_LETTERS.flatMap(g =>
  (GROUP_MATCHES_BY_GROUP[g] ?? []).flatMap(m => [`${m.match}-home`, `${m.match}-away`])
)

export default function GroupMatchScorelineSection({
  scores, onScoreChange, disabled,
}: GroupMatchScorelineSectionProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['A']))
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const focusNext = (currentKey: string) => {
    const idx = ALL_INPUT_KEYS.indexOf(currentKey)
    const nextKey = ALL_INPUT_KEYS[idx + 1]
    if (!nextKey) return
    const nextMatchId = parseInt(nextKey.split('-')[0])
    for (const g of GROUP_LETTERS) {
      if ((GROUP_MATCHES_BY_GROUP[g] ?? []).some(m => m.match === nextMatchId)) {
        setOpenGroups(prev => new Set([...prev, g]))
        break
      }
    }
    setTimeout(() => {
      const el = inputRefs.current.get(nextKey)
      el?.focus(); el?.select()
    }, 50)
  }

  const handleOutcomeClick = (matchId: number, outcome: '1' | 'X' | '2', current: '1' | 'X' | '2' | null) => {
    if (current === outcome) {
      // toggle off — clear the score
      onScoreChange(matchId, 'home', '')
      onScoreChange(matchId, 'away', '')
    } else {
      const defaults = OUTCOME_DEFAULTS[outcome]
      onScoreChange(matchId, 'home', defaults.home)
      onScoreChange(matchId, 'away', defaults.away)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">Part 1 — Group Match Predictions</h2>
        <p className="text-sm text-white/50 mt-0.5">
          Click <strong className="text-blue-300">1</strong> (home win),{' '}
          <strong className="text-amber-300">X</strong> (draw), or{' '}
          <strong className="text-rose-300">2</strong> (away win) — then enter the exact score for bonus points.
        </p>
      </div>

      <div className="space-y-2">
        {GROUP_LETTERS.map((g) => {
          const matches = GROUP_MATCHES_BY_GROUP[g] ?? []
          const filledCount = matches.filter(m => {
            const s = scores[m.match]
            return s?.home !== '' && s?.away !== ''
          }).length
          const isOpen = openGroups.has(g)

          return (
            <GlassCard key={g} className="p-0 overflow-hidden">
              <button
                onClick={() => setOpenGroups(prev => {
                  const next = new Set(prev)
                  next.has(g) ? next.delete(g) : next.add(g)
                  return next
                })}
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

              {isOpen && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                  {matches.map((match) => {
                    const homeTeam = getTeamById(getTeamIdByName(match.home) ?? 0)
                    const awayTeam = getTeamById(getTeamIdByName(match.away) ?? 0)
                    const s = scores[match.match]
                    const outcome = deriveOutcome(s?.home ?? '', s?.away ?? '')

                    return (
                      <div key={match.match} className="flex items-center gap-2 px-4 py-3">
                        {/* Date */}
                        <span className="text-[10px] text-white/25 w-14 shrink-0 font-mono">
                          {new Date(match.kickoff_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>

                        {/* Home team */}
                        <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                          <span className="text-sm font-medium text-white truncate">{match.home}</span>
                          {homeTeam && <span className="text-base shrink-0">{getFlagEmoji(homeTeam.flag_code)}</span>}
                        </div>

                        {/* 1/X/2 buttons — click again to deselect */}
                        {(['1','X','2'] as const).map(o => (
                          <button
                            key={o}
                            onClick={() => !disabled && handleOutcomeClick(match.match, o, outcome)}
                            disabled={disabled}
                            className={cn(
                              'w-11 h-10 rounded-lg border text-sm font-bold transition-all shrink-0',
                              outcome === o
                                ? OUTCOME_STYLES[o]
                                : 'border-white/15 text-white/30 hover:text-white/70 hover:border-white/30'
                            )}
                          >
                            {o}
                          </button>
                        ))}

                        {/* Score inputs + clear */}
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            ref={el => { if (el) inputRefs.current.set(`${match.match}-home`, el) }}
                            type="number" min="0" max="20"
                            value={s?.home ?? ''}
                            onChange={e => {
                              onScoreChange(match.match, 'home', e.target.value)
                              if (/^\d$/.test(e.target.value)) focusNext(`${match.match}-home`)
                            }}
                            disabled={disabled}
                            placeholder="–"
                            className="glass-input w-12 text-center py-1.5 px-1 text-sm font-mono"
                          />
                          <span className="text-white/30 text-sm font-bold">:</span>
                          <input
                            ref={el => { if (el) inputRefs.current.set(`${match.match}-away`, el) }}
                            type="number" min="0" max="20"
                            value={s?.away ?? ''}
                            onChange={e => {
                              onScoreChange(match.match, 'away', e.target.value)
                              if (/^\d$/.test(e.target.value)) focusNext(`${match.match}-away`)
                            }}
                            disabled={disabled}
                            placeholder="–"
                            className="glass-input w-12 text-center py-1.5 px-1 text-sm font-mono"
                          />
                        </div>

                        {/* Clear score */}
                        {(s?.home || s?.away) && !disabled && (
                          <button
                            onClick={() => { onScoreChange(match.match, 'home', ''); onScoreChange(match.match, 'away', '') }}
                            className="text-white/20 hover:text-red-400 text-xs transition-colors shrink-0"
                            title="Clear score"
                          >✕</button>
                        )}

                        {/* Away team */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {awayTeam && <span className="text-base shrink-0">{getFlagEmoji(awayTeam.flag_code)}</span>}
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
