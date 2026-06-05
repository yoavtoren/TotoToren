import { createAdminClient } from '@/lib/supabase/admin'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'

export const revalidate = 10

export default async function LeaderboardPage() {
  const supabase = createAdminClient()

  const [{ data: scores }, { data: profiles }, { data: futures }, { data: completedMatches }, { data: r32Standings }, { data: r32Third }, { data: stageQuals }] = await Promise.all([
    supabase.from('scores').select('*, profiles(display_name, avatar_url)').order('total_score', { ascending: false }),
    supabase.from('profiles').select('id, display_name, avatar_url').order('display_name'),
    supabase.from('futures_predictions').select('user_id, champion_team_id'),
    supabase.from('matches').select('id').not('home_score', 'is', null).not('away_score', 'is', null),
    supabase.from('group_actual_standings').select('team_id').in('position', [1, 2]),
    supabase.from('r32_third_place_qualifiers').select('team_id'),
    supabase.from('knockout_stage_qualifiers').select('stage, team_id'),
  ])

  const completedMatchIds = new Set((completedMatches ?? []).map((m: any) => m.id as number))
  const realR32TeamIds = new Set([
    ...(r32Standings ?? []).map((r: any) => r.team_id as number),
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
    />
  )
}
