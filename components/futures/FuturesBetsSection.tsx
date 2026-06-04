'use client'

import { TEAMS, getFlagEmoji, getTeamById } from '@/data/teams'
import GlassCard from '@/components/ui/GlassCard'
import type { FuturesState } from '@/types'
import { cn } from '@/lib/utils'

interface FuturesBetsSectionProps {
  futures: FuturesState
  onSet: <K extends keyof FuturesState>(field: K, value: FuturesState[K]) => void
  disabled?: boolean
}

interface TeamPickerProps {
  label: string
  hint: string
  points: number
  value: number | null
  onChange: (id: number | null) => void
  disabled?: boolean
}

function TeamPicker({ label, hint, points, value, onChange, disabled }: TeamPickerProps) {
  const selected = value ? getTeamById(value) : null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-white/40">{hint}</p>
        </div>
        <span className="text-xs text-indigo-300 font-bold">+{points} pts</span>
      </div>

      <div className="relative">
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
          disabled={disabled}
          className={cn(
            'glass-input appearance-none pr-8 cursor-pointer',
            value ? 'text-white' : 'text-white/60'
          )}
        >
          <option value="">— בחרו קבוצה —</option>
          {['A','B','C','D','E','F','G','H','I','J','K','L'].map((g) => (
            <optgroup key={g} label={`Group ${g}`}>
              {TEAMS.filter((t) => t.group_letter === g).map((t) => (
                <option key={t.id} value={t.id}>
                  {getFlagEmoji(t.flag_code)} {t.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {/* custom dropdown arrow */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">▼</span>
      </div>

      {selected && (
        <div className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
          <span className="text-base">{getFlagEmoji(selected.flag_code)}</span>
          <span className="text-sm font-medium text-white">{selected.name}</span>
          <span className="text-[10px] text-white/30 ml-auto">Group {selected.group_letter}</span>
          {!disabled && (
            <button
              onClick={() => onChange(null)}
              className="text-white/25 hover:text-red-400 text-xs transition-colors ml-1"
              title="Clear"
            >✕</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function FuturesBetsSection({ futures, onSet, disabled }: FuturesBetsSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">חלק 5 — ניחושים עתידיים</h2>
        <p className="text-sm text-white/50 mt-0.5">
          חמישה ניחושים על כל הטורניר — מחושבים בסיום.
        </p>
      </div>

      <GlassCard className="space-y-6">
        <TeamPicker
          label="אלוף גביע העולם"
          hint="איזו קבוצה תרים את הגביע ב-19 ביולי?"
          points={15}
          value={futures.champion_team_id}
          onChange={(id) => onSet('champion_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        <TeamPicker
          label="הקבוצה הכי שערנית"
          hint="איזו קבוצה תבקיע הכי הרבה שערים בטורניר?"
          points={8}
          value={futures.top_scorer_team_id}
          onChange={(id) => onSet('top_scorer_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        <TeamPicker
          label="קבוצת מלך השערים (עקב הזהב)"
          hint="הקבוצה שבה משחק הכדורגלן עם הכי הרבה שערים בטורניר"
          points={8}
          value={futures.golden_boot_team_id}
          onChange={(id) => onSet('golden_boot_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        <TeamPicker
          label="הקבוצה שתספוג הכי הרבה שערים"
          hint="מי תהיה הרשת הכי דלוחה של הטורניר?"
          points={10}
          value={futures.most_conceded_team_id}
          onChange={(id) => onSet('most_conceded_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        {/* Total goals — integer input */}
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
