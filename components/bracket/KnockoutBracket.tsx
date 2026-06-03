'use client'

import { useState } from 'react'
import { BRACKET_BY_ROUND } from '@/data/bracket-slots'
import { resolveMatchTeam } from '@/lib/bracket'
import { getFlagEmoji, getTeamById } from '@/data/teams'
import { cn } from '@/lib/utils'
import type { GroupOrder, BracketWinners, ThirdPlaceState, KnockoutScores } from '@/types'

interface KnockoutBracketProps {
  groupOrder: GroupOrder
  thirdPlace: ThirdPlaceState
  bracketWinners: BracketWinners
  knockoutScores: KnockoutScores
  onPickWinner: (matchNum: number, teamId: number) => void
  onScoreChange: (matchNum: number, side: 'home' | 'away', value: string) => void
  disabled?: boolean
}

// ── Compact match card ────────────────────────────────────────
function MatchCard({
  matchNum, homeId, awayId, winnerId, homeScore, awayScore,
  onPickWinner, onScoreChange, disabled, showScoreToggle = true,
}: {
  matchNum: number
  homeId: number | null; awayId: number | null; winnerId: number | null
  homeScore: string; awayScore: string
  onPickWinner: (id: number) => void
  onScoreChange: (side: 'home' | 'away', val: string) => void
  disabled?: boolean; showScoreToggle?: boolean
}) {
  const [scoreOpen, setScoreOpen] = useState(false)
  const canPick = !disabled && homeId !== null && awayId !== null

  const TeamRow = ({ teamId, side }: { teamId: number | null; side: 'home' | 'away' }) => {
    const team = teamId ? getTeamById(teamId) : null
    const isWinner = winnerId !== null && winnerId === teamId && teamId !== null
    // clicking selected winner deselects it
    const handleClick = () => {
      if (!teamId || !canPick) return
      if (isWinner) onPickWinner(-1) // -1 signals deselect
      else onPickWinner(teamId)
    }
    return (
      <button
        onClick={handleClick}
        disabled={!canPick || !teamId}
        className={cn(
          'flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-left transition-all text-xs',
          isWinner
            ? 'bg-emerald-500/25 text-emerald-100 font-semibold'
            : team && canPick
            ? 'hover:bg-white/10 text-white/80 cursor-pointer'
            : 'text-white/30 cursor-default'
        )}
      >
        {team ? (
          <>
            <span className="text-sm leading-none">{getFlagEmoji(team.flag_code)}</span>
            <span className="flex-1 truncate leading-none">{team.name}</span>
            {isWinner && <span className="text-emerald-400 text-[10px]" title="Click to deselect">★ ✕</span>}
          </>
        ) : (
          <span className="italic text-white/20">TBD</span>
        )}
      </button>
    )
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Match label */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-white/5 border-b border-white/10">
        <span className="text-[9px] font-mono text-white/25">M{matchNum}</span>
        {showScoreToggle && canPick && (
          <button
            onClick={() => setScoreOpen(o => !o)}
            className="text-[9px] text-white/30 hover:text-white/60 transition-colors"
          >
            {scoreOpen ? 'hide' : '+score'}
          </button>
        )}
      </div>

      {/* Teams */}
      <div className="px-1 py-1 space-y-0.5">
        <TeamRow teamId={homeId} side="home" />
        <div className="h-px bg-white/5 mx-2" />
        <TeamRow teamId={awayId} side="away" />
      </div>

      {/* Score input (expandable) */}
      {scoreOpen && (
        <div className="px-2 pb-2 flex items-center gap-1">
          <input
            type="number" min="0" max="20"
            value={homeScore}
            onChange={e => onScoreChange('home', e.target.value)}
            placeholder="0"
            className="glass-input text-center py-0.5 text-xs w-full"
          />
          <span className="text-white/30 text-xs">:</span>
          <input
            type="number" min="0" max="20"
            value={awayScore}
            onChange={e => onScoreChange('away', e.target.value)}
            placeholder="0"
            className="glass-input text-center py-0.5 text-xs w-full"
          />
        </div>
      )}
    </div>
  )
}

// ── Bracket column ────────────────────────────────────────────
const CARD_H = 74   // px — approximate height of one MatchCard
const GAP    = 6    // px — gap between cards in same round

function BracketColumn({
  label, matches, groupOrder, thirdPlace, bracketWinners, knockoutScores,
  onPickWinner, onScoreChange, disabled, marginTop = 0,
}: {
  label: string
  matches: { match: number }[]
  groupOrder: GroupOrder; thirdPlace: ThirdPlaceState
  bracketWinners: BracketWinners; knockoutScores: KnockoutScores
  onPickWinner: (m: number, id: number) => void
  onScoreChange: (m: number, s: 'home' | 'away', v: string) => void
  disabled?: boolean; marginTop?: number
}) {
  const resolve = (matchNum: number, side: 'home' | 'away') =>
    resolveMatchTeam(matchNum, side, groupOrder, thirdPlace, bracketWinners)

  const spacing = (CARD_H + GAP) * 2 // space between cards doubles each round

  return (
    <div className="flex flex-col shrink-0" style={{ marginTop }}>
      <p className="text-[9px] font-semibold text-white/35 uppercase tracking-widest text-center mb-2">
        {label}
      </p>
      <div className="flex flex-col" style={{ gap: spacing - CARD_H }}>
        {matches.map((def, i) => {
          const s = knockoutScores[def.match]
          return (
            <div key={def.match} style={{ marginTop: i === 0 ? 0 : undefined }}>
              <MatchCard
                matchNum={def.match}
                homeId={resolve(def.match, 'home')}
                awayId={resolve(def.match, 'away')}
                winnerId={bracketWinners[def.match] ?? null}
                homeScore={s?.home ?? ''}
                awayScore={s?.away ?? ''}
                onPickWinner={(id) => onPickWinner(def.match, id)}
                onScoreChange={(side, val) => onScoreChange(def.match, side, val)}
                disabled={disabled}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main bracket ──────────────────────────────────────────────
export default function KnockoutBracket({
  groupOrder, thirdPlace, bracketWinners, knockoutScores,
  onPickWinner, onScoreChange, disabled,
}: KnockoutBracketProps) {
  const resolve = (matchNum: number, side: 'home' | 'away') =>
    resolveMatchTeam(matchNum, side, groupOrder, thirdPlace, bracketWinners)

  // Staggering: each successive round starts half a "slot" lower
  const slot = CARD_H + GAP
  const roundMargins = [0, slot / 2, slot * 1.5, slot * 3.5]
  const roundLabels  = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals']
  const rounds       = ['r32', 'r16', 'qf', 'sf'] as const

  const colGap = (CARD_H + GAP) // gap between R32 cards determines spacing between rounds

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">Part 4 — Knockout Bracket</h2>
        <p className="text-sm text-white/50 mt-0.5">
          Click a team to pick the winner. Winners cascade automatically. Use "+score" to predict the scoreline.
        </p>
      </div>

      <div className="overflow-x-auto no-scrollbar pb-4">
        <div className="flex items-start gap-3 min-w-max">
          {rounds.map((round, ri) => (
            <div key={round} className="w-44 shrink-0">
              <BracketColumn
                label={roundLabels[ri]}
                matches={BRACKET_BY_ROUND[round] ?? []}
                groupOrder={groupOrder}
                thirdPlace={thirdPlace}
                bracketWinners={bracketWinners}
                knockoutScores={knockoutScores}
                onPickWinner={onPickWinner}
                onScoreChange={onScoreChange}
                disabled={disabled}
                marginTop={roundMargins[ri]}
              />
            </div>
          ))}

          {/* Final column */}
          <div className="w-44 shrink-0" style={{ marginTop: roundMargins[3] + (CARD_H + GAP) * 4 }}>
            <p className="text-[9px] font-semibold text-white/35 uppercase tracking-widest text-center mb-2">Final</p>
            <div className="space-y-3">
              {/* 3rd place */}
              <div>
                <p className="text-[9px] text-white/25 text-center mb-1">3rd-place play-off</p>
                <MatchCard
                  matchNum={103}
                  homeId={resolve(103, 'home')} awayId={resolve(103, 'away')}
                  winnerId={bracketWinners[103] ?? null}
                  homeScore={knockoutScores[103]?.home ?? ''} awayScore={knockoutScores[103]?.away ?? ''}
                  onPickWinner={(id) => onPickWinner(103, id)}
                  onScoreChange={(s, v) => onScoreChange(103, s, v)}
                  disabled={disabled}
                />
              </div>

              {/* Final */}
              <div className="ring-1 ring-yellow-400/40 rounded-xl overflow-hidden">
                <p className="text-[10px] text-yellow-300 font-bold text-center py-1 bg-yellow-400/10">🏆 THE FINAL</p>
                <MatchCard
                  matchNum={104}
                  homeId={resolve(104, 'home')} awayId={resolve(104, 'away')}
                  winnerId={bracketWinners[104] ?? null}
                  homeScore={knockoutScores[104]?.home ?? ''} awayScore={knockoutScores[104]?.away ?? ''}
                  onPickWinner={(id) => onPickWinner(104, id)}
                  onScoreChange={(s, v) => onScoreChange(104, s, v)}
                  disabled={disabled}
                />
              </div>

              {bracketWinners[104] != null && (() => {
                const champ = getTeamById(bracketWinners[104]!)
                return champ ? (
                  <div className="glass rounded-xl p-2 text-center glow-emerald">
                    <p className="text-lg">{getFlagEmoji(champ.flag_code)}</p>
                    <p className="text-[10px] text-emerald-300 font-bold">{champ.name}</p>
                    <p className="text-[9px] text-white/30">Your Champion 🏆</p>
                  </div>
                ) : null
              })()}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
