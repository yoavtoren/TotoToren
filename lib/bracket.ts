import { KNOCKOUT_MATCHES } from '@/data/match-schedule'
import { BRACKET_BY_MATCH } from '@/data/bracket-slots'
import { GROUP_LETTERS } from './constants'
import type { GroupOrder, ThirdPlaceState, BracketWinners } from '@/types'

/**
 * Resolve which team fills one side (home/away) of a knockout match,
 * given the current prediction state.
 *
 * Sources:
 *  - { winner: 'G' }       → groupOrder[G][0]
 *  - { runner_up: 'G' }    → groupOrder[G][1]
 *  - { third_from: [...] } → thirdPlace[matchNum] (user assigned)
 *  - { feeder_match: N }   → bracketWinners[N]
 */
export function resolveMatchTeam(
  matchNum: number,
  side: 'home' | 'away',
  groupOrder: GroupOrder,
  thirdPlace: ThirdPlaceState,
  bracketWinners: BracketWinners
): number | null {
  const def = BRACKET_BY_MATCH[matchNum]
  if (!def) return null

  const source = side === 'home' ? def.home_source : def.away_source

  if ('winner' in source) {
    return groupOrder[source.winner]?.[0] ?? null
  }
  if ('runner_up' in source) {
    return groupOrder[source.runner_up]?.[1] ?? null
  }
  if ('third_from' in source) {
    // User-assigned: thirdPlace[matchNum] + side tells us which team
    // We store as thirdPlace[matchNum_side] to distinguish home vs away third-from slots
    const key = side === 'away' ? matchNum : matchNum  // for now both sides use matchNum
    // Actually since one match can have at most one third_from side, matchNum is sufficient
    return thirdPlace[matchNum] ?? null
  }
  if ('feeder_match' in source) {
    return bracketWinners[source.feeder_match] ?? null
  }
  return null
}

/** Get the third_from eligible groups for a given match+side, or null if not a third-from slot */
export function getThirdFromGroups(matchNum: number, side: 'home' | 'away'): string[] | null {
  const def = BRACKET_BY_MATCH[matchNum]
  if (!def) return null
  const source = side === 'home' ? def.home_source : def.away_source
  if ('third_from' in source) return source.third_from
  return null
}

/** Returns the 3rd-place teams available in a group that haven't been assigned yet */
export function get3rdPlaceTeams(groupOrder: GroupOrder): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  for (const g of GROUP_LETTERS) {
    result[g] = groupOrder[g]?.[2] ?? null
  }
  return result
}

/** All R32 match numbers that have a third_from slot */
export function getThirdFromMatchNums(): number[] {
  return KNOCKOUT_MATCHES
    .filter((m) => m.stage === 'r32')
    .filter((m) => {
      const def = BRACKET_BY_MATCH[m.match]
      if (!def) return false
      return 'third_from' in def.home_source || 'third_from' in def.away_source
    })
    .map((m) => m.match)
}
