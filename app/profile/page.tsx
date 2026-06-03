import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, { data: scores }, { data: matchPreds }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('scores').select('user_id, total_score, profiles(display_name, avatar_url)').order('total_score', { ascending: false }),
    supabase.from('group_match_predictions').select('match_id').eq('user_id', user.id),
  ])

  return (
    <ProfileClient
      userId={user.id}
      email={user.email ?? ''}
      profile={profile}
      leaderboard={(scores as any[]) ?? []}
      predictedMatchIds={(matchPreds ?? []).map((r: any) => r.match_id)}
    />
  )
}
