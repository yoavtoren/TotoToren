'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFlagEmoji, getTeamById } from '@/data/teams'
import { GROUP_MATCHES, GROUP_MATCHES_BY_GROUP } from '@/data/match-schedule'
import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { GROUP_LETTERS, TOURNAMENT_START } from '@/lib/constants'

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

function outcomeOf(h: number, a: number) {
  if (h > a) return <span className="text-blue-300 font-bold text-xs">1</span>
  if (a > h) return <span className="text-rose-300 font-bold text-xs">2</span>
  return <span className="text-amber-300 font-bold text-xs">X</span>
}

function localShortDt(utc: string) {
  return new Date(utc).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

// ── Sub-components ────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn(
      'rounded-full glass flex items-center justify-center font-bold text-white/70 shrink-0',
      size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
    )}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

// ── Section: Standings Table ──────────────────────────────────

function StandingsSection({ entries }: { entries: ScoreEntry[] }) {
  if (entries.length === 0) {
    return (
      <GlassCard className="text-center py-14">
        <div className="text-5xl mb-4">🏆</div>
        <p className="text-white/50 text-sm">עדיין אין ניקוד — היו הראשונים לשלוח ניחושים!</p>
      </GlassCard>
    )
  }

  const cols = [
    { key: 'group_match_points',    label: 'משחקים',  short: 'מש'  },
    { key: 'group_standing_points', label: 'בתים',    short: 'בת'  },
    { key: 'advancement_points',    label: 'התקדמות', short: 'הת' },
    { key: 'knockout_score_points', label: 'נוקאאוט', short: 'נק'  },
    { key: 'futures_points',        label: 'עתידיות', short: 'עת' },
  ] as const

  return (
    <div className="space-y-1">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 pb-1">
        <span className="w-8 shrink-0" />
        <span className="w-9 shrink-0" />
        <span className="flex-1" />
        <div className="hidden sm:flex items-center gap-3 mr-3">
          {cols.map(c => (
            <span key={c.key} className="text-[10px] text-white/30 uppercase w-10 text-center">{c.short}</span>
          ))}
        </div>
        <span className="text-[10px] text-white/30 uppercase w-14 text-right">Total</span>
        <span className="w-4 shrink-0" />
      </div>

      {entries.map((entry, i) => {
        const medal = RANK_MEDALS[i] ?? `#${i + 1}`
        return (
          <GlassCard key={entry.user_id} className="py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl w-8 text-center shrink-0">{medal}</span>
              <Avatar name={entry.profiles?.display_name ?? '?'} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate text-sm">
                  {entry.profiles?.display_name ?? 'Unknown'}
                </p>
                {/* Mobile breakdown */}
                <p className="text-[10px] text-white/35 sm:hidden">
                  GM {entry.group_match_points ?? 0} · GS {entry.group_standing_points ?? 0} · KO {entry.knockout_score_points ?? 0} · Fut {entry.futures_points ?? 0}
                </p>
              </div>
              {/* Desktop breakdown */}
              <div className="hidden sm:flex items-center gap-3 mr-3">
                {cols.map(c => (
                  <span key={c.key} className="text-xs text-white/50 w-10 text-center tabular-nums">
                    {(entry as any)[c.key] ?? 0}
                  </span>
                ))}
              </div>
              <div className="text-right shrink-0 w-14">
                <p className="text-xl font-bold text-emerald-300 tabular-nums">{entry.total_score ?? 0}</p>
              </div>
              {/* Spacing placeholder for the chevron that Browse section has */}
              <span className="w-4 shrink-0" />
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
  top_scorer_team_id:     'Top-scoring Team',
  golden_boot_team_id:    'Golden Boot',
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
    const [gm, gs, ko, fut] = await Promise.all([
      supabase.from('group_match_predictions').select('*').eq('user_id', userId),
      supabase.from('group_predictions').select('*').eq('user_id', userId).order('predicted_position'),
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
              <Avatar name={p.display_name} size="sm" />
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

// ── Main component ────────────────────────────────────────────

type Tab = 'standings' | 'live' | 'browse'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'standings', label: 'Standings', icon: '🏆' },
  { id: 'live',      label: 'Live',      icon: '⚽' },
  { id: 'browse',    label: 'Browse',    icon: '🔍' },
]

export default function LeaderboardClient({
  initialScores,
  allProfiles,
}: {
  initialScores: ScoreEntry[]
  allProfiles: Profile[]
}) {
  const [scores, setScores] = useState(initialScores)
  const [tab, setTab] = useState<Tab>('standings')

  // Real-time score updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('scores-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, async () => {
        const { data } = await supabase
          .from('scores')
          .select('*, profiles(display_name, avatar_url)')
          .order('total_score', { ascending: false })
        if (data) setScores(data as ScoreEntry[])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const topScore = scores[0]?.total_score ?? 0
  const avgScore = scores.length
    ? Math.round(scores.reduce((s, e) => s + (e.total_score ?? 0), 0) / scores.length)
    : 0

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-shadow">טבלת ניקוד</h1>
        <p className="text-sm text-white/50 mt-1">
          {allProfiles.length} משתתפים · הניקוד מתעדכן לאחר כל משחק · הניחושים ננעלים עם קיקאוף ראשון
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'משתתפים', value: allProfiles.length },
          { label: 'ניקוד מוביל',    value: topScore },
          { label: 'ממוצע',    value: avgScore },
        ].map(({ label, value }) => (
          <GlassCard key={label} className="text-center py-4">
            <p className="text-2xl font-bold text-emerald-300 tabular-nums">{value}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </GlassCard>
        ))}
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
      {tab === 'standings' && <StandingsSection entries={scores} />}
      {tab === 'live'      && <LiveSection />}
      {tab === 'browse'    && <BrowseSection profiles={allProfiles} />}
    </div>
  )
}
