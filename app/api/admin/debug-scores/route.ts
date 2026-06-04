import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const [
    { data: completedMatches, error: matchErr },
    { data: allPreds, error: predErr },
    { data: profiles },
    { data: scores },
  ] = await Promise.all([
    admin.from('matches').select('id,stage,home_score,away_score,home_team_id,away_team_id')
      .not('home_score', 'is', null).not('away_score', 'is', null),
    admin.from('group_match_predictions').select('user_id,match_id,predicted_outcome,predicted_total_goals,predicted_home,predicted_away'),
    admin.from('profiles').select('id,display_name'),
    admin.from('scores').select('user_id,total_score,group_match_points'),
  ])

  return NextResponse.json({
    completedMatches,
    matchError: matchErr?.message,
    predictions: allPreds,
    predError: predErr?.message,
    profiles,
    currentScores: scores,
  })
}
