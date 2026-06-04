/**
 * Pure scoring functions — no DB calls, no side effects.
 * All point values imported from scoring.config.ts.
 *
 * Worked examples (§6.1 of spec):
 *   Group match: real 2-1, predicted 3-0 → outcome ✓(+1) total 3≠3 ✓(+2) exact ✗ = 3 pts
 *   Group match: real 2-1, predicted 2-1 → outcome ✓(+1) total ✓(+2) exact ✓(+3) = 6 pts
 */

import { SCORING } from './scoring.config'

// ── Types ────────────────────────────────────────────────────

export interface Score2 { home: number; away: number }

export interface GroupMatchResult {
  match_id: number
  home_score: number
  away_score: number
}

export interface FuturesResult {
  champion_team_id: number | null
  top_scorer_team_id: number | null
  golden_boot_team_id: number | null
  most_conceded_team_id: number | null
  total_goals: number | null
}

export interface FuturesPredictionInput {
  champion_team_id: number | null
  top_scorer_team_id: number | null
  golden_boot_team_id: number | null
  most_conceded_team_id: number | null
  total_goals_prediction: number | null
}

// ── Helper ───────────────────────────────────────────────────

function outcome(s: Score2): 'home' | 'draw' | 'away' {
  return s.home > s.away ? 'home' : s.away > s.home ? 'away' : 'draw'
}

// ── 6.1 Group match ──────────────────────────────────────────

export function scoreGroupMatch(predicted: Score2, real: Score2): number {
  let pts = 0
  if (outcome(predicted) === outcome(real))                         pts += SCORING.GROUP_MATCH_OUTCOME
  if (predicted.home + predicted.away === real.home + real.away)   pts += SCORING.GROUP_MATCH_TOTAL_GOALS
  if (predicted.home === real.home && predicted.away === real.away) pts += SCORING.GROUP_MATCH_EXACT
  return pts
}

// ── 6.2 Group standings ──────────────────────────────────────

/** predictedOrder and realOrder are arrays of team IDs, index 0 = 1st place. */
export function scoreGroupStandings(predictedOrder: number[], realOrder: number[]): number {
  let pts = 0
  for (let i = 0; i < 4; i++) {
    if (predictedOrder[i] !== undefined && predictedOrder[i] === realOrder[i]) {
      pts += SCORING.GROUP_POSITION_CORRECT
    }
  }
  return pts
}

// ── 6.3 Advancement tiers ─────────────────────────────────────

export type AdvTier = 'ADV_R32' | 'ADV_R16' | 'ADV_QF' | 'ADV_SF' | 'ADV_FINAL'

export function scoreAdvancement(
  predictedReaches: Set<number>,
  realReaches: Set<number>,
  tier: AdvTier
): number {
  let pts = 0
  for (const teamId of predictedReaches) {
    if (realReaches.has(teamId)) pts += SCORING[tier]
  }
  return pts
}

// ── 6.4 Knockout match scoreline ─────────────────────────────

export function scoreKnockoutMatch(predicted: Score2, real: Score2): number {
  let pts = 0
  if (predicted.home + predicted.away === real.home + real.away) pts += SCORING.KO_TOTAL_GOALS
  // side-irrelevant: {2,1} matches real {2,1} or {1,2}
  const pMin = Math.min(predicted.home, predicted.away), pMax = Math.max(predicted.home, predicted.away)
  const rMin = Math.min(real.home, real.away),           rMax = Math.max(real.home, real.away)
  if (pMin === rMin && pMax === rMax) pts += SCORING.KO_EXACT
  return pts
}

// ── 6.5 Futures ──────────────────────────────────────────────

export interface FuturesBreakdown {
  champion: number
  top_scorer_team: number
  golden_boot_team: number
  most_conceded: number
  total_goals: number
  total: number
}

export function scoreFutures(
  predicted: FuturesPredictionInput,
  real: FuturesResult
): FuturesBreakdown {
  const champion       = (real.champion_team_id       !== null && predicted.champion_team_id       === real.champion_team_id)       ? SCORING.FUTURES_CHAMPION         : 0
  const topScorerTeam  = (real.top_scorer_team_id      !== null && predicted.top_scorer_team_id      === real.top_scorer_team_id)      ? SCORING.FUTURES_TOP_SCORER_TEAM  : 0
  const goldenBootTeam = (real.golden_boot_team_id     !== null && predicted.golden_boot_team_id     === real.golden_boot_team_id)     ? SCORING.FUTURES_GOLDEN_BOOT_TEAM : 0
  const mostConceded   = (real.most_conceded_team_id   !== null && predicted.most_conceded_team_id   === real.most_conceded_team_id)   ? SCORING.FUTURES_MOST_CONCEDED    : 0
  const totalGoals     = (real.total_goals             !== null && predicted.total_goals_prediction   === real.total_goals)             ? SCORING.FUTURES_TOTAL_GOALS      : 0
  return {
    champion, top_scorer_team: topScorerTeam, golden_boot_team: goldenBootTeam,
    most_conceded: mostConceded, total_goals: totalGoals,
    total: champion + topScorerTeam + goldenBootTeam + mostConceded + totalGoals,
  }
}

// ── Aggregate scorer (used by /api/scores/recalculate) ───────

export interface UserScoreInput {
  groupMatchPredictions: Array<{ match_id: number; home: number; away: number }>
  groupStandingPredictions: Record<string, number[]>  // groupLetter → ordered teamIds
  knockoutPredictions: Array<{ match_id: number; home: number; away: number }>
  knockoutWinners: Record<number, number>             // matchId → teamId
  futuresPrediction: FuturesPredictionInput
}

export interface TournamentResults {
  groupMatchResults: Record<number, Score2>           // matchId → score
  groupStandings: Record<string, number[]>            // groupLetter → ordered teamIds
  knockoutResults: Record<number, Score2>             // matchId → score
  knockoutWinners: Record<number, number>             // matchId → winnerId
  futuresResult: FuturesResult
}

export interface UserScoreOutput {
  group_match_points: number
  group_standing_points: number
  advancement_points: number
  knockout_score_points: number
  futures_points: number
  total: number
}

export function computeUserScore(
  input: UserScoreInput,
  results: TournamentResults
): UserScoreOutput {
  // 6.1 group match scores
  let groupMatchPoints = 0
  for (const pred of input.groupMatchPredictions) {
    const real = results.groupMatchResults[pred.match_id]
    if (real !== undefined) groupMatchPoints += scoreGroupMatch(pred, real)
  }

  // 6.2 group standings
  let groupStandingPoints = 0
  for (const [g, predOrder] of Object.entries(input.groupStandingPredictions)) {
    const realOrder = results.groupStandings[g]
    if (realOrder) groupStandingPoints += scoreGroupStandings(predOrder, realOrder)
  }

  // 6.3 advancement tiers — build predicted/real sets per tier
  // For this we need to know which teams the user predicted reaching each round
  // This is complex; we compute from knockoutWinners fed through the bracket
  let advancementPoints = 0
  const tiers: [AdvTier, number[]][] = [
    ['ADV_R32',  [89, 90, 91, 92, 93, 94, 95, 96]],        // winners of R32 reach R16
    ['ADV_R16',  [97, 98, 99, 100]],                         // winners of R16 reach QF
    ['ADV_QF',   [101, 102]],                                // winners of QF reach SF
    ['ADV_SF',   [104]],                                     // winners of SF reach Final
    ['ADV_FINAL', []],                                       // Final winner = champion (scored via futures)
  ]
  for (const [tier, matchIds] of tiers) {
    const predSet = new Set(matchIds.map((id) => input.knockoutWinners[id]).filter(Boolean) as number[])
    const realSet = new Set(matchIds.map((id) => results.knockoutWinners[id]).filter(Boolean) as number[])
    advancementPoints += scoreAdvancement(predSet, realSet, tier)
  }

  // 6.4 knockout match scorelines
  let knockoutScorePoints = 0
  for (const pred of input.knockoutPredictions) {
    const real = results.knockoutResults[pred.match_id]
    if (real !== undefined) knockoutScorePoints += scoreKnockoutMatch(pred, real)
  }

  // 6.5 futures
  const futuresBreakdown = scoreFutures(input.futuresPrediction, results.futuresResult)

  return {
    group_match_points: groupMatchPoints,
    group_standing_points: groupStandingPoints,
    advancement_points: advancementPoints,
    knockout_score_points: knockoutScorePoints,
    futures_points: futuresBreakdown.total,
    total: groupMatchPoints + groupStandingPoints + advancementPoints + knockoutScorePoints + futuresBreakdown.total,
  }
}
