'use client'

import { useState, useEffect } from 'react'
import { GROUP_MATCHES, KNOCKOUT_MATCHES, GROUP_MATCHES_BY_GROUP } from '@/data/match-schedule'
import { TEAMS, getFlagEmoji } from '@/data/teams'
import GlassCard from '@/components/ui/GlassCard'
import { cn, pad } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────

function localDate(utc: string) {
  return new Date(utc).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function localShortTime(utc: string) {
  return new Date(utc).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  })
}

function teamByName(name: string) {
  return TEAMS.find(t => t.name === name)
}

// ── Per-match countdown badge ─────────────────────────────────

function CountdownBadge({ targetUtc }: { targetUtc: string }) {
  const [ms, setMs] = useState(() => new Date(targetUtc).getTime() - Date.now())
  useEffect(() => {
    const id = setInterval(() => setMs(new Date(targetUtc).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [targetUtc])

  if (ms <= 0) return <span className="text-[10px] text-emerald-400 font-semibold">הסתיים</span>
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (d > 0) return <span className="text-[10px] text-white/40">{d}d {pad(h)}h {pad(m)}m</span>
  return <span className="text-[10px] text-amber-400 font-mono font-bold">{pad(h)}:{pad(m)}:{pad(s)}</span>
}

// ── Next-match countdown hero ─────────────────────────────────

function NextMatchHero() {
  const now = Date.now()
  const next = [...GROUP_MATCHES, ...KNOCKOUT_MATCHES]
    .sort((a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime())
    .find(m => new Date(m.kickoff_utc).getTime() > now)

  const [ms, setMs] = useState(() => next ? new Date(next.kickoff_utc).getTime() - Date.now() : 0)
  useEffect(() => {
    if (!next) return
    const id = setInterval(() => setMs(new Date(next.kickoff_utc).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [next?.kickoff_utc])

  if (!next || ms <= 0) return null

  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)

  const gm = 'group' in next ? next : null
  const label = gm
    ? `Group ${(gm as any).group} — ${(gm as any).home} vs ${(gm as any).away}`
    : `M${next.match} — ${ROUND_LABELS[(next as any).stage]}`

  const units = [
    { v: d, l: 'Days' }, { v: h, l: 'Hours' }, { v: m, l: 'Min' }, { v: s, l: 'Sec' },
  ]

  return (
    <GlassCard className="text-center space-y-4 py-6">
      <p className="text-xs text-white/40 uppercase tracking-widest">המשחק הבא מתחיל בעוד</p>
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {units.map(({ v, l }, i, arr) => (
          <div key={l} className="flex items-center gap-2 sm:gap-4">
            <div className="glass rounded-xl px-3 sm:px-5 py-3 min-w-[56px] text-center">
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums">{pad(v)}</div>
              <div className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{l}</div>
            </div>
            {i < arr.length - 1 && <span className="text-white/20 font-bold -mt-3 text-lg">:</span>}
          </div>
        ))}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/40">{localDate(next.kickoff_utc)} · {localShortTime(next.kickoff_utc)} שעון מקומי</p>
      </div>
    </GlassCard>
  )
}

// ── Constants ─────────────────────────────────────────────────

const ROUND_LABELS: Record<string, string> = {
  r32: 'שלב 32', r16: 'שלב 16', qf: 'Quarter-finals',
  sf: 'Semi-finals', third_place: 'משחק המקום השלישי', final: 'גמר',
}

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// ── Shared match row ──────────────────────────────────────────

function MatchRow({ m, showDate = false }: { m: (typeof GROUP_MATCHES)[0]; showDate?: boolean }) {
  const past = new Date(m.kickoff_utc).getTime() < Date.now()
  const homeT = teamByName(m.home)
  const awayT = teamByName(m.away)
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', past && 'opacity-40')}>
      {/* Time + optional date */}
      <div className="w-20 shrink-0">
        {showDate && <p className="text-[10px] text-white/40 font-mono">{localDate(m.kickoff_utc)}</p>}
        <p className="text-xs font-mono font-semibold text-white/80">{localShortTime(m.kickoff_utc)}</p>
        <p className="text-[9px] text-white/25 mt-0.5">Group {(m as any).group}</p>
      </div>

      {/* Home */}
      <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
        <span className="text-xs text-white font-medium truncate">{m.home}</span>
        {homeT && <span className="text-base shrink-0">{getFlagEmoji(homeT.flag_code)}</span>}
      </div>

      <span className="text-white/25 text-xs font-bold shrink-0">vs</span>

      {/* Away */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {awayT && <span className="text-base shrink-0">{getFlagEmoji(awayT.flag_code)}</span>}
        <span className="text-xs text-white font-medium truncate">{m.away}</span>
      </div>

      {/* Countdown */}
      <div className="w-20 text-right shrink-0">
        {past
          ? <span className="text-[10px] text-white/25">הסתיים</span>
          : <CountdownBadge targetUtc={m.kickoff_utc} />}
      </div>
    </div>
  )
}

// ── Group matches tab ─────────────────────────────────────────

function GroupMatchesTab() {
  const [sortBy, setSortBy] = useState<'date' | 'group'>('date')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['A']))

  const toggleGroup = (g: string) => setOpenGroups(prev => {
    const next = new Set(prev)
    next.has(g) ? next.delete(g) : next.add(g)
    return next
  })

  // Sort toggle
  const toggle = (
    <div className="flex gap-1 p-1 glass rounded-xl w-fit">
      {(['date', 'group'] as const).map(v => (
        <button
          key={v}
          onClick={() => setSortBy(v)}
          className={cn(
            'px-4 py-1.5 rounded-lg text-xs font-medium transition-colors',
            sortBy === v ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
          )}
        >
          {v === 'date' ? 'לפי תאריך' : 'לפי בית'}
        </button>
      ))}
    </div>
  )

  // ── לפי תאריך view ──────────────────────────────────────────────
  if (sortBy === 'date') {
    const sorted = [...GROUP_MATCHES].sort(
      (a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime()
    )
    const byDay = new Map<string, typeof sorted>()
    for (const m of sorted) {
      const key = new Date(m.kickoff_utc).toLocaleDateString(undefined, {
        weekday: 'short', day: 'numeric', month: 'short',
      })
      if (!byDay.has(key)) byDay.set(key, [])
      byDay.get(key)!.push(m)
    }

    return (
      <div className="space-y-3">
        {toggle}
        {[...byDay.entries()].map(([day, matches]) => (
          <div key={day} className="space-y-0">
            <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest px-1 pb-1">{day}</p>
            <GlassCard className="p-0 overflow-hidden">
              <div className="divide-y divide-white/5">
                {matches.map(m => <MatchRow key={m.match} m={m} />)}
              </div>
            </GlassCard>
          </div>
        ))}
      </div>
    )
  }

  // ── לפי בית view ─────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {toggle}
      {GROUPS.map(g => {
        const matches = GROUP_MATCHES_BY_GROUP[g] ?? []
        const isOpen = openGroups.has(g)
        const teams = [...new Set(matches.flatMap(m => [m.home, m.away]))]

        return (
          <GlassCard key={g} className="p-0 overflow-hidden">
            <button
              onClick={() => toggleGroup(g)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-white">Group {g}</span>
                <div className="flex items-center gap-1">
                  {teams.map(name => {
                    const t = teamByName(name)
                    return t ? <span key={name} className="text-base">{getFlagEmoji(t.flag_code)}</span> : null
                  })}
                </div>
              </div>
              <span className="text-white/30 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="border-t border-white/10 divide-y divide-white/5">
                {matches.map(m => <MatchRow key={m.match} m={m} showDate />)}
              </div>
            )}
          </GlassCard>
        )
      })}
    </div>
  )
}

// ── Knockout tab ──────────────────────────────────────────────

function KnockoutTab() {
  const rounds = ['r32','r16','qf','sf','third_place','final'] as const
  return (
    <div className="space-y-6">
      {rounds.map(round => {
        const matches = KNOCKOUT_MATCHES.filter(m => m.stage === round)
        return (
          <div key={round} className="space-y-2">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest px-1">
              {ROUND_LABELS[round]}
            </h3>
            <div className="space-y-2">
              {matches.map(m => {
                const past = new Date(m.kickoff_utc).getTime() < Date.now()
                return (
                  <GlassCard key={m.match} className={cn('flex items-center gap-4 py-3', past && 'opacity-50')}>
                    {/* Date */}
                    <div className="w-28 shrink-0">
                      <p className="text-[10px] text-white/40">{localDate(m.kickoff_utc)}</p>
                      <p className="text-xs font-mono font-semibold text-white/80">{localShortTime(m.kickoff_utc)}</p>
                      <p className="text-[9px] text-white/25 mt-0.5">{m.city}</p>
                    </div>

                    {/* Match */}
                    <div className="flex-1 flex items-center justify-center gap-2">
                      <span className="text-xs text-white/40 italic">TBD</span>
                      <span className="text-white/20 text-xs">vs</span>
                      <span className="text-xs text-white/40 italic">TBD</span>
                    </div>

                    {/* Match number + countdown */}
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-[9px] font-mono text-white/25">Match {m.match}</p>
                      {past
                        ? <p className="text-[10px] text-white/25">הסתיים</p>
                        : <CountdownBadge targetUtc={m.kickoff_utc} />}
                    </div>
                  </GlassCard>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function SchedulePage() {
  const [tab, setTab] = useState<'group' | 'knockout'>('group')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-shadow">לוח משחקים</h1>
        <p className="text-sm text-white/50 mt-1">כל 104 המשחקים — השעות מוצגות בשעון המקומי שלך</p>
      </div>

      <NextMatchHero />

      {/* Tabs */}
      <div className="flex gap-2">
        {([['group', 'שלב הבתים (72)'], ['knockout', 'נוקאאוט (32)']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2 rounded-xl text-sm font-medium transition-colors',
              tab === t ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'group'    && <GroupMatchesTab />}
      {tab === 'knockout' && <KnockoutTab />}
    </div>
  )
}
