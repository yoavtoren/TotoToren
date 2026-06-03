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
            !value && 'text-white/30'
          )}
        >
          <option value="">— select a team —</option>
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
        </div>
      )}
    </div>
  )
}

export default function FuturesBetsSection({ futures, onSet, disabled }: FuturesBetsSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">Part 5 — Tournament Futures</h2>
        <p className="text-sm text-white/50 mt-0.5">
          Five tournament-long predictions scored once at the end.
        </p>
      </div>

      <GlassCard className="space-y-6">
        <TeamPicker
          label="World Cup Champion"
          hint="Which team lifts the trophy on July 19?"
          points={15}
          value={futures.champion_team_id}
          onChange={(id) => onSet('champion_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        <TeamPicker
          label="Top-Scoring Team"
          hint="Which team scores the most goals in the tournament?"
          points={8}
          value={futures.top_scorer_team_id}
          onChange={(id) => onSet('top_scorer_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        <TeamPicker
          label="Golden Boot Team"
          hint="The team the tournament's top scorer plays for"
          points={8}
          value={futures.golden_boot_team_id}
          onChange={(id) => onSet('golden_boot_team_id', id)}
          disabled={disabled}
        />

        <div className="h-px bg-white/10" />

        <TeamPicker
          label="Most Goals Conceded"
          hint="Which team lets in the most goals?"
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
              <p className="text-sm font-semibold text-white">Total Goals in Tournament</p>
              <p className="text-xs text-white/40">How many goals will be scored across all 104 matches? (Hint: 140–180)</p>
            </div>
            <span className="text-xs text-indigo-300 font-bold">+12 pts</span>
          </div>
          <input
            type="number"
            min="0"
            max="500"
            value={futures.total_goals_prediction}
            onChange={(e) => onSet('total_goals_prediction', e.target.value)}
            disabled={disabled}
            placeholder="e.g. 156"
            className="glass-input"
          />
        </div>
      </GlassCard>
    </section>
  )
}
