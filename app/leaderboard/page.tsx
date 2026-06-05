import { createAdminClient } from '@/lib/supabase/admin'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'

export const revalidate = 10

export default async function LeaderboardPage() {
  const supabase = createAdminClient()

  const [{ data: scores }, { data: profiles }, { data: futures }, { data: completedMatches }, { data: r32Standings }, { data: r32Third }, { data: stageQuals }, { data: koResults }] = await Promise.all([
    supabase.from('scores').select('*, profiles(display_name, avatar_url)').order('total_score', { ascending: false }),
    supabase.from('profiles').select('id, display_name, avatar_url').order('display_name'),
    supabase.from('futures_predictions').select('user_id, champion_team_id, top_scorer_team_id, golden_boot_team_id, most_conceded_team_id, total_goals_prediction'),
    supabase.from('matches').select('id').not('home_score', 'is', null).not('away_score', 'is', null),
    supabase.from('group_actual_standings').select('group_letter, position, team_id').order('position'),
    supabase.from('r32_third_place_qualifiers').select('team_id'),
    supabase.from('knockout_stage_qualifiers').select('stage, team_id'),
    supabase.from('matches').select('id, home_score, away_score').neq('stage', 'group').not('home_score', 'is', null),
  ])

  // Knockout match results: matchId → { home, away }
  const koMatchResults: Record<number, { home: number; away: number }> = {}
  for (const m of (koResults ?? []) as any[]) {
    koMatchResults[m.id] = { home: m.home_score, away: m.away_score }
  }

  const completedMatchIds = new Set((completedMatches ?? []).map((m: any) => m.id as number))
  const realGroupStandings: Record<string, number[]> = {}
  for (const r of (r32Standings ?? []) as any[]) {
    if (!realGroupStandings[r.group_letter]) realGroupStandings[r.group_letter] = []
    realGroupStandings[r.group_letter][r.position - 1] = r.team_id
  }
  const realR32TeamIds = new Set([
    ...(r32Standings ?? []).filter((r: any) => r.position <= 2).map((r: any) => r.team_id as number),
    ...(r32Third ?? []).map((r: any) => r.team_id as number),
  ])
  const byStage = (stage: string) =>
    new Set((stageQuals ?? []).filter((r: any) => r.stage === stage).map((r: any) => r.team_id as number))

  return (
    <LeaderboardClient
      initialScores={(scores as any[]) ?? []}
      allProfiles={(profiles as any[]) ?? []}
      initialFutures={(futures as any[]) ?? []}
      completedMatchIds={completedMatchIds}
      realR32TeamIds={realR32TeamIds}
      realR16TeamIds={byStage('r16')}
      realGroupStandings={realGroupStandings}
      realQFTeamIds={byStage('qf')}
      realSFTeamIds={byStage('sf')}
      realFinalTeamIds={byStage('final')}
      realChampionId={[...byStage('champion')][0] ?? null}
      koMatchResults={koMatchResults}
    />
  )
}
