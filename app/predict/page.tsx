import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PredictClient from './PredictClient'

export default async function PredictPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?redirectTo=/predict')

  const [groupRes, matchRes, thirdRes, knockoutRes, futuresRes] = await Promise.all([
    supabase.from('group_predictions').select('*').eq('user_id', user.id),
    supabase.from('group_match_predictions').select('*').eq('user_id', user.id),
    supabase.from('third_place_selections').select('*').eq('user_id', user.id),
    supabase.from('knockout_predictions').select('*').eq('user_id', user.id),
    supabase.from('futures_predictions').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const isLocked = new Date() >= new Date('2026-06-11T19:00:00Z')

  return (
    <PredictClient
      userId={user.id}
      existingGroupPredictions={groupRes.data ?? []}
      existingGroupMatchPreds={matchRes.data ?? []}
      existingThirdPlace={thirdRes.data ?? []}
      existingKnockoutPredictions={knockoutRes.data ?? []}
      existingFutures={futuresRes.data ?? null}
      isLocked={isLocked}
    />
  )
}
