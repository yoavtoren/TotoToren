'use client'

import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import SortableTeamItem from './SortableTeamItem'
import GlassCard from '@/components/ui/GlassCard'

interface GroupCardProps {
  groupLetter: string
  teamIds: number[]
  onReorder: (groupLetter: string, newOrder: number[]) => void
  disabled?: boolean
}

export default function GroupCard({ groupLetter, teamIds, onReorder, disabled }: GroupCardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = teamIds.indexOf(active.id as number)
    const newIndex = teamIds.indexOf(over.id as number)
    onReorder(groupLetter, arrayMove(teamIds, oldIndex, newIndex))
  }

  return (
    <GlassCard className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-sm text-white/80 uppercase tracking-wider">
          בית {groupLetter}
        </h3>
        {!disabled && (
          <span className="text-[10px] text-white/30">גרור לסידור</span>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={teamIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {teamIds.map((teamId, index) => (
              <SortableTeamItem
                key={teamId}
                teamId={teamId}
                position={index}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </GlassCard>
  )
}
