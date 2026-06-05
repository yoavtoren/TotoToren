'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFlagEmoji, getTeamById } from '@/data/teams'
import { GROUP_MATCHES, GROUP_MATCHES_BY_GROUP } from '@/data/match-schedule'
import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { GROUP_LETTERS, TOURNAMENT_START } from '@/lib/constants'

interface FuturePred {
  user_id: string
  champion_team_id: number | null
  top_scorer_team_id: number | null
  golden_boot_team_id: number | null
  most_conceded_team_id: number | null
  total_goals_prediction: number | null
}

// ── Types ─────────────────────────────────────────────────────

interface ScoreEntry {
  user_id: string
  total_score: number
  group_match_points: number
  group_standing_points: number
  advancement_points: number
  knockout_score_points: number
  futures_points: number
  last_calculated_at: string
  profiles: { display_name: string; avatar_url: string | null }
}

interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
}

interface UserPreds {
  groupMatches: Record<number, { predicted_home: number; predicted_away: number }>
  groupStandings: Record<string, number[]>
  thirdPlace: number[]  // team IDs user selected as 3rd-place R32 qualifiers
  knockout: Array<{ match_num: number; predicted_winner_id: number; predicted_home_score: number | null; predicted_away_score: number | null }>
  futures: { champion_team_id: number | null; top_scorer_team_id: number | null; golden_boot_team_id: number | null; most_conceded_team_id: number | null; total_goals_prediction: number | null } | null
}

// ── Helpers ───────────────────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉']
const MATCH_DURATION_MS = 110 * 60 * 1000

function getInProgressMatches() {
  const now = Date.now()
  return GROUP_MATCHES.filter(m => {
    const t = new Date(m.kickoff_utc).getTime()
    return t <= now && now <= t + MATCH_DURATION_MS
  })
}

function getNextGroupMatch() {
  const now = Date.now()
  return GROUP_MATCHES
    .filter(m => new Date(m.kickoff_utc).getTime() > now)
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())[0] ?? null
}

function outcomeOf(h: number, a: number) {
  if (h > a) return <span className="text-blue-300 font-bold text-xs">1</span>
  if (a > h) return <span className="text-rose-300 font-bold text-xs">2</span>
  return <span className="text-amber-300 font-bold text-xs">X</span>
}

function localShortDt(utc: string) {
  return new Date(utc).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

// ── Stats helpers ─────────────────────────────────────────────

// Change to false to show stats only after the first game kicks off
const STATS_ALWAYS_VISIBLE = true

function computeTop5Teams(
  futures: FuturePred[],
  key: 'champion_team_id' | 'top_scorer_team_id' | 'golden_boot_team_id' | 'most_conceded_team_id'
): { top5: Array<{ teamId: number; count: number }>; otherCount: number; total: number } {
  const counts: Record<number, number> = {}
  let total = 0
  for (const f of futures) {
    const val = f[key]
    if (val != null) {
      counts[val] = (counts[val] ?? 0) + 1
      total++
    }
  }
  const sorted = Object.entries(counts)
    .map(([id, count]) => ({ teamId: Number(id), count }))
    .sort((a, b) => b.count - a.count)
  return {
    top5: sorted.slice(0, 5),
    otherCount: sorted.slice(5).reduce((s, r) => s + r.count, 0),
    total,
  }
}

// ── Sub-components ────────────────────────────────────────────

function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url} alt={name}
        className={cn('rounded-full object-cover shrink-0', dim)}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  return (
    <div className={cn(
      'rounded-full glass flex items-center justify-center font-bold text-white/70 shrink-0',
      dim
    )}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ── Helpers for breakdown counts ──────────────────────────────
// Each entry is { outcome: bool, total: bool, exact: bool, pts: number }
// (Legacy number-only format also supported for backwards compat)

function matchCounts(breakdown: any) {
  const vals = Object.values((breakdown as any)?.group_matches ?? {})
  let outcome = 0, goals = 0, exact = 0
  for (const v of vals) {
    if (typeof v === 'object' && v !== null) {
      // New format: explicit flags
      if ((v as any).outcome) outcome++
      if ((v as any).total)   goals++
      if ((v as any).exact)   exact++
    } else {
      // Legacy number format
      const n = v as number
      if (n === 1 || n === 3 || n === 4 || n === 6) outcome++
      if (n === 2 || n === 3 || n === 5 || n === 6) goals++
      if (n === 3 || n === 4 || n === 5 || n === 6) exact++
    }
  }
  return { outcome, goals, exact }
}

// ── User Predictions Modal ────────────────────────────────────

function UserPredictionsModal({
  profile,
  entry,
  preds,
  loading,
  onClose,
  completedMatchIds = new Set(),
  realR32TeamIds = new Set(),
  realR16TeamIds = new Set(),
  realQFTeamIds = new Set(),
  realSFTeamIds = new Set(),
  realFinalTeamIds = new Set(),
  realGroupStandings = {},
  koMatchResults = {},
}: {
  profile: Profile | null
  entry: ScoreEntry | null
  preds: UserPreds | null
  loading: boolean
  onClose: () => void
  completedMatchIds?: Set<number>
  realR32TeamIds?: Set<number>
  realR16TeamIds?: Set<number>
  realQFTeamIds?: Set<number>
  realSFTeamIds?: Set<number>
  realFinalTeamIds?: Set<number>
  koMatchResults?: Record<number, { home: number; away: number }>
  realGroupStandings?: Record<string, number[]>
}) {
  const [modalTab, setModalTab] = useState<'predictions' | 'scoring'>('predictions')
  const [r32Open, setR32Open] = useState(false)
  const [r16Open, setR16Open] = useState(false)
  const [qfOpen,  setQfOpen]  = useState(false)
  const [sfOpen,  setSfOpen]  = useState(false)
  const [finOpen, setFinOpen] = useState(false)
  const tournamentStarted = Date.now() >= new Date(TOURNAMENT_START).getTime()

  const nextMatchId = useMemo(() => {
    const now = Date.now()
    return GROUP_MATCHES
      .filter(m => new Date(m.kickoff_utc).getTime() > now)
      .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())[0]?.match ?? null
  }, [])

  const breakdown: Record<string, number> = (entry as any)?.breakdown?.group_matches ?? {}

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-xl flex flex-col glass rounded-2xl overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
          <Avatar name={profile?.display_name ?? '?'} url={profile?.avatar_url} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-base truncate">{profile?.display_name ?? '…'}</p>
            {entry && (
              <p className="text-xs text-white/40">{entry.total_score} נקודות</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/80 text-xl leading-none p-1 transition-colors"
          >✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 pb-2 shrink-0">
          <button
            onClick={() => setModalTab('predictions')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              modalTab === 'predictions' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
            )}
          >ניחושים</button>
          <button
            onClick={() => setModalTab('scoring')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              modalTab === 'scoring' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
            )}
          >ניקוד משחקים קודמים</button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {loading && (
            <div className="space-y-2 animate-pulse pt-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 glass rounded-xl" />)}
            </div>
          )}

          {!loading && preds && modalTab === 'predictions' && (
            <div className="space-y-6">
              {/* Group Matches */}
              <div className="space-y-4">
                {GROUP_LETTERS.map(g => {
                  const matches = GROUP_MATCHES_BY_GROUP[g] ?? []
                  return (
                    <div key={g}>
                      <p className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">בית {g}</p>
                      <div className="space-y-1">
                        {matches.map(m => {
                          const pred = preds.groupMatches[m.match]
                          const isNext = m.match === nextMatchId
                          const kicked = new Date(m.kickoff_utc).getTime() < Date.now()
                          return (
                            <div
                              key={m.match}
                              className={cn(
                                'flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-all',
                                isNext
                                  ? 'ring-1 ring-emerald-400/60 bg-emerald-500/15'
                                  : 'glass'
                              )}
                            >
                              <span className="text-white/30 w-14 font-mono shrink-0" dir="ltr">{localShortDt(m.kickoff_utc)}</span>
                              <span className="flex-1 text-white/80 truncate">{m.home}</span>
                              {pred && kicked ? (
                                <span className="font-mono font-bold text-white shrink-0 tabular-nums" dir="ltr">
                                  {pred.predicted_home}:{pred.predicted_away}
                                  <span className="mr-1">{outcomeOf(pred.predicted_home, pred.predicted_away)}</span>
                                </span>
                              ) : (
                                <span className="text-white/20 shrink-0 font-mono text-[11px]">
                                  {isNext ? '🔜' : '🔒'}
                                </span>
                              )}
                              <span className="flex-1 text-white/80 truncate text-left">{m.away}</span>
                              {isNext && (
                                <span className="text-emerald-400 text-[9px] font-bold shrink-0 bg-emerald-500/20 rounded px-1 py-0.5 whitespace-nowrap">
                                  הבא ▶
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Group Standings with scoring */}
              <div>
                <p className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">ניחושי דירוג ליגות</p>
                <div className="grid grid-cols-2 gap-2">
                  {GROUP_LETTERS.map(g => {
                    const order = preds.groupStandings[g]
                    const realOrder = realGroupStandings[g]
                    const revealed = new Date(GROUP_MATCHES_BY_GROUP[g]?.[0]?.kickoff_utc ?? 0).getTime() < Date.now()
                    const groupPts = realOrder ? order?.reduce((sum, teamId, idx) =>
                      sum + (realOrder[idx] === teamId ? 3 : 0), 0) ?? 0 : null
                    return (
                      <div key={g} className={cn('glass rounded-xl px-3 py-2', groupPts != null && groupPts > 0 && 'ring-1 ring-purple-400/30')}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] text-white/30 font-mono">Group {g}</p>
                          {groupPts != null && (
                            <span className={cn('text-[10px] font-bold', groupPts > 0 ? 'text-purple-300' : 'text-white/20')}>
                              {groupPts > 0 ? `+${groupPts}` : '—'}
                            </span>
                          )}
                        </div>
                        {!order || order.length === 0 ? (
                          <p className="text-xs text-white/20 italic">—</p>
                        ) : (
                          <div className="space-y-0.5">
                            {order.map((teamId, idx) => {
                              const team = getTeamById(teamId)
                              const correct = realOrder ? realOrder[idx] === teamId : null
                              return (
                                <div key={teamId} className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-white/30 w-4 shrink-0">{idx + 1}.</span>
                                  {revealed && team ? (
                                    <>
                                      <span className="text-sm">{getFlagEmoji(team.flag_code)}</span>
                                      <span className={cn('text-xs truncate flex-1', correct === true ? 'text-purple-200' : correct === false ? 'text-white/40' : 'text-white')}>{team.name}</span>
                                      {correct === true && <span className="text-[9px] text-purple-400 shrink-0">✓</span>}
                                    </>
                                  ) : (
                                    <span className="text-xs text-white/20">🔒</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Knockout predictions sorted newest first */}
              {preds.knockout.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">ניחושי נוקאאוט</p>
                  <div className="space-y-1">
                    {[...preds.knockout]
                      .sort((a, b) => b.match_num - a.match_num)
                      .map(k => {
                        const team = getTeamById(k.predicted_winner_id)
                        const inR16 = realR16TeamIds.size > 0 ? realR16TeamIds.has(k.predicted_winner_id) : null
                        const R32_IDS_LOCAL = new Set([73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88])
                        const isR32Match = R32_IDS_LOCAL.has(k.match_num)
                        const correct = isR32Match ? inR16 : null
                        return (
                          <div key={k.match_num} className={cn(
                            'flex items-center gap-2 text-xs px-3 py-2 rounded-xl glass',
                            correct === true && 'ring-1 ring-emerald-400/30'
                          )}>
                            <span className="text-white/25 font-mono w-8 shrink-0">M{k.match_num}</span>
                            {team ? (
                              <>
                                <span className="text-sm">{getFlagEmoji(team.flag_code)}</span>
                                <span className={cn('flex-1 truncate', correct === true ? 'text-emerald-200' : correct === false ? 'text-white/40' : 'text-white/80')}>
                                  {team.name} מנצחת
                                </span>
                              </>
                            ) : <span className="flex-1 text-white/20">—</span>}
                            {(k.predicted_home_score != null && k.predicted_away_score != null) && (
                              <span className="font-mono text-white/50 shrink-0" dir="ltr">{k.predicted_home_score}:{k.predicted_away_score}</span>
                            )}
                            {correct === true && <span className="text-emerald-400 text-[10px] font-bold shrink-0">✓ +5</span>}
                            {correct === false && <span className="text-rose-400/60 text-[10px] shrink-0">✗</span>}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Futures */}
              {preds.futures && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase font-mono mb-2 tracking-wider">פיוצ&apos;רס</p>
                  <div className="space-y-1">
                    {(Object.entries(FUTURES_LABELS) as [string, string][]).map(([key, label]) => {
                      const teamId = (preds.futures as any)?.[key]
                      const team = teamId ? getTeamById(teamId) : null
                      return (
                        <div key={key} className="flex items-center gap-2 text-xs glass rounded-xl px-3 py-2">
                          <span className="text-white/40 w-36 shrink-0">{label}</span>
                          {team ? (
                            <>
                              <span>{getFlagEmoji(team.flag_code)}</span>
                              <span className="text-white">{team.name}</span>
                            </>
                          ) : (
                            <span className="text-white/25">—</span>
                          )}
                        </div>
                      )
                    })}
                    {preds.futures.total_goals_prediction != null && (
                      <div className="flex items-center gap-2 text-xs glass rounded-xl px-3 py-2">
                        <span className="text-white/40 w-36 shrink-0">Total Goals</span>
                        <span className="text-white font-mono">{preds.futures.total_goals_prediction}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && preds && modalTab === 'scoring' && (
            <div className="space-y-5 pt-1">

              {/* ── Score summary by category ────────────── */}
              {entry && (
                <div className="glass rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">סיכום ניקוד לפי קטגוריה</p>
                  {[
                    { label: 'משחקי שלב בתים', sub: '1X2 · שערים · תוצאה מדויקת', pts: entry.group_match_points, color: 'text-blue-300' },
                    { label: 'דירוגי בתים', sub: `${Math.round(entry.group_standing_points / 3)} מיקומים נכונים`, pts: entry.group_standing_points, color: 'text-purple-300' },
                    { label: 'התקדמות קבוצות', sub: 'לפי שלב (R32/R16/QF/SF/גמר)', pts: entry.advancement_points, color: 'text-teal-300' },
                    { label: 'תוצאות נוקאאוט', sub: 'שערים ותוצאה מדויקת בנוקאאוט', pts: entry.knockout_score_points, color: 'text-emerald-300' },
                    { label: 'ניחושי עתידיות', sub: 'אלוף, כובש, ושאר', pts: entry.futures_points, color: 'text-amber-300' },
                  ].map(({ label, sub, pts, color }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm text-white/70">{label}</span>
                        <span className="text-[10px] text-white/30 mr-1.5">{sub}</span>
                      </div>
                      <span className={cn('text-sm font-bold tabular-nums shrink-0', pts > 0 ? color : 'text-white/20')}>
                        {pts > 0 ? `+${pts}` : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-white/10 mt-2 pt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-white">סה״כ</span>
                    <span className="text-sm font-extrabold text-white tabular-nums">+{entry.total_score}</span>
                  </div>
                </div>
              )}

              {/* ── R32 advancement breakdown — per group ───── */}
              {realR32TeamIds.size > 0 && preds && (() => {
                // Show per-group: which of the user's predicted top-2 actually reached R32
                const groups = GROUP_LETTERS.filter(g => preds.groupStandings[g]?.length >= 2 && realGroupStandings[g]?.length >= 2)
                if (groups.length === 0) return null
                let correctCount = 0
                const groupRows = groups.map(g => {
                  const predTop2 = [preds.groupStandings[g][0], preds.groupStandings[g][1]]
                  const row = predTop2.map(id => {
                    const inR32 = realR32TeamIds.has(id)
                    if (inR32) correctCount++
                    return { id, inR32 }
                  })
                  return { g, row }
                })
                // Third-place picks
                const thirdRows = (preds.thirdPlace ?? []).map(id => ({ id, inR32: realR32TeamIds.has(id) }))
                thirdRows.forEach(r => { if (r.inR32) correctCount++ })

                return (
                  <div className="glass rounded-xl overflow-hidden">
                    <button
                      onClick={() => setR32Open(o => !o)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70">פירוט התקדמות לסבב 32</span>
                        <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-mono">
                          {correctCount} נכון
                        </span>
                      </div>
                      <span className="text-white/30 text-xs">{r32Open ? '▲' : '▼'}</span>
                    </button>
                    {r32Open && (
                      <div className="px-3 pb-3 border-t border-white/10 pt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          {groupRows.map(({ g, row }) => (
                            <div key={g} className="glass rounded-lg px-2 py-1.5">
                              <p className="text-[9px] text-white/30 font-mono mb-1">בית {g}</p>
                              {row.map(({ id, inR32 }) => {
                                const t = getTeamById(id)
                                return t ? (
                                  <div key={id} className={cn('flex items-center gap-1 text-[10px]', inR32 ? 'text-emerald-200' : 'text-rose-300/60')}>
                                    <span className="text-[9px]">{inR32 ? '✓' : '✗'}</span>
                                    <span>{getFlagEmoji(t.flag_code)}</span>
                                    <span className="truncate">{t.name}</span>
                                  </div>
                                ) : null
                              })}
                            </div>
                          ))}
                        </div>
                        {thirdRows.length > 0 && (
                          <div>
                            <p className="text-[9px] text-white/30 mb-1">מקום שלישי:</p>
                            <div className="flex flex-wrap gap-1">
                              {thirdRows.map(({ id, inR32 }) => {
                                const t = getTeamById(id)
                                return t ? (
                                  <div key={id} className={cn('flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 border',
                                    inR32 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' : 'bg-rose-500/10 border-rose-500/15 text-rose-300/60')}>
                                    <span className="text-[9px]">{inR32 ? '✓' : '✗'}</span>
                                    <span>{getFlagEmoji(t.flag_code)}</span>
                                    <span>{t.name}</span>
                                  </div>
                                ) : null
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── R16 advancement breakdown ─────────────── */}
              {realR16TeamIds.size > 0 && preds && (() => {
                // R32 match IDs: 73-88
                const R32_IDS = new Set([73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88])
                const predToR16 = preds.knockout
                  .filter(k => R32_IDS.has(k.match_num) && k.predicted_winner_id)
                  .map(k => k.predicted_winner_id)
                const correct = predToR16.filter(id => realR16TeamIds.has(id))
                const wrong   = predToR16.filter(id => !realR16TeamIds.has(id))
                const pts = correct.length * 5
                return (
                  <div className="glass rounded-xl overflow-hidden">
                    <button
                      onClick={() => setR16Open(o => !o)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70">פירוט התקדמות לסבב 16</span>
                        <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-mono">
                          {correct.length}/{predToR16.length} נכון · +{pts} נק׳
                        </span>
                      </div>
                      <span className="text-white/30 text-xs">{r16Open ? '▲' : '▼'}</span>
                    </button>
                    {r16Open && (
                      <div className="px-3 pb-3 space-y-1 border-t border-white/10 pt-2">
                        <p className="text-[10px] text-white/30 mb-1.5">ניחושי מנצחי שלב 32 (מי עלה לסבב 16):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {correct.map(id => {
                            const t = getTeamById(id)
                            return t ? (
                              <div key={id} className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2 py-1 text-[11px]">
                                <span>{getFlagEmoji(t.flag_code)}</span>
                                <span className="text-emerald-200 font-medium">{t.name}</span>
                                <span className="text-emerald-400 font-bold">✓ +5</span>
                              </div>
                            ) : null
                          })}
                          {wrong.map(id => {
                            const t = getTeamById(id)
                            return t ? (
                              <div key={id} className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-1 text-[11px]">
                                <span>{getFlagEmoji(t.flag_code)}</span>
                                <span className="text-rose-300/70">{t.name}</span>
                                <span className="text-rose-400/70">✗</span>
                              </div>
                            ) : null
                          })}
                          {predToR16.length === 0 && (
                            <p className="text-[11px] text-white/30 italic">לא הוגשו ניחושים לסבב הנוקאאוט</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── QF advancement breakdown ─────────────── */}
              {realQFTeamIds.size > 0 && preds && (() => {
                const R16_IDS = new Set([89,90,91,92,93,94,95,96])
                const predToQF = preds.knockout
                  .filter(k => R16_IDS.has(k.match_num) && k.predicted_winner_id)
                  .map(k => k.predicted_winner_id)
                const correct = predToQF.filter(id => realQFTeamIds.has(id))
                const wrong   = predToQF.filter(id => !realQFTeamIds.has(id))
                const pts = correct.length * 6
                return (
                  <div className="glass rounded-xl overflow-hidden">
                    <button onClick={() => setQfOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70">פירוט התקדמות לרבע גמר</span>
                        <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-mono">
                          {correct.length}/{predToQF.length} נכון · +{pts} נק׳
                        </span>
                      </div>
                      <span className="text-white/30 text-xs">{qfOpen ? '▲' : '▼'}</span>
                    </button>
                    {qfOpen && (
                      <div className="px-3 pb-3 border-t border-white/10 pt-2">
                        <p className="text-[10px] text-white/30 mb-1.5">ניחושי מנצחי שמינית גמר (מי עלה לרבע):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {correct.map(id => { const t = getTeamById(id); return t ? <div key={id} className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2 py-1 text-[11px]"><span>{getFlagEmoji(t.flag_code)}</span><span className="text-emerald-200 font-medium">{t.name}</span><span className="text-emerald-400 font-bold">✓ +6</span></div> : null })}
                          {wrong.map(id => { const t = getTeamById(id); return t ? <div key={id} className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-1 text-[11px]"><span>{getFlagEmoji(t.flag_code)}</span><span className="text-rose-300/70">{t.name}</span><span className="text-rose-400/70">✗</span></div> : null })}
                          {predToQF.length === 0 && <p className="text-[11px] text-white/30 italic">לא הוגשו ניחושים</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── SF advancement breakdown ──────────────── */}
              {realSFTeamIds.size > 0 && preds && (() => {
                const QF_IDS = new Set([97,98,99,100])
                const predToSF = preds.knockout
                  .filter(k => QF_IDS.has(k.match_num) && k.predicted_winner_id)
                  .map(k => k.predicted_winner_id)
                const correct = predToSF.filter(id => realSFTeamIds.has(id))
                const wrong   = predToSF.filter(id => !realSFTeamIds.has(id))
                const pts = correct.length * 7
                return (
                  <div className="glass rounded-xl overflow-hidden">
                    <button onClick={() => setSfOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70">פירוט התקדמות לחצי גמר</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                          {correct.length}/{predToSF.length} נכון · +{pts} נק׳
                        </span>
                      </div>
                      <span className="text-white/30 text-xs">{sfOpen ? '▲' : '▼'}</span>
                    </button>
                    {sfOpen && (
                      <div className="px-3 pb-3 border-t border-white/10 pt-2">
                        <p className="text-[10px] text-white/30 mb-1.5">ניחושי מנצחי רבע גמר (מי עלה לחצי):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {correct.map(id => { const t = getTeamById(id); return t ? <div key={id} className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2 py-1 text-[11px]"><span>{getFlagEmoji(t.flag_code)}</span><span className="text-emerald-200 font-medium">{t.name}</span><span className="text-emerald-400 font-bold">✓ +7</span></div> : null })}
                          {wrong.map(id => { const t = getTeamById(id); return t ? <div key={id} className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-1 text-[11px]"><span>{getFlagEmoji(t.flag_code)}</span><span className="text-rose-300/70">{t.name}</span><span className="text-rose-400/70">✗</span></div> : null })}
                          {predToSF.length === 0 && <p className="text-[11px] text-white/30 italic">לא הוגשו ניחושים</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── Final advancement breakdown ───────────── */}
              {realFinalTeamIds.size > 0 && preds && (() => {
                const SF_IDS = new Set([101,102])
                const predToFinal = preds.knockout
                  .filter(k => SF_IDS.has(k.match_num) && k.predicted_winner_id)
                  .map(k => k.predicted_winner_id)
                const correct = predToFinal.filter(id => realFinalTeamIds.has(id))
                const wrong   = predToFinal.filter(id => !realFinalTeamIds.has(id))
                const pts = correct.length * 8
                return (
                  <div className="glass rounded-xl overflow-hidden">
                    <button onClick={() => setFinOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white/70">פירוט התקדמות לגמר</span>
                        <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-mono">
                          {correct.length}/{predToFinal.length} נכון · +{pts} נק׳
                        </span>
                      </div>
                      <span className="text-white/30 text-xs">{finOpen ? '▲' : '▼'}</span>
                    </button>
                    {finOpen && (
                      <div className="px-3 pb-3 border-t border-white/10 pt-2">
                        <p className="text-[10px] text-white/30 mb-1.5">ניחושי מנצחי חצי גמר (מי הגיע לגמר):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {correct.map(id => { const t = getTeamById(id); return t ? <div key={id} className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg px-2 py-1 text-[11px]"><span>{getFlagEmoji(t.flag_code)}</span><span className="text-emerald-200 font-medium">{t.name}</span><span className="text-emerald-400 font-bold">✓ +8</span></div> : null })}
                          {wrong.map(id => { const t = getTeamById(id); return t ? <div key={id} className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2 py-1 text-[11px]"><span>{getFlagEmoji(t.flag_code)}</span><span className="text-rose-300/70">{t.name}</span><span className="text-rose-400/70">✗</span></div> : null })}
                          {predToFinal.length === 0 && <p className="text-[11px] text-white/30 italic">לא הוגשו ניחושים</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ── Group standings predictions ───────────── */}
              {Object.keys(preds.groupStandings).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">דירוגי הבתים שניחשת</p>
                  <div className="grid grid-cols-2 gap-2">
                    {GROUP_LETTERS.filter(g => preds.groupStandings[g]?.length).map(g => (
                      <div key={g} className="glass rounded-xl p-2.5 space-y-1">
                        <p className="text-[10px] font-bold text-white/50 uppercase">בית {g}</p>
                        {preds.groupStandings[g].map((teamId, i) => {
                          const team = getTeamById(teamId)
                          return (
                            <div key={teamId} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white/30 w-3 shrink-0">{i + 1}.</span>
                              {team && <span className="text-xs shrink-0">{getFlagEmoji(team.flag_code)}</span>}
                              <span className="text-[11px] text-white/60 truncate">{team?.name ?? '—'}</span>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Knockout predictions ──────────────────── */}
              {preds.knockout.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">ניחושי נוקאאוט</p>
                  {(() => {
                    const KO_R32 = new Set([73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88])
                    const KO_R16 = new Set([89,90,91,92,93,94,95,96])
                    const KO_QF  = new Set([97,98,99,100])
                    const KO_SF  = new Set([101,102])
                    return [...preds.knockout]
                      .sort((a, b) => b.match_num - a.match_num)  // M104 first, M73 last
                      .map(k => {
                        const winner = getTeamById(k.predicted_winner_id)
                        // Advancement points: did predicted winner reach next round?
                        const advPts =
                          KO_R32.has(k.match_num) && realR16TeamIds.has(k.predicted_winner_id) ? 5 :
                          KO_R16.has(k.match_num) && realQFTeamIds.has(k.predicted_winner_id) ? 6 :
                          KO_QF.has(k.match_num)  && realSFTeamIds.has(k.predicted_winner_id) ? 7 :
                          KO_SF.has(k.match_num)  && realFinalTeamIds.has(k.predicted_winner_id) ? 8 :
                          null
                        const isWrong =
                          (KO_R32.has(k.match_num) && realR16TeamIds.size > 0 && !realR16TeamIds.has(k.predicted_winner_id)) ||
                          (KO_R16.has(k.match_num) && realQFTeamIds.size > 0  && !realQFTeamIds.has(k.predicted_winner_id)) ||
                          (KO_QF.has(k.match_num)  && realSFTeamIds.size > 0  && !realSFTeamIds.has(k.predicted_winner_id)) ||
                          (KO_SF.has(k.match_num)  && realFinalTeamIds.size > 0 && !realFinalTeamIds.has(k.predicted_winner_id))

                        // Scoreline points: total goals (+2) and exact score (+3)
                        const real = koMatchResults[k.match_num]
                        let scorePts = 0
                        if (real && k.predicted_home_score != null && k.predicted_away_score != null) {
                          if (k.predicted_home_score + k.predicted_away_score === real.home + real.away) scorePts += 2
                          if (k.predicted_home_score === real.home && k.predicted_away_score === real.away) scorePts += 3
                        }
                        const totalPts = (advPts ?? 0) + scorePts

                      const rowBg = advPts != null ? 'bg-emerald-500/10 border-emerald-500/20' :
                                    isWrong ? 'bg-rose-500/8 border-rose-500/15' : 'bg-white/5 border-white/8'
                      return (
                        <div key={k.match_num} className={cn('flex items-center gap-2 text-xs px-3 py-2 rounded-xl border', rowBg)}>
                          <span className="text-white/30 font-mono w-10 shrink-0">M{k.match_num}</span>
                          {winner && <span className="text-sm shrink-0">{getFlagEmoji(winner.flag_code)}</span>}
                          <span className={cn('flex-1 truncate', advPts != null ? 'text-emerald-200' : isWrong ? 'text-white/35' : 'text-white/65')}>
                            {winner?.name ?? '—'} מנצחת
                          </span>
                          {k.predicted_home_score != null && k.predicted_away_score != null && (
                            <span className="font-mono text-white/45 shrink-0 tabular-nums" dir="ltr">
                              {k.predicted_home_score}:{k.predicted_away_score}
                            </span>
                          )}
                          <div className="flex items-center gap-1 shrink-0">
                            {advPts != null && (
                              <span className="text-indigo-300 font-bold text-[11px]" title="קידום">+{advPts}</span>
                            )}
                            {scorePts > 0 && (
                              <span className="text-emerald-300 font-bold text-[11px]" title="תוצאה">+{scorePts}</span>
                            )}
                            {totalPts > 0 && (
                              <span className="text-white/50 text-[10px]">={totalPts}</span>
                            )}
                            {totalPts === 0 && isWrong && (
                              <span className="text-rose-400/60 text-[10px]">✗</span>
                            )}
                            {totalPts === 0 && !isWrong && (
                              <span className="text-white/20 text-[10px]">—</span>
                            )}
                          </div>
                        </div>
                        )
                      })
                  })()}
                </div>
              )}

              <p className="text-xs text-white/30">ניקוד משחקי שלב הבתים:</p>
              {(() => {
                // Show matches where admin entered a result OR match already kicked off by date
                const played = (matchId: number) =>
                  completedMatchIds.has(matchId) || new Date(
                    [...Object.values(GROUP_MATCHES_BY_GROUP)].flat().find(m => m.match === matchId)?.kickoff_utc ?? 0
                  ).getTime() < Date.now()
                const hasPast = GROUP_LETTERS.some(g =>
                  (GROUP_MATCHES_BY_GROUP[g] ?? []).some(m => played(m.match))
                )
                if (!hasPast) return (
                  <p className="text-xs text-white/30 italic text-center py-6">המשחקים עוד לא התחילו</p>
                )
                const allPast = GROUP_LETTERS
                  .flatMap(g => (GROUP_MATCHES_BY_GROUP[g] ?? []).filter(m => played(m.match)))
                  .sort((a, b) => new Date(b.kickoff_utc).getTime() - new Date(a.kickoff_utc).getTime())
                return [(
                  <div key="all" className="space-y-1">
                    {allPast.map(m => {
                          const pred = preds.groupMatches[m.match]
                          const raw = breakdown[String(m.match)] ?? (breakdown as any)[m.match] ?? null
                          const pts: number | null = raw == null ? null
                            : typeof raw === 'object' ? (raw as any).pts
                            : raw
                          const rowBg =
                            pts === 6 ? 'bg-emerald-500/20 border-emerald-500/30' :
                            pts === 5 ? 'bg-emerald-500/15 border-emerald-500/20' :
                            pts === 4 ? 'bg-teal-500/15 border-teal-500/20' :
                            pts === 3 ? 'bg-blue-500/15 border-blue-500/20' :
                            pts === 2 ? 'bg-amber-500/15 border-amber-500/20' :
                            pts === 1 ? 'bg-amber-500/10 border-amber-500/15' :
                            pts === 0 ? 'bg-rose-500/10 border-rose-500/20' :
                            'bg-white/5 border-white/10'
                          const ptsColor =
                            pts != null && pts >= 4 ? 'text-emerald-300 font-extrabold' :
                            pts === 3 ? 'text-teal-300 font-bold' :
                            pts === 2 ? 'text-amber-300 font-bold' :
                            pts === 1 ? 'text-amber-400/80 font-bold' :
                            pts === 0 ? 'text-rose-400/70' :
                            'text-white/20'
                          return (
                            <div key={m.match} className={cn('flex items-center gap-2 text-xs px-3 py-2 rounded-xl border', rowBg)}>
                              <span className="text-white/30 w-14 font-mono shrink-0" dir="ltr">{localShortDt(m.kickoff_utc)}</span>
                              <span className="text-white/70 flex-1 truncate">{m.home} – {m.away}</span>
                              {pred ? (
                                <span className="font-mono text-white/50 shrink-0 tabular-nums" dir="ltr">
                                  {pred.predicted_home ?? '—'}:{pred.predicted_away ?? '—'}
                                </span>
                              ) : (
                                <span className="text-white/20 shrink-0">—</span>
                              )}
                              <span className={cn('tabular-nums shrink-0 w-8 text-left text-sm', ptsColor)}>
                                {pts != null ? `+${pts}` : '—'}
                              </span>
                            </div>
                          )
                    })}
                  </div>
                )]
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-component: Futures distribution bar card ──────────────

const DIST_COLORS = [
  { bar: 'bg-blue-400',    text: 'text-blue-300' },
  { bar: 'bg-emerald-400', text: 'text-emerald-300' },
  { bar: 'bg-amber-400',   text: 'text-amber-300' },
  { bar: 'bg-rose-400',    text: 'text-rose-300' },
  { bar: 'bg-violet-400',  text: 'text-violet-300' },
]

function FuturesDistCard({
  label,
  emoji,
  result,
}: {
  label: string
  emoji: string
  result: { top5: Array<{ teamId: number; count: number }>; otherCount: number; total: number }
}) {
  const { top5, otherCount, total } = result
  if (total === 0) return (
    <GlassCard className="space-y-2 py-3">
      <p className="text-xs font-bold text-white/60">{emoji} {label}</p>
      <p className="text-xs text-white/25 italic">אין ניחושים</p>
    </GlassCard>
  )

  const segments = [
    ...top5.map((item, i) => ({ ...item, color: DIST_COLORS[i % DIST_COLORS.length], isOther: false })),
    ...(otherCount > 0 ? [{ teamId: -1, count: otherCount, color: { bar: 'bg-white/25', text: 'text-white/40' }, isOther: true }] : []),
  ]

  return (
    <GlassCard className="space-y-2.5">
      <p className="text-xs font-bold text-white/70 uppercase tracking-wider">{emoji} {label}</p>

      {/* Single stacked bar — each team gets a colored segment */}
      <div className="h-3 rounded-full overflow-hidden flex">
        {segments.map(({ teamId, count, color }) => (
          <div
            key={teamId}
            className={cn('h-full', color.bar)}
            style={{ width: `${count / total * 100}%`, minWidth: count > 0 ? 2 : 0 }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-1">
        {segments.map(({ teamId, count, color, isOther }) => {
          const team = isOther ? null : getTeamById(teamId)
          const pct = Math.round(count / total * 100)
          return (
            <div key={teamId} className="flex items-center gap-1.5 text-xs">
              <div className={cn('w-2.5 h-2.5 rounded-sm shrink-0', color.bar)} />
              {!isOther && team && <span className="text-sm shrink-0 leading-none">{getFlagEmoji(team.flag_code)}</span>}
              <span className={cn('flex-1 truncate', isOther ? 'text-white/40 italic' : 'text-white/80')}>
                {isOther ? 'אחר' : (team?.name ?? '?')}
              </span>
              <span className="text-white/50 font-mono tabular-nums shrink-0">{count} · {pct}%</span>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}

// ── Section: Stats ────────────────────────────────────────────

function StatsSection({
  allFutures,
  firstPlaceUserId,
  firstPlaceDisplayName,
}: {
  allFutures: FuturePred[]
  firstPlaceUserId: string | null
  firstPlaceDisplayName: string
}) {
  const [liveMatches, setLiveMatches] = useState(() => getInProgressMatches())
  const [nextMatch, setNextMatch]     = useState(() => getNextGroupMatch())
  const [matchPreds, setMatchPreds] = useState<Record<number, Array<{
    user_id: string
    display_name: string
    predicted_home: number
    predicted_away: number
  }>>>({})

  useEffect(() => {
    const id = setInterval(() => {
      setLiveMatches(getInProgressMatches())
      setNextMatch(getNextGroupMatch())
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const liveIds = liveMatches.map(m => m.match)
    const nextId = STATS_ALWAYS_VISIBLE && nextMatch && !liveIds.includes(nextMatch.match)
      ? [nextMatch.match] : []
    const ids = [...liveIds, ...nextId]
    if (ids.length === 0) return
    // Use admin API route to bypass RLS (anon client only returns own row for future matches)
    fetch(`/api/match-predictions?ids=${ids.join(',')}`)
      .then(r => r.json())
      .then((data: any[]) => {
        const grouped: typeof matchPreds = {}
        for (const r of data) {
          if (!grouped[r.match_id]) grouped[r.match_id] = []
          grouped[r.match_id].push({
            user_id: r.user_id,
            display_name: r.profiles?.display_name ?? 'Unknown',
            predicted_home: r.predicted_home,
            predicted_away: r.predicted_away,
          })
        }
        setMatchPreds(grouped)
      })
  }, [liveMatches, nextMatch])

  const tournamentStarted = Date.now() >= new Date(TOURNAMENT_START).getTime()
  if (!STATS_ALWAYS_VISIBLE && !tournamentStarted) return null

  const top5Champion     = computeTop5Teams(allFutures, 'champion_team_id')
  const top5TopScorer    = computeTop5Teams(allFutures, 'top_scorer_team_id')
  const top5GoldenBoot   = computeTop5Teams(allFutures, 'golden_boot_team_id')
  const top5MostConceded = computeTop5Teams(allFutures, 'most_conceded_team_id')

  const goalsArr = allFutures
    .filter(f => f.total_goals_prediction != null)
    .map(f => f.total_goals_prediction as number)
  const avgGoals = goalsArr.length > 0
    ? (goalsArr.reduce((s, v) => s + v, 0) / goalsArr.length).toFixed(1)
    : null

  // Renders prediction distribution + leader highlight for a match
  const renderMatchCard = (m: typeof GROUP_MATCHES[0], isLive: boolean) => {
    const preds = matchPreds[m.match] ?? []
    const homeWins = preds.filter(p => p.predicted_home > p.predicted_away).length
    const ties     = preds.filter(p => p.predicted_home === p.predicted_away).length
    const awayWins = preds.filter(p => p.predicted_home < p.predicted_away).length
    const total    = preds.length
    const leaderPred = firstPlaceUserId ? preds.find(p => p.user_id === firstPlaceUserId) : null
    return (
      <GlassCard key={m.match} className="space-y-3">
        <div className="flex items-center gap-2">
          {isLive
            ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Live</span>
            : <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold tracking-wider">הבא ▶ {localShortDt(m.kickoff_utc)}</span>
          }
          <p className="text-sm font-semibold text-white">{m.home} נגד {m.away}</p>
        </div>

        {/* Outcome distribution — single stacked bar */}
        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">
            התפלגות ניחושים{total > 0 ? ` · ${total} משתתפים` : ''}
          </p>
          {total === 0 ? (
            <div className="h-3 bg-white/10 rounded-full" />
          ) : (
            <div className="h-3 rounded-full overflow-hidden flex">
              {homeWins > 0 && <div className="h-full bg-blue-500/70"  style={{ width: `${homeWins / total * 100}%` }} />}
              {ties     > 0 && <div className="h-full bg-amber-500/70" style={{ width: `${ties     / total * 100}%` }} />}
              {awayWins > 0 && <div className="h-full bg-rose-500/70"  style={{ width: `${awayWins / total * 100}%` }} />}
            </div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[
              { label: `${m.home} (1)`, count: homeWins, dot: 'bg-blue-500/70',  text: 'text-blue-300' },
              { label: 'תיקו (X)',      count: ties,     dot: 'bg-amber-500/70', text: 'text-amber-300' },
              { label: `${m.away} (2)`, count: awayWins, dot: 'bg-rose-500/70',  text: 'text-rose-300' },
            ].map(({ label, count, dot, text }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs">
                <div className={cn('w-2.5 h-2.5 rounded-sm shrink-0', dot)} />
                <span className={cn('truncate', text)}>{label}</span>
                <span className="text-white/40 font-mono tabular-nums">
                  {count}{total > 0 ? ` · ${Math.round(count / total * 100)}%` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Leader highlight — "היילייט פתיחת עין" */}
        {leaderPred && (
          <div className="glass rounded-xl px-3 py-2.5 border border-yellow-400/30 bg-yellow-500/5 space-y-1.5">
            <p className="text-[10px] text-yellow-400/80 font-bold uppercase tracking-wider">
              👁 היילייט פתיחת עין · {firstPlaceDisplayName} (מקום 1)
            </p>
            <div className="flex items-center gap-4">
              <span className="font-mono font-bold text-white text-2xl tabular-nums" dir="ltr">
                {leaderPred.predicted_home} : {leaderPred.predicted_away}
              </span>
              <div className="space-y-0.5 text-xs">
                <div className="text-white/60">
                  שערים: <span className="text-white font-bold">{leaderPred.predicted_home + leaderPred.predicted_away}</span>
                </div>
                <div>
                  {leaderPred.predicted_home > leaderPred.predicted_away
                    ? <span className="text-blue-300 font-semibold">{m.home} מנצחת</span>
                    : leaderPred.predicted_home < leaderPred.predicted_away
                      ? <span className="text-rose-300 font-semibold">{m.away} מנצחת</span>
                      : <span className="text-amber-300 font-semibold">תיקו</span>
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4" dir="rtl">
      <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest px-1">סטטיסטיקות ניחושים</h2>

      {/* Live matches */}
      {liveMatches.map(m => renderMatchCard(m, true))}

      {/* Next upcoming match (visible when STATS_ALWAYS_VISIBLE) */}
      {STATS_ALWAYS_VISIBLE && nextMatch && !liveMatches.some(lm => lm.match === nextMatch.match) &&
        renderMatchCard(nextMatch, false)
      }

      {/* Constant futures distribution stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FuturesDistCard label="מי יהיה אלוף?" emoji="🏆" result={top5Champion} />
        <FuturesDistCard label="הנבחרת שכבשה הכי הרבה" emoji="⚽" result={top5TopScorer} />
        <FuturesDistCard label="נעל הזהב" emoji="👟" result={top5GoldenBoot} />
        <FuturesDistCard label="תספוג הכי הרבה שערים" emoji="🥅" result={top5MostConceded} />
      </div>

      {/* Average total goals across all user predictions */}
      {avgGoals != null && (
        <GlassCard className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-semibold text-white">ממוצע שערים בטורניר</p>
            <p className="text-xs text-white/40 mt-0.5">ממוצע ניחושי סך שערים מכלל המשתתפים ({goalsArr.length} {goalsArr.length === 1 ? 'ניחוש' : 'ניחושים'})</p>
          </div>
          <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{avgGoals}</span>
        </GlassCard>
      )}
    </div>
  )
}

// ── Section: Standings Table ──────────────────────────────────

function StandingsSection({
  entries, futureMap, myUserId, onClickUser,
}: {
  entries: ScoreEntry[]
  futureMap: Map<string, number | null>
  myUserId: string | null
  onClickUser: (userId: string) => void
}) {
  const tournamentStarted = Date.now() >= new Date(TOURNAMENT_START).getTime()

  const STAT_COLS = [
    { id: 'outcome', label: '1X2', title: 'תוצאות נכונות (מי ניצח)' },
    { id: 'goals',   label: '⚽',  title: 'שערים נכונים (סכום)' },
    { id: 'exact',   label: '🎯',  title: 'תוצאות מדויקות' },
  ] as const

  return (
    <div className="space-y-1">
      {/* Column headers */}
      <div className="flex items-center gap-2 px-4 pb-1">
        <span className="w-8 shrink-0" />
        <span className="w-9 shrink-0" />
        <span className="flex-1" />
        <div className="hidden sm:flex items-center gap-4 mr-2">
          {STAT_COLS.map(c => (
            <span key={c.id} title={c.title} className="text-[10px] text-white/30 w-8 text-center cursor-default">{c.label}</span>
          ))}
          <span className="text-[10px] text-white/30 w-8 text-center" title="אלוף מנוחש">🏆</span>
        </div>
        <span className="text-[10px] text-white/30 uppercase w-14 text-right shrink-0">Total</span>
      </div>

      {entries.length === 0 && (
        <GlassCard className="text-center py-14">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-white/50 text-sm">עדיין אין משתתפים — הצטרפו!</p>
        </GlassCard>
      )}

      {entries.map((entry, i) => {
        const isMe = entry.user_id === myUserId
        const isLast = i === entries.length - 1 && entries.length > 1
        const medal = isLast ? '🤡' : (RANK_MEDALS[i] ?? `#${i + 1}`)
        const counts = matchCounts((entry as any).breakdown)
        const championId = futureMap.get(entry.user_id) ?? null
        const champion = championId ? getTeamById(championId) : null

        return (
          <GlassCard
            key={entry.user_id}
            className={cn(
              'py-3 transition-all cursor-pointer hover:bg-white/5 active:scale-[0.99]',
              isMe && 'ring-2 ring-indigo-400/60 bg-indigo-500/10',
            )}
            onClick={() => onClickUser(entry.user_id)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl w-8 text-center shrink-0">{medal}</span>
              <Avatar name={entry.profiles?.display_name ?? '?'} url={entry.profiles?.avatar_url} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate text-sm flex items-center gap-1.5 hover:underline underline-offset-2">
                  {entry.profiles?.display_name ?? 'לא ידוע'}
                  {isMe && <span className="text-[10px] text-indigo-300 font-normal bg-indigo-500/20 px-1.5 py-0.5 rounded-full shrink-0">אתה</span>}
                </p>
                {/* Mobile: compact stats */}
                <p className="text-[10px] text-white/35 sm:hidden">
                  1X2: {counts.outcome} · ⚽: {counts.goals} · 🎯: {counts.exact}
                </p>
              </div>

              {/* Desktop stat columns */}
              <div className="hidden sm:flex items-center gap-4 mr-2">
                {STAT_COLS.map(c => (
                  <span key={c.id} className="text-xs text-white/60 w-8 text-center tabular-nums font-mono">
                    {counts[c.id]}
                  </span>
                ))}
                {/* Champion column */}
                <span className="w-8 text-center text-base" title={champion?.name ?? 'לא נבחר'}>
                  {!tournamentStarted
                    ? <span className="text-[10px] text-white/20">🔒</span>
                    : champion
                      ? getFlagEmoji(champion.flag_code)
                      : <span className="text-[10px] text-white/25">—</span>
                  }
                </span>
              </div>

              <div className="text-right shrink-0 w-14">
                <p className="text-xl font-bold text-emerald-300 tabular-nums">{entry.total_score ?? 0}</p>
              </div>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

// ── Section: Live Match Predictions ──────────────────────────

function LiveSection() {
  const [liveMatches, setLiveMatches] = useState(() => getInProgressMatches())
  const [preds, setPreds] = useState<Record<number, Array<{ user_id: string; display_name: string; predicted_home: number; predicted_away: number }>>>({})

  // Recheck which matches are live every 30s
  useEffect(() => {
    const id = setInterval(() => setLiveMatches(getInProgressMatches()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Fetch predictions for live matches
  useEffect(() => {
    if (liveMatches.length === 0) return
    const supabase = createClient()
    const ids = liveMatches.map(m => m.match)
    supabase
      .from('group_match_predictions')
      .select('user_id, match_id, predicted_home, predicted_away, profiles(display_name)')
      .in('match_id', ids)
      .then(({ data }) => {
        if (!data) return
        const grouped: typeof preds = {}
        for (const r of data as any[]) {
          if (!grouped[r.match_id]) grouped[r.match_id] = []
          grouped[r.match_id].push({
            user_id: r.user_id,
            display_name: r.profiles?.display_name ?? 'Unknown',
            predicted_home: r.predicted_home,
            predicted_away: r.predicted_away,
          })
        }
        setPreds(grouped)
      })
  }, [liveMatches])

  if (liveMatches.length === 0) {
    return (
      <GlassCard className="text-center py-10">
        <p className="text-2xl mb-2">⚽</p>
        <p className="text-sm text-white/50">No matches currently in progress.</p>
        <p className="text-xs text-white/30 mt-1">Check back during match days.</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      {liveMatches.map(m => {
        const matchPreds = preds[m.match] ?? []
        return (
          <GlassCard key={m.match} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Live · Group {(m as any).group}</p>
                <p className="font-semibold text-white text-sm mt-0.5">
                  {m.home} vs {m.away}
                </p>
              </div>
              <span className="text-xs text-white/30 font-mono">
                {new Date(m.kickoff_utc).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {matchPreds.length === 0 ? (
              <p className="text-xs text-white/30 italic">No predictions for this match.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {matchPreds.map(p => (
                  <div key={p.user_id} className="glass rounded-xl px-3 py-2 flex items-center gap-2">
                    <Avatar name={p.display_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 truncate">{p.display_name}</p>
                      <p className="text-sm font-mono font-bold text-white tabular-nums">
                        {p.predicted_home} : {p.predicted_away}
                        <span className="ml-1">{outcomeOf(p.predicted_home, p.predicted_away)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )
      })}
    </div>
  )
}

// ── Section: Browse Predictions ───────────────────────────────

const FUTURES_LABELS: Record<string, string> = {
  champion_team_id:       'Champion',
  top_scorer_team_id:     'הנבחרת שכבשה הכי הרבה',
  golden_boot_team_id:    'נעל הזהב',
  most_conceded_team_id:  'Most Conceded',
}

function BrowseSection({ profiles }: { profiles: Profile[] }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [userPreds, setUserPreds] = useState<UserPreds | null>(null)
  const [loading, setLoading] = useState(false)
  const [openSection, setOpenSection] = useState<string>('matches')

  const tournamentStarted = Date.now() >= new Date(TOURNAMENT_START).getTime()

  const filtered = profiles.filter(p =>
    p.display_name.toLowerCase().includes(query.toLowerCase())
  )

  const loadUser = useCallback(async (userId: string) => {
    setLoading(true)
    setUserPreds(null)
    const supabase = createClient()
    const [gm, gs, tp, ko, fut] = await Promise.all([
      supabase.from('group_match_predictions').select('*').eq('user_id', userId),
      supabase.from('group_predictions').select('*').eq('user_id', userId).order('predicted_position'),
      supabase.from('third_place_selections').select('team_id').eq('user_id', userId),
      supabase.from('knockout_predictions').select('*').eq('user_id', userId),
      supabase.from('futures_predictions').select('*').eq('user_id', userId).maybeSingle(),
    ])

    const groupMatches: UserPreds['groupMatches'] = {}
    for (const r of gm.data ?? []) groupMatches[r.match_id] = { predicted_home: r.predicted_home, predicted_away: r.predicted_away }

    const groupStandings: UserPreds['groupStandings'] = {}
    for (const r of (gs.data ?? []) as any[]) {
      if (!groupStandings[r.group_letter]) groupStandings[r.group_letter] = []
      groupStandings[r.group_letter].push(r.team_id)
    }

    setUserPreds({
      groupMatches,
      groupStandings,
      thirdPlace: (tp.data ?? []).map((r: any) => r.team_id),
      knockout: (ko.data ?? []) as UserPreds['knockout'],
      futures: (fut.data as any) ?? null,
    })
    setLoading(false)
  }, [])

  const selectedProfile = profiles.find(p => p.id === selectedId)

  const AccordionBtn = ({ id, label, count }: { id: string; label: string; count?: number }) => (
    <button
      onClick={() => setOpenSection(s => s === id ? '' : id)}
      className="w-full flex items-center justify-between py-2 text-sm font-semibold text-white/80 hover:text-white transition-colors"
    >
      <span>{label}{count != null ? <span className="ml-2 text-xs text-white/30 font-normal">{count}</span> : null}</span>
      <span className={cn('text-white/30 transition-transform text-xs', openSection === id && 'rotate-180')}>▼</span>
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search by name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="glass-input pl-9 py-2.5 text-sm"
        />
      </div>

      <div className={cn('grid gap-3', selectedId ? 'grid-cols-1 sm:grid-cols-[280px_1fr]' : 'grid-cols-1')}>
        {/* User list */}
        <div className="space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-white/30 italic px-2">No users found.</p>
          )}
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => {
                if (selectedId === p.id) { setSelectedId(null); setUserPreds(null); return }
                setSelectedId(p.id)
                loadUser(p.id)
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left',
                selectedId === p.id ? 'bg-white/15 border border-white/20' : 'glass hover:bg-white/10'
              )}
            >
              <Avatar name={p.display_name} url={p.avatar_url} size="sm" />
              <span className="text-sm text-white font-medium truncate">{p.display_name}</span>
              {selectedId === p.id && <span className="ml-auto text-white/40 text-xs">▶</span>}
            </button>
          ))}
        </div>

        {/* Predictions panel */}
        {selectedId && (
          <GlassCard className="space-y-1 min-h-[200px]">
            <p className="text-sm font-semibold text-white mb-3">
              {selectedProfile?.display_name ?? '…'}&apos;s Predictions
            </p>

            {loading && (
              <div className="space-y-2 animate-pulse">
                {[1,2,3,4].map(i => <div key={i} className="h-7 glass rounded-lg" />)}
              </div>
            )}

            {!loading && userPreds && (
              <div className="space-y-0 divide-y divide-white/8">

                {/* Group Match Scores */}
                <div>
                  <AccordionBtn id="matches" label="Group Match Scores" count={Object.keys(userPreds.groupMatches).length} />
                  {openSection === 'matches' && (
                    <div className="pb-3 space-y-2">
                      {GROUP_LETTERS.map(g => {
                        const matches = GROUP_MATCHES_BY_GROUP[g] ?? []
                        const filled = matches.filter(m => userPreds.groupMatches[m.match])
                        if (filled.length === 0) return (
                          <p key={g} className="text-xs text-white/25 italic">Group {g}: no predictions</p>
                        )
                        return (
                          <div key={g}>
                            <p className="text-[10px] text-white/40 uppercase font-mono mb-1">Group {g}</p>
                            <div className="space-y-1">
                              {matches.map(m => {
                                const p = userPreds.groupMatches[m.match]
                                const kicked = new Date(m.kickoff_utc).getTime() < Date.now()
                                return (
                                  <div key={m.match} className={cn('flex items-center gap-2 text-xs', !kicked && !tournamentStarted && 'opacity-40')}>
                                    <span className="text-white/30 w-12 font-mono shrink-0">{localShortDt(m.kickoff_utc)}</span>
                                    <span className="flex-1 text-white/70 truncate">{m.home}</span>
                                    {p && kicked ? (
                                      <span className="font-mono font-bold text-white shrink-0">
                                        {p.predicted_home} : {p.predicted_away}
                                      </span>
                                    ) : (
                                      <span className="text-white/20 shrink-0">🔒</span>
                                    )}
                                    <span className="flex-1 text-white/70 truncate text-right">{m.away}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Group Standings */}
                <div>
                  <AccordionBtn id="standings" label="Group Standings" />
                  {openSection === 'standings' && (
                    <div className="pb-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      {GROUP_LETTERS.map(g => {
                        const order = userPreds.groupStandings[g]
                        return (
                          <div key={g}>
                            <p className="text-[10px] text-white/40 uppercase font-mono mb-1">Group {g}</p>
                            {!order || order.length === 0 ? (
                              <p className="text-xs text-white/25 italic">—</p>
                            ) : (
                              order.map((teamId, idx) => {
                                const team = getTeamById(teamId)
                                const revealed = new Date(GROUP_MATCHES_BY_GROUP[g]?.[0]?.kickoff_utc ?? 0).getTime() < Date.now()
                                return (
                                  <div key={teamId} className="flex items-center gap-1.5 py-0.5">
                                    <span className="text-[10px] text-white/30 w-4">{idx + 1}.</span>
                                    {revealed && team ? (
                                      <>
                                        <span className="text-sm">{getFlagEmoji(team.flag_code)}</span>
                                        <span className="text-xs text-white truncate">{team.name}</span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-white/20">🔒 hidden</span>
                                    )}
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Knockout */}
                <div>
                  <AccordionBtn id="knockout" label="Knockout Picks" count={userPreds.knockout.length} />
                  {openSection === 'knockout' && (
                    <div className="pb-3 space-y-1">
                      {userPreds.knockout.length === 0 ? (
                        <p className="text-xs text-white/25 italic">No knockout predictions.</p>
                      ) : userPreds.knockout.map(k => {
                        const team = getTeamById(k.predicted_winner_id)
                        const knockoutStarted = Date.now() >= new Date('2026-06-29T19:00:00Z').getTime()
                        return (
                          <div key={k.match_num} className="flex items-center gap-2 text-xs">
                            <span className="text-white/30 font-mono w-10">M{k.match_num}</span>
                            {knockoutStarted && team ? (
                              <>
                                <span>{getFlagEmoji(team.flag_code)}</span>
                                <span className="text-white">{team.name}</span>
                                {k.predicted_home_score != null && (
                                  <span className="text-white/40 ml-auto font-mono">{k.predicted_home_score}:{k.predicted_away_score}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-white/20">🔒 hidden</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Futures */}
                <div>
                  <AccordionBtn id="futures" label="Futures" />
                  {openSection === 'futures' && (
                    <div className="pb-3 space-y-1">
                      {!userPreds.futures ? (
                        <p className="text-xs text-white/25 italic">No futures predictions.</p>
                      ) : (
                        <>
                          {(Object.entries(FUTURES_LABELS) as [string, string][]).map(([key, label]) => {
                            const teamId = (userPreds.futures as any)?.[key]
                            const team = teamId ? getTeamById(teamId) : null
                            return (
                              <div key={key} className="flex items-center gap-2 text-xs">
                                <span className="text-white/40 w-36 shrink-0">{label}</span>
                                {team ? (
                                  <>
                                    <span>{getFlagEmoji(team.flag_code)}</span>
                                    <span className="text-white">{team.name}</span>
                                  </>
                                ) : (
                                  <span className="text-white/25 italic">—</span>
                                )}
                              </div>
                            )
                          })}
                          {userPreds.futures.total_goals_prediction != null && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-white/40 w-36 shrink-0">Total Goals</span>
                              <span className="text-white font-mono">{userPreds.futures.total_goals_prediction}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  )
}

// ── Bracket Progress Section ──────────────────────────────────

const BRACKET_STAGES = [
  { key: 'r32',      label: 'סבב 32',      pts: 4,  color: 'text-white/70',    bg: 'bg-white/5' },
  { key: 'r16',      label: 'שמינית גמר',  pts: 5,  color: 'text-blue-300',    bg: 'bg-blue-500/10' },
  { key: 'qf',       label: 'רבע גמר',     pts: 6,  color: 'text-violet-300',  bg: 'bg-violet-500/10' },
  { key: 'sf',       label: 'חצי גמר',     pts: 7,  color: 'text-amber-300',   bg: 'bg-amber-500/10' },
  { key: 'final',    label: 'גמר',          pts: 8,  color: 'text-orange-300',  bg: 'bg-orange-500/10' },
  { key: 'champion', label: 'אלוף 🏆',      pts: 15, color: 'text-yellow-300',  bg: 'bg-yellow-500/15' },
] as const

function BracketProgressSection({
  realR32TeamIds, realR16TeamIds, realQFTeamIds,
  realSFTeamIds, realFinalTeamIds, realChampionId,
}: {
  realR32TeamIds: Set<number>
  realR16TeamIds: Set<number>
  realQFTeamIds: Set<number>
  realSFTeamIds: Set<number>
  realFinalTeamIds: Set<number>
  realChampionId: number | null
}) {
  const teamsByStage: Record<string, number[]> = {
    r32:      [...realR32TeamIds],
    r16:      [...realR16TeamIds],
    qf:       [...realQFTeamIds],
    sf:       [...realSFTeamIds],
    final:    [...realFinalTeamIds],
    champion: realChampionId ? [realChampionId] : [],
  }

  const hasAnyData = BRACKET_STAGES.some(s => teamsByStage[s.key].length > 0)

  if (!hasAnyData) {
    return (
      <GlassCard className="text-center py-14">
        <div className="text-5xl mb-4">🗂️</div>
        <p className="text-white/50 text-sm">הנתונים יתעדכנו כשהמנהל יזין את תוצאות הנוקאאוט.</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      {BRACKET_STAGES.map(({ key, label, pts, color, bg }) => {
        const teams = teamsByStage[key]
        if (teams.length === 0) return null
        const isChampion = key === 'champion'
        return (
          <GlassCard key={key} className={cn('space-y-3', isChampion && 'ring-2 ring-yellow-400/30')}>
            <div className="flex items-center justify-between">
              <h3 className={cn('font-bold text-sm', color)}>{label}</h3>
              <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', bg, color)}>
                +{pts} נק׳ לניחוש נכון · {teams.length} {key === 'champion' ? 'נבחרת' : 'נבחרות'}
              </span>
            </div>
            <div className={cn(
              'grid gap-2',
              isChampion ? 'grid-cols-1 max-w-xs mx-auto' :
              teams.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
              teams.length <= 8 ? 'grid-cols-2 sm:grid-cols-4' :
              'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'
            )}>
              {teams.map(id => {
                const team = getTeamById(id)
                if (!team) return null
                return (
                  <div
                    key={id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl',
                      bg,
                      isChampion && 'justify-center py-4'
                    )}
                  >
                    <span className={cn('shrink-0', isChampion ? 'text-3xl' : 'text-lg')}>
                      {getFlagEmoji(team.flag_code)}
                    </span>
                    <span className={cn('font-semibold truncate', isChampion ? 'text-base text-yellow-200' : 'text-sm text-white/85')}>
                      {team.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

type Tab = 'standings' | 'live' | 'browse' | 'bracket'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'standings', label: 'Standings', icon: '🏆' },
  { id: 'live',      label: 'Live',      icon: '⚽' },
  { id: 'bracket',   label: 'סבבים',     icon: '🗂️' },
  { id: 'browse',    label: 'Browse',    icon: '🔍' },
]

export default function LeaderboardClient({
  initialScores,
  allProfiles,
  initialFutures,
  completedMatchIds = new Set(),
  realR32TeamIds = new Set(),
  realR16TeamIds = new Set(),
  realGroupStandings = {},
  realQFTeamIds = new Set(),
  realSFTeamIds = new Set(),
  realFinalTeamIds = new Set(),
  realChampionId = null,
  koMatchResults = {},
}: {
  initialScores: ScoreEntry[]
  allProfiles: Profile[]
  initialFutures: FuturePred[]
  completedMatchIds?: Set<number>
  realR32TeamIds?: Set<number>
  realR16TeamIds?: Set<number>
  realGroupStandings?: Record<string, number[]>
  realQFTeamIds?: Set<number>
  realSFTeamIds?: Set<number>
  realFinalTeamIds?: Set<number>
  realChampionId?: number | null
  koMatchResults?: Record<number, { home: number; away: number }>
}) {
  const [scores, setScores] = useState(initialScores)
  const [profiles, setProfiles] = useState(allProfiles)
  const [futures, setFutures] = useState(initialFutures)
  const [tab, setTab] = useState<Tab>('standings')
  const [myUserId, setMyUserId] = useState<string | null>(null)

  // User predictions modal
  const [modalUserId, setModalUserId] = useState<string | null>(null)
  const [modalPreds, setModalPreds] = useState<UserPreds | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  const openUserModal = useCallback(async (userId: string) => {
    setModalUserId(userId)
    setModalLoading(true)
    setModalPreds(null)
    const supabase = createClient()
    const [gm, gs, tp, ko, fut] = await Promise.all([
      supabase.from('group_match_predictions').select('*').eq('user_id', userId),
      supabase.from('group_predictions').select('*').eq('user_id', userId).order('predicted_position'),
      supabase.from('third_place_selections').select('team_id').eq('user_id', userId),
      supabase.from('knockout_predictions').select('*').eq('user_id', userId),
      supabase.from('futures_predictions').select('*').eq('user_id', userId).maybeSingle(),
    ])
    const groupMatches: UserPreds['groupMatches'] = {}
    for (const r of gm.data ?? []) groupMatches[r.match_id] = { predicted_home: r.predicted_home, predicted_away: r.predicted_away }
    const groupStandings: UserPreds['groupStandings'] = {}
    for (const r of (gs.data ?? []) as any[]) {
      if (!groupStandings[r.group_letter]) groupStandings[r.group_letter] = []
      groupStandings[r.group_letter].push(r.team_id)
    }
    setModalPreds({
      groupMatches,
      groupStandings,
      thirdPlace: (tp.data ?? []).map((r: any) => r.team_id),
      knockout: (ko.data ?? []) as UserPreds['knockout'],
      futures: (fut.data as any) ?? null,
    })
    setModalLoading(false)
  }, [])

  // On mount: fresh client-side fetch so ISR staleness doesn't hide new users,
  // then subscribe to all tables for real-time updates.
  useEffect(() => {
    const supabase = createClient()

    async function fetchAll() {
      // Don't re-fetch profiles or futures — the server uses admin client (bypasses RLS);
      // the anon-key client would only return the current user's own row for both.
      const [{ data: s }, { data: { user } }] = await Promise.all([
        supabase.from('scores').select('*, profiles(display_name, avatar_url)').order('total_score', { ascending: false }),
        supabase.auth.getUser(),
      ])
      if (s) setScores(s as ScoreEntry[])
      if (user) setMyUserId(user.id)

      // Add current user to the server-provided list only if missing
      if (user) {
        setProfiles(prev => {
          if (prev.find(p => p.id === user.id)) return prev
          return [
            ...prev,
            {
              id: user.id,
              display_name:
                user.user_metadata?.display_name ??
                user.user_metadata?.full_name ??
                user.email?.split('@')[0] ??
                'Unknown',
              avatar_url: user.user_metadata?.avatar_url ?? null,
            },
          ]
        })
      }
    }
    fetchAll()

    const scoresChannel = supabase
      .channel('scores-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, fetchAll)
      .subscribe()

    const profilesChannel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(scoresChannel)
      supabase.removeChannel(profilesChannel)
    }
  }, [])

  // Merge all profiles with scores — everyone shows up even with 0 pts
  const mergedEntries = useMemo(() => {
    const scoreMap = new Map(scores.map(s => [s.user_id, s]))
    return profiles
      .map(p => scoreMap.get(p.id) ?? ({
        user_id: p.id,
        total_score: 0,
        group_match_points: 0,
        group_standing_points: 0,
        advancement_points: 0,
        knockout_score_points: 0,
        futures_points: 0,
        last_calculated_at: '',
        profiles: { display_name: p.display_name, avatar_url: p.avatar_url },
      } as ScoreEntry))
      .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
  }, [scores, profiles])

  const futureMap = useMemo(
    () => new Map(futures.map(f => [f.user_id, f.champion_team_id])),
    [futures]
  )

  const topScore = mergedEntries[0]?.total_score ?? 0
  const avgScore = scores.length
    ? Math.round(scores.reduce((s, e) => s + (e.total_score ?? 0), 0) / scores.length)
    : 0
  const myRank = myUserId
    ? mergedEntries.findIndex(e => e.user_id === myUserId) + 1
    : null

  return (
    <>
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-shadow">טבלת ניקוד</h1>
        <p className="text-sm text-white/50 mt-1">
          {profiles.length} משתתפים · הניקוד מתעדכן לאחר כל משחק · הניחושים ננעלים עם קיקאוף ראשון
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'משתתפים',   value: String(profiles.length) },
          { label: 'ניקוד מוביל', value: String(topScore) },
          { label: 'ממוצע',     value: String(avgScore) },
        ].map(({ label, value }) => (
          <GlassCard key={label} className="text-center py-4">
            <p className="text-2xl font-bold text-emerald-300 tabular-nums">{value}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </GlassCard>
        ))}
        <GlassCard className="text-center py-4 ring-1 ring-indigo-400/30">
          <p className="text-2xl font-bold text-indigo-300 tabular-nums">
            {myRank ? `#${myRank}` : '—'}
          </p>
          <p className="text-xs text-white/40 mt-0.5">המיקום שלי</p>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === t.id ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
            )}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'standings' && (
        <div className="space-y-6">
          <StandingsSection entries={mergedEntries} futureMap={futureMap} myUserId={myUserId} onClickUser={openUserModal} />

          <StatsSection
            allFutures={futures}
            firstPlaceUserId={mergedEntries[0]?.user_id ?? null}
            firstPlaceDisplayName={mergedEntries[0]?.profiles?.display_name ?? ''}
          />

          {/* Scoring system table */}
          <GlassCard className="space-y-3">
            <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">שיטת הניקוד</h2>
            <p className="text-xs text-white/40">כל הקטגוריות עצמאיות ומצטברות.</p>
            <div className="space-y-0 divide-y divide-white/5">
              {[
                { cat: '1X2 נכון (מי ניצח)',                    pts: '+1 נק׳' },
                { cat: 'מספר שערים נכון',                       pts: '+2 נק׳' },
                { cat: 'תוצאה מדויקת',                          pts: '+3 נק׳' },
                { cat: 'דירוג בית — מיקום נכון (×4 לבית)',     pts: '+3 נק׳' },
                { cat: 'נבחרת מגיעה לשלב 32',                  pts: '+4 נק׳' },
                { cat: 'נבחרת מגיעה לשלב 16',                  pts: '+5 נק׳' },
                { cat: 'נבחרת מגיעה לרבע גמר',                 pts: '+6 נק׳' },
                { cat: 'נבחרת מגיעה לחצי גמר',                 pts: '+7 נק׳' },
                { cat: 'נבחרת מגיעה לגמר',                     pts: '+8 נק׳' },
                { cat: 'משחק נוקאאוט — מספר שערים נכון',       pts: '+2 נק׳' },
                { cat: 'משחק נוקאאוט — תוצאה מדויקת',          pts: '+3 נק׳' },
                { cat: 'אלוף גביע העולם',                       pts: '+15 נק׳' },
                { cat: 'הנבחרת שכבשה הכי הרבה',                    pts: '+8 נק׳' },
                { cat: 'נעל הזהב (קבוצת הכובש)',           pts: '+8 נק׳' },
                { cat: 'הנבחרת שספגה הכי הרבה שערים',          pts: '+10 נק׳' },
                { cat: 'סך שערים בטורניר (מדויק)',             pts: '+12 נק׳' },
              ].map(({ cat, pts }) => (
                <div key={cat} className="flex items-center justify-between py-2 gap-4">
                  <span className="text-sm text-white/70">{cat}</span>
                  <span className="text-sm font-bold text-indigo-300 tabular-nums shrink-0">{pts}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/30 leading-relaxed border-t border-white/8 pt-2">
              במשחקי בית הניקוד מצטבר: תוצאה מדויקת = 1+2+3 = 6 נקודות. 1X2 נכון + שערים נכון (אבל לא מדויק) = 3 נקודות. דירוגי ההתקדמות עצמאיים — נבחרת שנחשה נכון בכל שלב מנקדת בכל שלב שהיא מגיעה אליו.
            </p>
          </GlassCard>
        </div>
      )}
      {tab === 'live'      && <LiveSection />}
      {tab === 'bracket'   && (
        <BracketProgressSection
          realR32TeamIds={realR32TeamIds}
          realR16TeamIds={realR16TeamIds}
          realQFTeamIds={realQFTeamIds}
          realSFTeamIds={realSFTeamIds}
          realFinalTeamIds={realFinalTeamIds}
          realChampionId={realChampionId}
        />
      )}
      {tab === 'browse'    && <BrowseSection profiles={profiles} />}
    </div>

    {/* User predictions modal */}
    {modalUserId && (
      <UserPredictionsModal
        profile={profiles.find(p => p.id === modalUserId) ?? null}
        entry={mergedEntries.find(e => e.user_id === modalUserId) ?? null}
        preds={modalPreds}
        loading={modalLoading}
        onClose={() => { setModalUserId(null); setModalPreds(null) }}
        completedMatchIds={completedMatchIds}
        realR32TeamIds={realR32TeamIds}
        realR16TeamIds={realR16TeamIds}
        realQFTeamIds={realQFTeamIds}
        realSFTeamIds={realSFTeamIds}
        realFinalTeamIds={realFinalTeamIds}
        realGroupStandings={realGroupStandings}
        koMatchResults={koMatchResults}
      />
    )}
  </>
  )
}
