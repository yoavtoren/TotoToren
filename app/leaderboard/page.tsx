import { createAdminClient } from '@/lib/supabase/admin'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = createAdminClient()

  const [{ data: scores }, { data: profiles }, { data: futures }] = await Promise.all([
    supabase.from('scores').select('*, profiles(display_name, avatar_url)').order('total_score', { ascending: false }),
    supabase.from('profiles').select('id, display_name, avatar_url').order('display_name'),
    supabase.from('futures_predictions').select('user_id, champion_team_id'),
  ])

  return (
    <LeaderboardClient
      initialScores={(scores as any[]) ?? []}
      allProfiles={(profiles as any[]) ?? []}
      initialFutures={(futures as any[]) ?? []}
    />
  )
}
