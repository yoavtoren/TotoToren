import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import {
  scoreGroupMatch, scoreGroupStandings, scoreKnockoutMatch,
  scoreFutures, scoreAdvancement,
  type FuturesPredictionInput, type FuturesResult,
} from '@/lib/scoring'

export async function POST(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Load all completed match results
  const { data: completedMatches } = await admin
    .from('matches').select('*')
    .not('home_score', 'is', null).not('away_score', 'is', null)

  if (!completedMatches || completedMatches.length === 0) {
    return NextResponse.json({ message: 'No completed matches to score yet.' })
  }

  // Group match results: matchId → score
  const groupMatchResults: Record<number, { home: number; away: number }> = {}
  const knockoutMatchResults: Record<number, { home: number; away: number }> = {}
  const knockoutWinnerIds: Record<number, number> = {}

  for (const m of completedMatches as any[]) {
    if (m.stage === 'group') {
      groupMatchResults[m.id] = { home: m.home_score, away: m.away_score }
    } else {
      knockoutMatchResults[m.id] = { home: m.home_score, away: m.away_score }
      if (m.home_score > m.away_score) knockoutWinnerIds[m.id] = m.home_team_id
      else if (m.away_score > m.home_score) knockoutWinnerIds[m.id] = m.away_team_id
    }
  }

  // Derive real group standings from completed group matches
  const realGroupStandings = deriveGroupStandings(completedMatches as any[])

  // Build real advancement sets per knockout round
  const realR32Teams = new Set(Object.values(knockoutWinnerIds).filter(Boolean) as number[])

  // Load futures result
  const { data: futuresResultRow } = await admin
    .from('futures_results').select('*').order('entered_at', { ascending: false }).limit(1).maybeSingle()

  const futuresResult: FuturesResult = futuresResultRow ?? {
    champion_team_id: null, top_scorer_team_id: null,
    golden_boot_team_id: null, most_conceded_team_id: null, total_goals: null,
  }

  // Load all user predictions
  const [profRes, gmRes, gpRes, kpRes, fpRes] = await Promise.all([
    admin.from('profiles').select('id'),
    admin.from('group_match_predictions').select('*'),
    admin.from('group_predictions').select('*'),
    admin.from('knockout_predictions').select('*'),
    admin.from('futures_predictions').select('*'),
  ])

  const profiles = profRes.data ?? []
  const allGroupMatchPreds = gmRes.data ?? []
  const allGroupPreds = gpRes.data ?? []
  const allKnockoutPreds = kpRes.data ?? []
  const allFutures = fpRes.data ?? []

  const scoreRows = profiles.map((p: { id: string }) => {
    const uid = p.id

    // 6.1 Group match scoring — missing predictions default to 0:0 (tie, no goals)
    let groupMatchPts = 0
    const userGMPreds = (allGroupMatchPreds as any[]).filter((r: any) => r.user_id === uid)
    for (const [matchIdStr, real] of Object.entries(groupMatchResults)) {
      const matchId = parseInt(matchIdStr)
      const pred = userGMPreds.find((r: any) => r.match_id === matchId)
      const scorePred = pred
        ? { home: pred.predicted_home, away: pred.predicted_away }
        : { home: 0, away: 0 }
      groupMatchPts += scoreGroupMatch(scorePred, real)
    }

    // 6.2 Group standings
    let groupStandingPts = 0
    const userGPreds = (allGroupPreds as any[]).filter((r: any) => r.user_id === uid)
    const groups = [...new Set(userGPreds.map((r: any) => r.group_letter as string))]
    for (const g of groups) {
      const rows = userGPreds
        .filter((r: any) => r.group_letter === g)
        .sort((a: any, b: any) => a.predicted_position - b.predicted_position)
      const predictedOrder = rows.map((r: any) => r.team_id as number)
      const realOrder = realGroupStandings[g]
      if (realOrder) groupStandingPts += scoreGroupStandings(predictedOrder, realOrder)
    }

    // 6.3 Advancement — approximate: set of teams user predicted as knockout winners
    const userKPreds = (allKnockoutPreds as any[]).filter((r: any) => r.user_id === uid)
    const predWinnerIds = new Set(userKPreds.map((r: any) => r.predicted_winner_id as number))
    const advancementPts = scoreAdvancement(predWinnerIds, realR32Teams, 'ADV_R32')

    // 6.4 Knockout scorelines
    let koScorePts = 0
    for (const pred of userKPreds) {
      if (pred.predicted_home_score === null || pred.predicted_away_score === null) continue
      const real = knockoutMatchResults[pred.match_num]
      if (real) koScorePts += scoreKnockoutMatch(
        { home: pred.predicted_home_score, away: pred.predicted_away_score }, real
      )
    }

    // 6.5 Futures
    const futuresPred = (allFutures as any[]).find((f: any) => f.user_id === uid)
    const futuresInput: FuturesPredictionInput = futuresPred ?? {
      champion_team_id: null, top_scorer_team_id: null, golden_boot_team_id: null,
      most_conceded_team_id: null, total_goals_prediction: null,
    }
    const futuresBreakdown = scoreFutures(futuresInput, futuresResult)

    const total = groupMatchPts + groupStandingPts + advancementPts + koScorePts + futuresBreakdown.total

    return {
      user_id: uid,
      total_score: total,
      group_match_points: groupMatchPts,
      group_standing_points: groupStandingPts,
      advancement_points: advancementPts,
      knockout_score_points: koScorePts,
      futures_points: futuresBreakdown.total,
      breakdown: {
        group_matches: { total: groupMatchPts },
        group_standings: { total: groupStandingPts },
        advancement: { total: advancementPts },
        knockout_scores: { total: koScorePts },
        futures: futuresBreakdown,
      },
      last_calculated_at: new Date().toISOString(),
    }
  })

  const { error } = await admin.from('scores').upsert(scoreRows, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: `Recalculated scores for ${scoreRows.length} users.` })
}

function deriveGroupStandings(matches: any[]): Record<string, number[]> {
  const standings: Record<string, Record<number, { pts: number; gd: number; gf: number }>> = {}

  for (const m of matches) {
    if (m.stage !== 'group' || m.home_score === null) continue
    const g = m.group_letter as string
    if (!standings[g]) standings[g] = {}
    const init = (id: number) => { if (!standings[g][id]) standings[g][id] = { pts: 0, gd: 0, gf: 0 } }
    init(m.home_team_id); init(m.away_team_id)
    const h = standings[g][m.home_team_id], a = standings[g][m.away_team_id]
    if (m.home_score > m.away_score)      h.pts += 3
    else if (m.home_score < m.away_score) a.pts += 3
    else                                   { h.pts += 1; a.pts += 1 }
    h.gd += m.home_score - m.away_score;  a.gd += m.away_score - m.home_score
    h.gf += m.home_score;                 a.gf += m.away_score
  }

  const result: Record<string, number[]> = {}
  for (const [g, teamMap] of Object.entries(standings)) {
    result[g] = Object.entries(teamMap)
      .sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      .map(([id]) => parseInt(id))
  }
  return result
}
