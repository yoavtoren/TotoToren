'use client'

import { useState } from 'react'
import TeamSlot from './TeamSlot'
import { cn } from '@/lib/utils'

interface BracketMatchupProps {
  matchNum: number
  homeTeamId: number | null
  awayTeamId: number | null
  predictedWinnerId: number | null
  homeScore: string
  awayScore: string
  onPickWinner: (teamId: number) => void
  onScoreChange: (side: 'home' | 'away', value: string) => void
  disabled?: boolean
  showScore?: boolean
  size?: 'sm' | 'md'
}

export default function BracketMatchup({
  matchNum,
  homeTeamId,
  awayTeamId,
  predictedWinnerId,
  homeScore,
  awayScore,
  onPickWinner,
  onScoreChange,
  disabled,
  showScore = true,
  size = 'md',
}: BracketMatchupProps) {
  const [expanded, setExpanded] = useState(false)
  const canPick = !disabled && homeTeamId !== null && awayTeamId !== null

  return (
    <div className={cn('glass rounded-xl overflow-hidden', size === 'sm' ? 'text-xs' : 'text-sm')}>
      {/* Slot label */}
      <div className="px-3 py-1 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <span className="text-[10px] font-mono text-white/30">M{matchNum}</span>
        {canPick && showScore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
          >
            {expanded ? 'hide score' : 'add score'}
          </button>
        )}
      </div>

      {/* Teams */}
      <div className="p-2 space-y-1.5">
        <TeamSlot
          teamId={homeTeamId}
          isWinner={predictedWinnerId === homeTeamId && homeTeamId !== null}
          isClickable={canPick && homeTeamId !== null}
          onClick={() => homeTeamId && onPickWinner(homeTeamId)}
          placeholder="TBD"
          size={size}
        />

        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[9px] text-white/20 font-bold">VS</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <TeamSlot
          teamId={awayTeamId}
          isWinner={predictedWinnerId === awayTeamId && awayTeamId !== null}
          isClickable={canPick && awayTeamId !== null}
          onClick={() => awayTeamId && onPickWinner(awayTeamId)}
          placeholder="TBD"
          size={size}
        />
      </div>

      {/* Score prediction (optional, expandable) */}
      {showScore && expanded && (
        <div className="px-3 pb-3 space-y-1">
          <p className="text-[10px] text-white/30 text-center">Predict exact score (+3 pts)</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="20"
              value={homeScore}
              onChange={(e) => onScoreChange('home', e.target.value)}
              placeholder="0"
              className="glass-input text-center w-full py-1.5 text-sm"
            />
            <span className="text-white/40 font-bold">:</span>
            <input
              type="number"
              min="0"
              max="20"
              value={awayScore}
              onChange={(e) => onScoreChange('away', e.target.value)}
              placeholder="0"
              className="glass-input text-center w-full py-1.5 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
