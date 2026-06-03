'use client'

import { useState, useCallback, useMemo } from 'react'
import { GROUP_LETTERS } from '@/lib/constants'
import { TEAMS } from '@/data/teams'
import { KNOCKOUT_MATCHES } from '@/data/match-schedule'
import type {
  GroupOrder, GroupMatchScores, ThirdPlaceState,
  BracketWinners, KnockoutScores, FuturesState, CompletionStats,
} from '@/types'

function initialGroupOrder(): GroupOrder {
  const order: GroupOrder = {}
  for (const g of GROUP_LETTERS) {
    order[g] = TEAMS.filter((t) => t.group_letter === g).map((t) => t.id)
  }
  return order
}

const INITIAL_FUTURES: FuturesState = {
  champion_team_id:       null,
  top_scorer_team_id:     null,
  golden_boot_team_id:    null,
  most_conceded_team_id:  null,
  total_goals_prediction: '',
}

export interface PredictionsInitial {
  groupOrder?: GroupOrder
  groupMatchScores?: GroupMatchScores
  thirdPlace?: ThirdPlaceState
  bracketWinners?: BracketWinners
  knockoutScores?: KnockoutScores
  futures?: Partial<FuturesState>
}

export function usePredictions(initial?: PredictionsInitial) {
  const [groupOrder, setGroupOrder] = useState<GroupOrder>(
    initial?.groupOrder ?? initialGroupOrder()
  )
  const [groupMatchScores, setGroupMatchScoresState] = useState<GroupMatchScores>(
    initial?.groupMatchScores ?? {}
  )
  const [thirdPlace, setThirdPlaceState] = useState<ThirdPlaceState>(
    initial?.thirdPlace ?? {}
  )
  const [bracketWinners, setBracketWinnersState] = useState<BracketWinners>(
    initial?.bracketWinners ?? {}
  )
  const [knockoutScores, setKnockoutScoresState] = useState<KnockoutScores>(
    initial?.knockoutScores ?? {}
  )
  const [futures, setFuturesState] = useState<FuturesState>({
    ...INITIAL_FUTURES,
    ...(initial?.futures ?? {}),
  })

  // ── Group standings ──────────────────────────────────────────
  const reorderGroup = useCallback((groupLetter: string, newOrder: number[]) => {
    setGroupOrder((prev) => ({ ...prev, [groupLetter]: newOrder }))
    // Clear downstream bracket state when group rankings change
    setBracketWinnersState({})
    setThirdPlaceState({})
  }, [])

  // ── Group match scores ────────────────────────────────────────
  const setGroupMatchScore = useCallback(
    (matchId: number, side: 'home' | 'away', value: string) => {
      setGroupMatchScoresState((prev) => ({
        ...prev,
        [matchId]: { ...(prev[matchId] ?? { home: '', away: '' }), [side]: value },
      }))
    },
    []
  )

  // ── Third-place assignments ───────────────────────────────────
  const setThirdPlaceTeam = useCallback((r32MatchNum: number, teamId: number | null) => {
    setThirdPlaceState((prev) => ({ ...prev, [r32MatchNum]: teamId }))
    // Clear the winner prediction for this match (matchup changed)
    setBracketWinnersState((prev) => {
      const next = { ...prev }
      delete next[r32MatchNum]
      return next
    })
  }, [])

  // ── Bracket winners (cascades downstream) ────────────────────
  const setBracketWinner = useCallback(
    (matchNum: number, teamId: number | null) => {
      // -1 is the deselect signal from clicking a selected winner
      const resolvedId = teamId === -1 ? null : teamId
      setBracketWinnersState((prev) => {
        const next = { ...prev, [matchNum]: resolvedId }
        // Clear all matches that depended on this one (feeder cascade)
        clearDownstream(next, matchNum)
        next[matchNum] = teamId
        return next
      })
    },
    []
  )

  const setKnockoutScore = useCallback(
    (matchNum: number, side: 'home' | 'away', value: string) => {
      setKnockoutScoresState((prev) => ({
        ...prev,
        [matchNum]: { ...(prev[matchNum] ?? { home: '', away: '' }), [side]: value },
      }))
    },
    []
  )

  // ── Futures ──────────────────────────────────────────────────
  const setFuture = useCallback(
    <K extends keyof FuturesState>(field: K, value: FuturesState[K]) => {
      setFuturesState((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  // ── Derived: 3rd-place team per group ─────────────────────────
  const available3rdPlaceTeams = useMemo(() => {
    const result: Record<string, number | null> = {}
    for (const g of GROUP_LETTERS) {
      result[g] = groupOrder[g]?.[2] ?? null
    }
    return result
  }, [groupOrder])

  const assigned3rdTeamIds = useMemo(
    () => new Set(Object.values(thirdPlace).filter((v) => v !== null) as number[]),
    [thirdPlace]
  )

  // ── Completion stats ─────────────────────────────────────────
  const completionStats = useMemo((): CompletionStats => {
    const groupMatchsFilled = Object.values(groupMatchScores).filter(
      (s) => s.home !== '' && s.away !== ''
    ).length
    const groupStandingsFilled = GROUP_LETTERS.filter(
      (g) => (groupOrder[g]?.length ?? 0) === 4
    ).length
    const thirdFilled = Object.values(thirdPlace).filter((v) => v !== null).length
    const knockoutFilled = Object.values(bracketWinners).filter((v) => v !== null).length
    const futuresFilled = [
      futures.champion_team_id,
      futures.top_scorer_team_id,
      futures.golden_boot_team_id,
      futures.most_conceded_team_id,
      futures.total_goals_prediction,
    ].filter((v) => v !== null && v !== '').length

    const total = 72 + 12 + 8 + 32 + 5
    const filled = groupMatchsFilled + groupStandingsFilled + thirdFilled + knockoutFilled + futuresFilled

    return {
      groupMatches:   { filled: groupMatchsFilled,    total: 72 },
      groupStandings: { filled: groupStandingsFilled, total: 12 },
      thirdPlace:     { filled: thirdFilled,          total: 8  },
      knockout:       { filled: knockoutFilled,       total: 32 },
      futures:        { filled: futuresFilled,        total: 5  },
      overallPct:     Math.round((filled / total) * 100),
    }
  }, [groupMatchScores, groupOrder, thirdPlace, bracketWinners, futures])

  return {
    groupOrder,
    groupMatchScores,
    thirdPlace,
    bracketWinners,
    knockoutScores,
    futures,
    available3rdPlaceTeams,
    assigned3rdTeamIds,
    completionStats,
    reorderGroup,
    setGroupMatchScore,
    setThirdPlaceTeam,
    setBracketWinner,
    setKnockoutScore,
    setFuture,
  }
}

// Clears downstream bracket winners when an upstream match result changes
function clearDownstream(state: BracketWinners, fromMatchNum: number): void {
  const koMatch = KNOCKOUT_MATCHES.find((m) => m.match === fromMatchNum)
  if (!koMatch) return

  // Find all matches that use fromMatchNum as a feeder
  const dependents = KNOCKOUT_MATCHES.filter(
    (m) =>
      m.home_feeder_match === fromMatchNum ||
      m.away_feeder_match === fromMatchNum
  )
  for (const dep of dependents) {
    delete state[dep.match]
    clearDownstream(state, dep.match)
  }
}
