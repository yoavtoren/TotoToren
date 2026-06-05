'use client'

import { useState } from 'react'
import { TEAMS, getFlagEmoji, getTeamById } from '@/data/teams'
import GlassCard from '@/components/ui/GlassCard'
import type { FuturesState } from '@/types'
import { cn } from '@/lib/utils'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'] as const

interface FuturesBetsSectionProps {
  futures: FuturesState
  onSet: <K extends keyof FuturesState>(field: K, value: FuturesState[K]) => void
  disabled?: boolean
  bracketChampionId?: number | null
}

// ── Centered modal team picker ─────────────────────────────────────────────────
interface TeamPickerProps {
  label: string
  hint: string
  points: number
  value: number | null
  onChange: (id: number | null) => void
  disabled?: boolean
}

function TeamPicker({ label, hint, points, value, onChange, disabled }: TeamPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = value ? getTeamById(value) : null

  const filtered = TEAMS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  function pick(id: number) {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-white/40">{hint}</p>
        </div>
        <span className="text-xs text-indigo-300 font-bold">+{points} pts</span>
      </div>

      {/* Trigger button */}
      <button
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={cn(
          'glass-input w-full text-right flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        {selected ? (
          <>
            <span className="text-base shrink-0">{getFlagEmoji(selected.flag_code)}</span>
            <span className="flex-1 text-white font-medium">{selected.name}</span>
            <span className="text-[10px] text-white/30">Group {selected.group_letter}</span>
            {!disabled && (
              <span
                role="button"
                onClick={e => { e.stopPropagation(); onChange(null) }}
                className="text-white/25 hover:text-red-400 text-xs transition-colors ml-1"
              >✕</span>
            )}
          </>
        ) : (
          <span className="text-white/40 flex-1">— בחרו נבחרת —</span>
        )}
        {!selected && <span className="text-white/30 text-xs">▼</span>}
      </button>

      {/* Centered modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setOpen(false); setSearch('') }}
        >
          <div
            className="glass rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-4 pt-4 pb-2 border-b border-white/10">
              <p className="text-sm font-semibold text-white mb-2">{label}</p>
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חיפוש נבחרת..."
                className="glass-input py-2 text-sm w-full"
              />
            </div>
            <div className="overflow-y-auto flex-1 py-1">
              {GROUPS.map(g => {
                const groupTeams = filtered.filter(t => t.group_letter === g)
                if (!groupTeams.length) return null
                return (
                  <div key={g}>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider px-4 pt-2 pb-1">
                      Group {g}
                    </p>
                    {groupTeams.map(t => (
                      <button
                        key={t.id}
                        onClick={() => pick(t.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 transition-colors text-left',
                          value === t.id && 'bg-indigo-500/20',
                        )}
                      >
                        <span className="text-lg shrink-0">{getFlagEmoji(t.flag_code)}</span>
                        <span className={cn('text-sm flex-1', value === t.id ? 'text-indigo-200 font-semibold' : 'text-white/80')}>
                          {t.name}
                        </span>
                        {value === t.id && <span className="text-indigo-400 text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Champion display (derived from bracket) ────────────────────────────────────
function ChampionFromBracket({ teamId }: { teamId: number | null }) {
  const team = teamId ? getTeamById(teamId) : null
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">הנבחרת הזוכה</p>
          <p className="text-xs text-white/40">נקבע לפי הנבחרת שבחרת לנצח בגמר בחלק 4</p>
        </div>
        <span className="text-xs text-indigo-300 font-bold">+15 pts</span>
      </div>
      <div className={cn(
        'glass-input flex items-center gap-2',
        team ? 'border-yellow-400/30' : 'border-white/10 opacity-60',
      )}>
        {team ? (
          <>
            <span className="text-2xl shrink-0">{getFlagEmoji(team.flag_code)}</span>
            <span className="flex-1 text-white font-semibold">{team.name}</span>
            <span className="text-yellow-400 text-sm">🏆</span>
          </>
        ) : (
          <span className="text-white/30 text-sm flex-1">בחר אלוף בסבב הנוקאאוט ← חלק 4</span>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FuturesBetsSection({ futures, onSet, disabled, bracketChampionId }: FuturesBetsSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">חלק 5 — ניחושים עתידיים</h2>
        <p className="text-sm text-white/50 mt-0.5">
          חמישה ניחושים על כל הטורניר — מחושבים בסיום.
        </p>
      </div>

      <GlassCard className="space-y-6">
        <ChampionFromBracket teamId={bracketChampionId ?? null} />

        <div className="h-px bg-white/10" />

        <TeamPicker
          label="הנבחרת שכבשה הכי הרבה"
          hint="איזו נבחרת תבקיע הכי הרבה שערים בטורניר?"
          points={8}
          value={futures.top_scorer_team_id}
          onChange={(id) => onSet('top_scorer_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        <TeamPicker
          label="נעל הזהב (הנבחרת שממנה הכובש הגיע)"
          hint="הנבחרת שבה משחק הכדורגלן עם הכי הרבה שערים בטורניר"
          points={8}
          value={futures.golden_boot_team_id}
          onChange={(id) => onSet('golden_boot_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        <TeamPicker
          label="הנבחרת שספגה הכי הרבה שערים"
          hint="מי תהיה הרשת הכי דלוחה של הטורניר?"
          points={10}
          value={futures.most_conceded_team_id}
          onChange={(id) => onSet('most_conceded_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">כמה שערים יהיו בכל הטורניר?</p>
              <p className="text-xs text-white/40">סך כל השערים ב-104 המשחקים (טיפ: בדרך כלל 140–180)</p>
            </div>
            <span className="text-xs text-indigo-300 font-bold">+12 pts</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="500"
              value={futures.total_goals_prediction}
              onChange={(e) => onSet('total_goals_prediction', e.target.value)}
              disabled={disabled}
              placeholder="e.g. 156"
              className="glass-input pr-8"
            />
            {futures.total_goals_prediction && !disabled && (
              <button
                onClick={() => onSet('total_goals_prediction', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-red-400 text-xs transition-colors"
              >✕</button>
            )}
          </div>
        </div>
      </GlassCard>
    </section>
  )
}
