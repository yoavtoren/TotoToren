'use client'

import { useState } from 'react'
import { getFlagEmoji, getTeamById } from '@/data/teams'
import { getThirdFromMatchNums, getThirdFromGroups } from '@/lib/bracket'
import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface ThirdPlacePickerProps {
  available3rdPlaceTeams: Record<string, number | null>  // groupLetter → teamId
  assigned: Record<number, number | null>                // r32MatchNum → teamId
  assignedIds: Set<number>
  onAssign: (r32MatchNum: number, teamId: number | null) => void
  disabled?: boolean
}

const THIRD_FROM_MATCHES = getThirdFromMatchNums()

export default function ThirdPlacePicker({
  available3rdPlaceTeams, assigned, assignedIds, onAssign, disabled,
}: ThirdPlacePickerProps) {
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null)

  const availableEntries = Object.entries(available3rdPlaceTeams)
    .filter(([, id]) => id !== null)
    .map(([group, id]) => ({ group, teamId: id as number }))

  const handleTeamClick = (teamId: number) => {
    if (!selectedMatch || disabled || assignedIds.has(teamId)) return
    onAssign(selectedMatch, teamId)
    setSelectedMatch(null)
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">Part 3 — Best 8 Third-Place Teams</h2>
        <p className="text-sm text-white/50 mt-0.5">
          Select an R32 slot, then click a 3rd-place team to assign them. Pick 8 of the 12.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: 8 R32 third-from slots */}
        <GlassCard className="space-y-2">
          <h3 className="text-sm font-semibold text-white/70 mb-2">Round of 32 — 3rd-place slots</h3>
          {THIRD_FROM_MATCHES.map((matchNum) => {
            const assignedId = assigned[matchNum]
            const team = assignedId ? getTeamById(assignedId) : null
            const isSelected = selectedMatch === matchNum
            const eligibleGroups = getThirdFromGroups(matchNum, 'away') ?? getThirdFromGroups(matchNum, 'home') ?? []

            return (
              <button
                key={matchNum}
                onClick={() => team ? onAssign(matchNum, null) : setSelectedMatch(isSelected ? null : matchNum)}
                disabled={disabled}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left',
                  isSelected
                    ? 'glass ring-2 ring-indigo-400 bg-indigo-500/20'
                    : 'glass glass-hover'
                )}
              >
                <span className="text-[10px] font-mono text-white/40 w-10">M{matchNum}</span>
                <span className="text-[10px] text-white/20">[{eligibleGroups.join(',')}]</span>
                {team ? (
                  <>
                    <span className="text-base">{getFlagEmoji(team.flag_code)}</span>
                    <span className="text-sm font-medium text-white flex-1">{team.name}</span>
                    {!disabled && <span className="text-xs text-white/30">✕</span>}
                  </>
                ) : (
                  <span className={cn('text-sm flex-1', isSelected ? 'text-indigo-300' : 'text-white/30 italic')}>
                    {isSelected ? '← pick a team →' : '— empty —'}
                  </span>
                )}
              </button>
            )
          })}
        </GlassCard>

        {/* Right: available 3rd-place teams */}
        <GlassCard className="space-y-2">
          <h3 className="text-sm font-semibold text-white/70 mb-1">
            3rd-place teams ({availableEntries.length - assignedIds.size} available)
          </h3>

          {availableEntries.length === 0 && (
            <p className="text-sm text-white/30 text-center py-6">
              Rank your groups in Part 2 to see the 3rd-place teams.
            </p>
          )}

          {!selectedMatch && !disabled && availableEntries.length > 0 && (
            <p className="text-xs text-white/30 bg-white/5 rounded-lg px-3 py-2">
              Select an empty slot on the left first.
            </p>
          )}

          {selectedMatch && (
            <p className="text-xs text-indigo-300 bg-indigo-500/10 rounded-lg px-3 py-2">
              Assigning to <strong>M{selectedMatch}</strong> — click a team below
            </p>
          )}

          <div className="space-y-1.5 mt-2">
            {availableEntries.map(({ group, teamId }) => {
              const team = getTeamById(teamId)
              if (!team) return null
              const isAssigned = assignedIds.has(teamId)
              return (
                <button
                  key={teamId}
                  onClick={() => handleTeamClick(teamId)}
                  disabled={disabled || isAssigned || !selectedMatch}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left',
                    isAssigned
                      ? 'glass opacity-40 cursor-not-allowed'
                      : selectedMatch
                      ? 'glass glass-hover cursor-pointer hover:ring-1 hover:ring-indigo-400'
                      : 'glass opacity-60 cursor-not-allowed'
                  )}
                >
                  <span className="text-xs text-white/40 w-4 font-mono">{group}</span>
                  <span className="text-base">{getFlagEmoji(team.flag_code)}</span>
                  <span className="text-sm font-medium text-white flex-1">{team.name}</span>
                  {isAssigned && <span className="text-xs text-emerald-400 font-semibold">✓</span>}
                </button>
              )
            })}
          </div>
        </GlassCard>
      </div>
    </section>
  )
}
