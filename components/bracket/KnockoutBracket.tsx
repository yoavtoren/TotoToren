'use client'

import BracketMatchup from './BracketMatchup'
import GlassCard from '@/components/ui/GlassCard'
import { BRACKET_BY_ROUND } from '@/data/bracket-slots'
import { resolveMatchTeam } from '@/lib/bracket'
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

const ROUND_LABELS: Record<string, string> = {
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf:  'Quarter-finals',
  sf:  'Semi-finals',
}

const SPACING: Record<string, string> = {
  r32: 'space-y-1',
  r16: 'space-y-10',
  qf:  'space-y-[88px]',
  sf:  'space-y-[200px]',
}

export default function KnockoutBracket({
  groupOrder, thirdPlace, bracketWinners, knockoutScores,
  onPickWinner, onScoreChange, disabled,
}: KnockoutBracketProps) {
  const resolve = (matchNum: number, side: 'home' | 'away') =>
    resolveMatchTeam(matchNum, side, groupOrder, thirdPlace, bracketWinners)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">Part 4 — Knockout Bracket</h2>
        <p className="text-sm text-white/50 mt-0.5">
          Click a team to predict the winner. Winners cascade to the next round automatically.
        </p>
      </div>

      <div className="overflow-x-auto no-scrollbar pb-4">
        <div className="flex gap-3 min-w-max items-start">
          {(['r32', 'r16', 'qf', 'sf'] as const).map((round) => (
            <div key={round} className="w-52 shrink-0">
              <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2 text-center">
                {ROUND_LABELS[round]}
              </h3>
              <div className={SPACING[round]}>
                {(BRACKET_BY_ROUND[round] ?? []).map((def) => {
                  const homeId = resolve(def.match, 'home')
                  const awayId = resolve(def.match, 'away')
                  const scores = knockoutScores[def.match]
                  return (
                    <BracketMatchup
                      key={def.match}
                      matchNum={def.match}
                      homeTeamId={homeId}
                      awayTeamId={awayId}
                      predictedWinnerId={bracketWinners[def.match] ?? null}
                      homeScore={scores?.home ?? ''}
                      awayScore={scores?.away ?? ''}
                      onPickWinner={(id) => onPickWinner(def.match, id)}
                      onScoreChange={(side, val) => onScoreChange(def.match, side, val)}
                      disabled={disabled}
                      size={round === 'r32' ? 'sm' : 'md'}
                    />
                  )
                })}
              </div>
            </div>
          ))}

          {/* Final column */}
          <div className="w-52 shrink-0">
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2 text-center">
              Final
            </h3>
            <div className="mt-40 space-y-4">
              {/* 3rd place */}
              <GlassCard className="space-y-1 p-2">
                <p className="text-[10px] text-white/30 text-center">3rd-place play-off (M103)</p>
                <BracketMatchup
                  matchNum={103}
                  homeTeamId={resolve(103, 'home')}
                  awayTeamId={resolve(103, 'away')}
                  predictedWinnerId={bracketWinners[103] ?? null}
                  homeScore={knockoutScores[103]?.home ?? ''}
                  awayScore={knockoutScores[103]?.away ?? ''}
                  onPickWinner={(id) => onPickWinner(103, id)}
                  onScoreChange={(side, val) => onScoreChange(103, side, val)}
                  disabled={disabled}
                  size="sm"
                />
              </GlassCard>

              {/* Final */}
              <GlassCard className="space-y-1 ring-2 ring-yellow-400/40 glow-indigo p-2">
                <p className="text-xs text-yellow-300 font-bold text-center">🏆 THE FINAL (M104)</p>
                <BracketMatchup
                  matchNum={104}
                  homeTeamId={resolve(104, 'home')}
                  awayTeamId={resolve(104, 'away')}
                  predictedWinnerId={bracketWinners[104] ?? null}
                  homeScore={knockoutScores[104]?.home ?? ''}
                  awayScore={knockoutScores[104]?.away ?? ''}
                  onPickWinner={(id) => onPickWinner(104, id)}
                  onScoreChange={(side, val) => onScoreChange(104, side, val)}
                  disabled={disabled}
                />
              </GlassCard>

              {bracketWinners[104] !== null && bracketWinners[104] !== undefined && (
                <div className="glass rounded-xl p-3 text-center glow-emerald">
                  <div className="text-2xl">🏆</div>
                  <p className="text-xs text-emerald-300 font-bold mt-1">Your Champion!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
