import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [r1, r2, r3, r4, r5] = await Promise.all([
    // Clear all match results
    admin.from('matches').update({ home_score: null, away_score: null }).neq('id', 0),
    // Clear group actual standings
    admin.from('group_actual_standings').delete().neq('group_letter', ''),
    // Clear third-place qualifiers
    admin.from('r32_third_place_qualifiers').delete().neq('team_id', 0),
    // Clear stage qualifiers
    admin.from('knockout_stage_qualifiers').delete().neq('team_id', 0),
    // Reset all user scores to 0
    admin.from('scores').update({
      total_score: 0, group_match_points: 0, group_standing_points: 0,
      advancement_points: 0, knockout_score_points: 0, futures_points: 0,
      breakdown: null,
    }).neq('user_id', '00000000-0000-0000-0000-000000000000'),
  ])

  const err = r1.error ?? r2.error ?? r3.error ?? r4.error ?? r5.error
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: 'כל הנתונים אופסו ✓' })
}
