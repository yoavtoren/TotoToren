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

// Reverse map: group letter → list of slot match numbers that accept it
const GROUP_TO_SLOTS: Record<string, number[]> = {}
for (const matchNum of THIRD_FROM_MATCHES) {
  const groups = getThirdFromGroups(matchNum, 'away') ?? getThirdFromGroups(matchNum, 'home') ?? []
  for (const g of groups) {
    if (!GROUP_TO_SLOTS[g]) GROUP_TO_SLOTS[g] = []
    GROUP_TO_SLOTS[g].push(matchNum)
  }
}

// ── Draggable team chip ───────────────────────────────────────
function DraggableTeam({ teamId, group, isAssigned, disabled, isDimmed }: {
  teamId: number; group: string; isAssigned: boolean; disabled?: boolean; isDimmed?: boolean
}) {
  const team = getTeamById(teamId)
  const eligibleSlots = GROUP_TO_SLOTS[group] ?? []
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `team-${teamId}`,
    disabled: disabled || isAssigned,
    data: { teamId, group },
  })
  if (!team) return null

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'px-3 py-2.5 rounded-xl transition-all select-none space-y-1',
        isDragging ? 'opacity-20' : '',
        isAssigned
          ? 'glass opacity-35 cursor-not-allowed'
          : isDimmed
          ? 'glass opacity-40 cursor-not-allowed'
          : 'glass glass-hover cursor-grab active:cursor-grabbing',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-indigo-300/70 bg-indigo-500/15 px-1.5 py-0.5 rounded font-mono shrink-0">
          בית {group}
        </span>
        <span className="text-base leading-none">{getFlagEmoji(team.flag_code)}</span>
        <span className="text-sm font-medium text-white flex-1 truncate">{team.name}</span>
        {isAssigned
          ? <span className="text-xs text-emerald-400 shrink-0">✓</span>
          : !disabled && <span className="text-white/20 text-xs shrink-0">⠿</span>
        }
      </div>

      {/* Possible slots */}
      {!isAssigned && eligibleSlots.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pr-1">
          <span className="text-[9px] text-white/25">מיקומים:</span>
          {eligibleSlots.map(n => (
            <span
              key={n}
              className="text-[9px] font-mono text-indigo-300/50 bg-indigo-500/10 px-1.5 py-0.5 rounded"
            >
              M{n}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Droppable slot ────────────────────────────────────────────
function DroppableSlot({
  matchNum, assignedTeamId, eligibleGroups, available3rdPlaceTeams,
  activeGroup, onRemove, disabled,
}: {
  matchNum: number
  assignedTeamId: number | null
  eligibleGroups: string[]
  available3rdPlaceTeams: Record<string, number | null>
  activeGroup: string | null
  onRemove: () => void
  disabled?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${matchNum}` })
  const team = assignedTeamId ? getTeamById(assignedTeamId) : null

  const isDragActive = activeGroup !== null
  const isEligible = isDragActive ? eligibleGroups.includes(activeGroup) : null

  // Teams user has predicted 3rd in eligible groups (possible candidates for this slot)
  const possibleTeams = eligibleGroups
    .filter(g => available3rdPlaceTeams[g] != null)
    .map(g => ({ group: g, teamId: available3rdPlaceTeams[g]! }))

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl px-3 py-2.5 transition-all border',
        team
          ? 'glass border-emerald-400/30 bg-emerald-500/10'
          : isDragActive && isEligible === false
            ? 'border-red-500/25 bg-red-500/5 opacity-40'
            : isOver && isEligible
              ? 'border-indigo-400 bg-indigo-500/25'
              : isDragActive && isEligible
                ? 'border-indigo-400/50 bg-indigo-500/10'
                : 'glass border-white/10',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Match number badge */}
        <span className="text-[10px] font-mono text-white/35 w-10 shrink-0 pt-0.5">M{matchNum}</span>

        {team ? (
          /* Filled state */
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base leading-none">{getFlagEmoji(team.flag_code)}</span>
            <span className="text-sm font-medium text-white flex-1 truncate">{team.name}</span>
            {!disabled && (
              <button onClick={onRemove} className="text-white/25 hover:text-red-400 text-xs px-1 transition-colors shrink-0">✕</button>
            )}
          </div>
        ) : isDragActive && isEligible === false ? (
          /* Ineligible drop target */
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-xs text-red-400/60">✕</span>
            <span className="text-xs text-red-400/60 italic">בית {activeGroup} לא מאושר כאן</span>
          </div>
        ) : isOver && isEligible ? (
          /* Hover + eligible */
          <span className="text-sm text-indigo-300 italic flex-1">שחרר כאן ↓</span>
        ) : (
          /* Empty state: show eligible groups + possible teams */
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Eligible groups row */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[9px] text-white/25 shrink-0">בתים:</span>
              {eligibleGroups.map(g => {
                const hasPrediction = available3rdPlaceTeams[g] != null
                return (
                  <span
                    key={g}
                    className={cn(
                      'text-[9px] font-mono px-1.5 py-0.5 rounded font-bold',
                      hasPrediction
                        ? 'bg-indigo-500/20 text-indigo-300/80'
                        : 'bg-white/5 text-white/25',
                    )}
                  >
                    {g}
                  </span>
                )
              })}
            </div>

            {/* Possible teams from predicted standings */}
            {possibleTeams.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                {possibleTeams.map(({ group, teamId }) => {
                  const t = getTeamById(teamId)
                  if (!t) return null
                  return (
                    <span key={group} className="flex items-center gap-1 text-[10px] text-white/40">
                      <span className="text-[10px] text-indigo-300/50 font-mono">({group})</span>
                      <span className="text-sm leading-none">{getFlagEmoji(t.flag_code)}</span>
                      <span>{t.name}</span>
                    </span>
                  )
                })}
              </div>
            ) : (
              <span className="text-[10px] text-white/20 italic">— גרור קבוצה מהבתים המתאימים —</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function ThirdPlacePicker({
  available3rdPlaceTeams, assigned, assignedIds, onAssign, disabled,
}: ThirdPlacePickerProps) {
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,  { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const availableEntries = Object.entries(available3rdPlaceTeams)
    .filter(([, id]) => id !== null)
    .map(([group, id]) => ({ group, teamId: id as number }))

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { teamId: number; group: string } | undefined
    setActiveTeamId(data?.teamId ?? null)
    setActiveGroup(data?.group ?? null)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTeamId(null)
    setActiveGroup(null)
    const { active, over } = e
    if (!over) return
    const data = active.data.current as { teamId: number; group: string } | undefined
    if (!data) return
    const { teamId, group } = data
    const slotMatch = String(over.id).match(/^slot-(\d+)$/)
    if (!slotMatch) return
    const matchNum = parseInt(slotMatch[1])
    if (assigned[matchNum]) return  // slot already filled

    // Enforce eligibility: reject drop if team's group is not allowed in this slot
    const eligibleGroups = getThirdFromGroups(matchNum, 'away') ?? getThirdFromGroups(matchNum, 'home') ?? []
    if (!eligibleGroups.includes(group)) return

    onAssign(matchNum, teamId)
  }

  const activeTeam = activeTeamId ? getTeamById(activeTeamId) : null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">חלק 3 — 8 הקבוצות הטובות במקום השלישי</h2>
        <p className="text-sm text-white/50 mt-0.5">
          גררו קבוצה מהצד הימני לאחד המיקומים. בחרו 8 מתוך 12 קבוצות שניחשתם שיעברו.
        </p>
      </div>

      {/* Rules box */}
      <GlassCard className="space-y-4 py-3">
        <p className="font-semibold text-white/80 text-xs uppercase tracking-wider">איך עובדות 8 הקבוצות הטובות במקום שלישי?</p>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">שלב 1 — אילו 8 מתוך 12 עוברות?</p>
          <p className="text-sm text-white/60">כל בית מייצר קבוצה אחת שסיימה במקום שלישי — 12 בסך הכל. הן מדורגות ביניהן לפי:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-white/60">
            {[['1','נקודות בשלב הבתים'],['2','הפרש שערים'],['3','שערים שבוקעו'],['4','ציון הגינות (כרטיסים)'],['5','דירוג FIFA']].map(([n, rule]) => (
              <div key={n} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
                <span className="text-indigo-400 font-bold w-3">{n}.</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40">8 הקבוצות <strong className="text-white/70">הטובות ביותר</strong> עוברות. 4 נשארות בבית.</p>
        </div>

        <div className="space-y-2 border-t border-white/10 pt-3">
          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">שלב 2 — לאיזה מיקום בסבב 32 הן נכנסות?</p>
          <p className="text-sm text-white/60">
            המיקום בסבב 32 <strong className="text-white">לא קשור לנקודות</strong> — נקבע לפי
            <strong className="text-white"> מאיזה בית הקבוצה הגיעה</strong>.
            FIFA קובעת מראש איזה בית ממלא איזה מיקום.
          </p>
          <div className="glass rounded-xl px-4 py-3 text-sm text-white/70 space-y-1">
            <p className="font-semibold text-white">לדוגמה:</p>
            <p>מיקום M75 מציין <span className="text-indigo-300 font-mono">בתים: A, B, C, D, F</span></p>
            <p>← רק קבוצה שלישית מאחד הבתים הללו יכולה להיכנס למיקום זה.</p>
            <p>← גרירה למיקום לא מתאים <strong className="text-red-300">תחסם אוטומטית</strong>.</p>
          </div>
        </div>
      </GlassCard>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div dir="ltr" className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left: droppable slots */}
          <GlassCard className="space-y-2">
            <h3 className="text-sm font-semibold text-white/70 mb-2">
              מיקומי שלב 32 ({assignedIds.size}/8 מלאים)
            </h3>
            {THIRD_FROM_MATCHES.map((matchNum) => {
              const eligibleGroups =
                getThirdFromGroups(matchNum, 'away') ?? getThirdFromGroups(matchNum, 'home') ?? []
              return (
                <DroppableSlot
                  key={matchNum}
                  matchNum={matchNum}
                  assignedTeamId={assigned[matchNum] ?? null}
                  eligibleGroups={eligibleGroups}
                  available3rdPlaceTeams={available3rdPlaceTeams}
                  activeGroup={activeGroup}
                  onRemove={() => onAssign(matchNum, null)}
                  disabled={disabled}
                />
              )
            })}
          </GlassCard>

          {/* Right: draggable teams */}
          <GlassCard className="space-y-2">
            <h3 className="text-sm font-semibold text-white/70 mb-1">
              קבוצות שלישיות — גררו למיקום
            </h3>
            {availableEntries.length === 0 ? (
              <p className="text-sm text-white/30 italic text-center py-6">
                דרגו את הבתים בחלק 2 תחילה.
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
                    isDimmed={
                      // Dim teams whose group can't go anywhere useful while dragging another
                      activeGroup !== null && activeTeamId !== teamId
                        ? false  // don't dim siblings during drag — only slots are dimmed
                        : false
                    }
                  />
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTeam && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl glass-dark shadow-2xl opacity-95 pointer-events-none ring-1 ring-indigo-400/40">
              <span className="text-[10px] font-bold text-indigo-300/80 bg-indigo-500/20 px-1.5 py-0.5 rounded font-mono">
                בית {activeGroup}
              </span>
              <span className="text-base leading-none">{getFlagEmoji(activeTeam.flag_code)}</span>
              <span className="text-sm font-medium text-white">{activeTeam.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
