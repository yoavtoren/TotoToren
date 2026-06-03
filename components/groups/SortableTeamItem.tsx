'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getFlagEmoji, getTeamById } from '@/data/teams'
import { cn } from '@/lib/utils'

interface SortableTeamItemProps {
  teamId: number
  position: number
  disabled?: boolean
}

const POSITION_BADGES = ['🥇', '🥈', '🥉', '4️⃣']

export default function SortableTeamItem({ teamId, position, disabled }: SortableTeamItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: teamId,
    disabled,
  })

  const team = getTeamById(teamId)
  if (!team) return null

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
        isDragging ? 'glass-dark opacity-80 scale-[1.02] z-50 shadow-2xl' : 'glass glass-hover',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
      {...attributes}
      {...listeners}
    >
      <span className="text-lg w-6 text-center">{POSITION_BADGES[position]}</span>
      <span className="text-lg">{getFlagEmoji(team.flag_code)}</span>
      <span className="flex-1 text-sm font-medium text-white truncate">{team.name}</span>
      {!disabled && (
        <span className="text-white/30 text-xs select-none">⠿</span>
      )}
    </div>
  )
}
