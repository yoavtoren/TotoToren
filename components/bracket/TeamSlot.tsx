'use client'

import { getFlagEmoji, getTeamById } from '@/data/teams'
import { cn } from '@/lib/utils'

interface TeamSlotProps {
  teamId: number | null
  isWinner?: boolean
  isClickable?: boolean
  onClick?: () => void
  placeholder?: string
  size?: 'sm' | 'md'
}

export default function TeamSlot({
  teamId,
  isWinner,
  isClickable,
  onClick,
  placeholder = '?',
  size = 'md',
}: TeamSlotProps) {
  const team = teamId ? getTeamById(teamId) : null

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1.5 text-xs gap-1.5'
    : 'px-3 py-2 text-sm gap-2'

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'flex items-center w-full rounded-lg transition-all duration-150',
        sizeClasses,
        isWinner
          ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 glow-emerald'
          : team
          ? 'glass glass-hover'
          : 'glass opacity-50',
        isClickable && !isWinner && 'hover:ring-1 hover:ring-indigo-400 cursor-pointer',
        !isClickable && 'cursor-default'
      )}
    >
      {team ? (
        <>
          <span className={size === 'sm' ? 'text-base' : 'text-lg'}>{getFlagEmoji(team.flag_code)}</span>
          <span className="flex-1 font-medium truncate text-left">{team.name}</span>
          {isWinner && <span className="text-emerald-400 text-xs font-bold ml-1">★</span>}
        </>
      ) : (
        <span className="flex-1 text-white/30 italic text-center">{placeholder}</span>
      )}
    </button>
  )
}
