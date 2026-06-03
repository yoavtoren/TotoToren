import { createClient } from '@/lib/supabase/server'
import LeaderboardClient from '@/components/leaderboard/LeaderboardClient'

export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const [{ data: scores }, { data: profiles }] = await Promise.all([
    supabase
      .from('scores')
      .select('*, profiles(display_name, avatar_url)')
      .order('total_score', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .order('display_name'),
  ])

  return (
    <LeaderboardClient
      initialScores={(scores as any[]) ?? []}
      allProfiles={(profiles as any[]) ?? []}
    />
  )
}
