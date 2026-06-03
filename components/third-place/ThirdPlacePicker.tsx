'use client'

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import { getFlagEmoji, getTeamById } from '@/data/teams'
import { getThirdFromMatchNums, getThirdFromGroups } from '@/lib/bracket'
import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface ThirdPlacePickerProps {
  available3rdPlaceTeams: Record<string, number | null>
  assigned: Record<number, number | null>
  assignedIds: Set<number>
  onAssign: (r32MatchNum: number, teamId: number | null) => void
  disabled?: boolean
}

const THIRD_FROM_MATCHES = getThirdFromMatchNums()

// ── Draggable team chip ───────────────────────────────────────
function DraggableTeam({ teamId, group, isAssigned, disabled }: {
  teamId: number; group: string; isAssigned: boolean; disabled?: boolean
}) {
  const team = getTeamById(teamId)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `team-${teamId}`,
    disabled: disabled || isAssigned,
    data: { teamId },
  })
  if (!team) return null
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all select-none',
        isDragging ? 'opacity-30' : '',
        isAssigned ? 'glass opacity-40 cursor-not-allowed' : 'glass glass-hover cursor-grab active:cursor-grabbing',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span className="text-xs text-white/40 w-4 font-mono">{group}</span>
      <span className="text-base">{getFlagEmoji(team.flag_code)}</span>
      <span className="text-sm font-medium text-white flex-1">{team.name}</span>
      {isAssigned && <span className="text-xs text-emerald-400">✓</span>}
      {!isAssigned && !disabled && <span className="text-white/20 text-xs">⠿</span>}
    </div>
  )
}

// ── Droppable slot ────────────────────────────────────────────
function DroppableSlot({ matchNum, assignedTeamId, eligibleGroups, onRemove, disabled }: {
  matchNum: number; assignedTeamId: number | null
  eligibleGroups: string[]; onRemove: () => void; disabled?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${matchNum}` })
  const team = assignedTeamId ? getTeamById(assignedTeamId) : null

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all border',
        isOver && !team
          ? 'border-indigo-400 bg-indigo-500/20'
          : team
          ? 'glass border-emerald-400/30 bg-emerald-500/10'
          : 'glass border-white/10'
      )}
    >
      <span className="text-[10px] font-mono text-white/40 w-10 shrink-0">M{matchNum}</span>

      {team ? (
        <>
          <span className="text-base">{getFlagEmoji(team.flag_code)}</span>
          <span className="text-sm font-medium text-white flex-1">{team.name}</span>
          {!disabled && (
            <button onClick={onRemove} className="text-white/30 hover:text-red-400 text-xs px-1 transition-colors">
              ✕
            </button>
          )}
        </>
      ) : (
        <>
          <span className={cn('text-sm flex-1 italic', isOver ? 'text-indigo-300' : 'text-white/25')}>
            {isOver ? 'drop here' : '— empty —'}
          </span>
          <span className="text-[10px] text-white/20 shrink-0">
            from: {eligibleGroups.join(', ')}
          </span>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function ThirdPlacePicker({
  available3rdPlaceTeams, assigned, assignedIds, onAssign, disabled,
}: ThirdPlacePickerProps) {
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,  { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const availableEntries = Object.entries(available3rdPlaceTeams)
    .filter(([, id]) => id !== null)
    .map(([group, id]) => ({ group, teamId: id as number }))

  const handleDragStart = (e: DragStartEvent) => {
    setActiveTeamId((e.active.data.current as { teamId: number })?.teamId ?? null)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTeamId(null)
    const { active, over } = e
    if (!over) return
    const teamId = (active.data.current as { teamId: number })?.teamId
    const slotMatch = String(over.id).match(/^slot-(\d+)$/)
    if (!teamId || !slotMatch) return
    const matchNum = parseInt(slotMatch[1])
    if (!assigned[matchNum]) onAssign(matchNum, teamId)
  }

  const activeTeam = activeTeamId ? getTeamById(activeTeamId) : null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">Part 3 — Best 8 Third-Place Teams</h2>
        <p className="text-sm text-white/50 mt-0.5">
          Drag a team from the right into a slot on the left. Each slot shows which groups are eligible.
          Pick 8 of the 12 predicted 3rd-place teams.
        </p>
      </div>

      {/* Rules box */}
      <GlassCard className="space-y-3 py-3">
        <p className="font-semibold text-white/80 text-xs uppercase tracking-wider">How the 8 best 3rd-place teams work</p>

        <div className="text-sm text-white/60 space-y-1.5">
          <p>
            Each of the 12 groups (A–L) finishes with a team ranked <strong className="text-white">3rd out of 4</strong>.
            That gives us 12 third-place teams total.
          </p>
          <p>
            These 12 teams are ranked against each other and only the{' '}
            <strong className="text-white">top 8</strong> advance to the Round of 32 —
            the bottom 4 go home.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Ranking criteria (in order)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-white/60">
            {[
              ['1', 'Points earned in group stage'],
              ['2', 'Goal difference'],
              ['3', 'Goals scored'],
              ['4', 'Fair-play (conduct) score'],
              ['5', 'FIFA world ranking'],
            ].map(([n, rule]) => (
              <div key={n} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
                <span className="text-indigo-400 font-bold w-3">{n}.</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40 border-t border-white/10 pt-2">
          In this game: predict which 8 of the 12 thirds you think will qualify, then drag each into one of the 8 R32 slots below.
        </p>
      </GlassCard>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: droppable slots */}
          <GlassCard className="space-y-2">
            <h3 className="text-sm font-semibold text-white/70 mb-2">
              R32 slots ({assignedIds.size}/8 filled)
            </h3>
            {THIRD_FROM_MATCHES.map((matchNum) => {
              const eligibleGroups = getThirdFromGroups(matchNum, 'away') ?? getThirdFromGroups(matchNum, 'home') ?? []
              return (
                <DroppableSlot
                  key={matchNum}
                  matchNum={matchNum}
                  assignedTeamId={assigned[matchNum] ?? null}
                  eligibleGroups={eligibleGroups}
                  onRemove={() => onAssign(matchNum, null)}
                  disabled={disabled}
                />
              )
            })}
          </GlassCard>

          {/* Right: draggable teams */}
          <GlassCard className="space-y-2">
            <h3 className="text-sm font-semibold text-white/70 mb-1">
              3rd-place teams — drag into a slot
            </h3>
            {availableEntries.length === 0 ? (
              <p className="text-sm text-white/30 italic text-center py-6">
                Rank your groups in Part 2 first.
              </p>
            ) : (
              <div className="space-y-1.5">
                {availableEntries.map(({ group, teamId }) => (
                  <DraggableTeam
                    key={teamId}
                    teamId={teamId}
                    group={group}
                    isAssigned={assignedIds.has(teamId)}
                    disabled={disabled}
                  />
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Drag overlay — shows the team chip while dragging */}
        <DragOverlay>
          {activeTeam && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl glass-dark shadow-2xl opacity-95 pointer-events-none">
              <span className="text-base">{getFlagEmoji(activeTeam.flag_code)}</span>
              <span className="text-sm font-medium text-white">{activeTeam.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
