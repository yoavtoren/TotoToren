import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import { scoreGroupStandings, scoreFutures, scoreAdvancement, type FuturesPredictionInput, type FuturesResult } from '@/lib/scoring'
import { SCORING } from '@/lib/scoring.config'

export async function POST(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // ── 1. Load actual match results ─────────────────────────────
  const { data: completedMatches, error: matchErr } = await admin
    .from('matches').select('id,stage,group_letter,home_team_id,away_team_id,home_score,away_score')
    .not('home_score', 'is', null).not('away_score', 'is', null)

  if (matchErr) return NextResponse.json({ error: `matches: ${matchErr.message}` }, { status: 500 })
  if (!completedMatches || completedMatches.length === 0)
    return NextResponse.json({ message: 'No completed matches yet.' })

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

  // ── 2. Real group standings (manual > derived) ─────────────────
  const { data: actualStandingsRows } = await admin.from('group_actual_standings').select('group_letter,position,team_id').order('position')
  const actualStandingsMap: Record<string, number[]> = {}
  for (const row of (actualStandingsRows ?? []) as any[]) {
    if (!actualStandingsMap[row.group_letter]) actualStandingsMap[row.group_letter] = []
    actualStandingsMap[row.group_letter][row.position - 1] = row.team_id
  }
  const derivedStandings = deriveGroupStandings(completedMatches as any[])
  const realGroupStandings: Record<string, number[]> = {}
  for (const g of [...new Set([...Object.keys(derivedStandings), ...Object.keys(actualStandingsMap)])]) {
    realGroupStandings[g] = actualStandingsMap[g]?.filter(Boolean).length === 4
      ? actualStandingsMap[g] : derivedStandings[g] ?? []
  }

  // ── 3. R32 / stage qualifiers ─────────────────────────────────
  const { data: thirdRows } = await admin.from('r32_third_place_qualifiers').select('team_id')
  const { data: stageRows }  = await admin.from('knockout_stage_qualifiers').select('stage,team_id')
  const r32Teams = new Set<number>()
  for (const order of Object.values(realGroupStandings)) {
    if (order[0]) r32Teams.add(order[0])
    if (order[1]) r32Teams.add(order[1])
  }
  for (const r of (thirdRows ?? []) as any[]) r32Teams.add(r.team_id)

  // ADV_R32 only fires when the admin has officially closed the group stage
  // by saving all 8 third-place qualifiers — until then scores are 0 for advancement
  const groupStageComplete = (thirdRows ?? []).length === 8
  const realR32Teams = groupStageComplete ? r32Teams : new Set<number>()
  const stageQual: Record<string, Set<number>> = { r16: new Set(), qf: new Set(), sf: new Set(), final: new Set() }
  for (const r of (stageRows ?? []) as any[]) { if (stageQual[r.stage]) stageQual[r.stage].add(r.team_id) }

  // ── 4. Futures result ─────────────────────────────────────────
  const { data: futuresResultRow } = await admin.from('futures_results').select('*').order('entered_at', { ascending: false }).limit(1).maybeSingle()
  const futuresResult: FuturesResult = futuresResultRow ?? { champion_team_id: null, top_scorer_team_id: null, golden_boot_team_id: null, most_conceded_team_id: null, total_goals: null }

  // ── 5. User predictions — explicit columns to avoid schema-cache issues ──
  const { data: profiles,    error: profErr  } = await admin.from('profiles').select('id')
  const { data: gmPreds,     error: gmErr    } = await admin.from('group_match_predictions')
    .select('user_id,match_id,predicted_outcome,predicted_total_goals,predicted_home,predicted_away')
  const { data: gpPreds,     error: gpErr    } = await admin.from('group_predictions')
    .select('user_id,group_letter,team_id,predicted_position')
  const { data: koPreds,     error: koErr    } = await admin.from('knockout_predictions')
    .select('user_id,match_num,predicted_winner_id,predicted_home_score,predicted_away_score,predicted_total_goals')
  const { data: futurePreds, error: fpErr    } = await admin.from('futures_predictions')
    .select('user_id,champion_team_id,top_scorer_team_id,golden_boot_team_id,most_conceded_team_id,total_goals_prediction')

  // Return errors so we can diagnose
  const loadErrors = [
    profErr && `profiles: ${profErr.message}`,
    gmErr   && `group_match_predictions: ${gmErr.message}`,
    gpErr   && `group_predictions: ${gpErr.message}`,
    koErr   && `knockout_predictions: ${koErr.message}`,
    fpErr   && `futures_predictions: ${fpErr.message}`,
  ].filter(Boolean)
  if (loadErrors.length > 0) return NextResponse.json({ error: loadErrors.join('; ') }, { status: 500 })

  const allGM  = (gmPreds     ?? []) as any[]
  const allGP  = (gpPreds     ?? []) as any[]
  const allKO  = (koPreds     ?? []) as any[]
  const allFut = (futurePreds ?? []) as any[]

  // ── 6. Score each user ────────────────────────────────────────
  const scoreRows = (profiles ?? []).map((p: { id: string }) => {
    const uid = p.id
    const userGM = allGM.filter((r: any) => r.user_id === uid)
    const userGP = allGP.filter((r: any) => r.user_id === uid)
    const userKO = allKO.filter((r: any) => r.user_id === uid)

    // 6.1 Group match — 1X2 (+1), total goals (+2), exact score (+3) — each independent
    let groupMatchPts = 0
    const groupMatchBreakdown: Record<number, number> = {}
    for (const [idStr, real] of Object.entries(groupMatchResults)) {
      const matchId = parseInt(idStr)
      const pred = userGM.find((r: any) => r.match_id === matchId)
      if (!pred) continue
      let pts = 0
      const realOutcome = real.home > real.away ? '1' : real.away > real.home ? '2' : 'X'
      if (pred.predicted_outcome != null && pred.predicted_outcome === realOutcome)
        pts += SCORING.GROUP_MATCH_OUTCOME
      if (pred.predicted_total_goals != null && pred.predicted_total_goals === real.home + real.away)
        pts += SCORING.GROUP_MATCH_TOTAL_GOALS
      if (pred.predicted_home != null && pred.predicted_away != null &&
          pred.predicted_home === real.home && pred.predicted_away === real.away)
        pts += SCORING.GROUP_MATCH_EXACT
      if (pts > 0) groupMatchBreakdown[matchId] = pts
      groupMatchPts += pts
    }

    // 6.2 Group standings (+3 per correct position)
    let groupStandingPts = 0
    for (const g of [...new Set(userGP.map((r: any) => r.group_letter as string))]) {
      const predOrder = userGP.filter((r: any) => r.group_letter === g).sort((a: any, b: any) => a.predicted_position - b.predicted_position).map((r: any) => r.team_id as number)
      const realOrder = realGroupStandings[g]
      if (realOrder?.length) groupStandingPts += scoreGroupStandings(predOrder, realOrder)
    }

    // 6.3 Advancement
    const predWinnerIds = new Set(userKO.map((r: any) => r.predicted_winner_id as number))
    let advancementPts = scoreAdvancement(predWinnerIds, realR32Teams, 'ADV_R32')
    for (const [tier, stage] of [['ADV_R16','r16'],['ADV_QF','qf'],['ADV_SF','sf'],['ADV_FINAL','final']] as const) {
      advancementPts += scoreAdvancement(predWinnerIds, stageQual[stage].size > 0 ? stageQual[stage] : new Set(Object.values(knockoutWinnerIds)), tier)
    }

    // 6.4 Knockout scorelines
    let koScorePts = 0
    for (const pred of userKO) {
      const real = knockoutMatchResults[pred.match_num]
      if (!real) continue
      if (pred.predicted_total_goals != null && pred.predicted_total_goals === real.home + real.away)
        koScorePts += SCORING.KO_TOTAL_GOALS
      if (pred.predicted_home_score != null && pred.predicted_away_score != null &&
          pred.predicted_home_score === real.home && pred.predicted_away_score === real.away)
        koScorePts += SCORING.KO_EXACT
    }

    // 6.5 Futures
    const futuresPred = allFut.find((f: any) => f.user_id === uid)
    const futuresInput: FuturesPredictionInput = futuresPred ?? { champion_team_id: null, top_scorer_team_id: null, golden_boot_team_id: null, most_conceded_team_id: null, total_goals_prediction: null }
    const futuresPts = scoreFutures(futuresInput, futuresResult).total

    const total = groupMatchPts + groupStandingPts + advancementPts + koScorePts + futuresPts

    return {
      user_id: uid,
      total_score: total,
      group_match_points: groupMatchPts,
      group_standing_points: groupStandingPts,
      advancement_points: advancementPts,
      knockout_score_points: koScorePts,
      futures_points: futuresPts,
      breakdown: { group_matches: groupMatchBreakdown },
      last_calculated_at: new Date().toISOString(),
    }
  })

  // ── 7. Save scores ────────────────────────────────────────────
  const { error: upsertErr } = await admin.from('scores').upsert(scoreRows, { onConflict: 'user_id' })
  if (upsertErr) return NextResponse.json({ error: `upsert: ${upsertErr.message}` }, { status: 500 })

  return NextResponse.json({
    message: `Recalculated scores for ${scoreRows.length} users.`,
    scores: scoreRows.map(r => ({ user_id: r.user_id, total: r.total_score, group_match: r.group_match_points })),
  })
}

function deriveGroupStandings(matches: any[]): Record<string, number[]> {
  const table: Record<string, Record<number, { pts: number; gd: number; gf: number }>> = {}
  for (const m of matches) {
    if (m.stage !== 'group' || m.home_score === null) continue
    const g = m.group_letter as string
    if (!table[g]) table[g] = {}
    if (!table[g][m.home_team_id]) table[g][m.home_team_id] = { pts: 0, gd: 0, gf: 0 }
    if (!table[g][m.away_team_id]) table[g][m.away_team_id] = { pts: 0, gd: 0, gf: 0 }
    const h = table[g][m.home_team_id], a = table[g][m.away_team_id]
    if (m.home_score > m.away_score) h.pts += 3
    else if (m.home_score < m.away_score) a.pts += 3
    else { h.pts += 1; a.pts += 1 }
    h.gd += m.home_score - m.away_score; a.gd += m.away_score - m.home_score
    h.gf += m.home_score; a.gf += m.away_score
  }
  const result: Record<string, number[]> = {}
  for (const [g, teamMap] of Object.entries(table)) {
    result[g] = Object.entries(teamMap).sort(([, a], [, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf).map(([id]) => parseInt(id))
  }
  return result
}
