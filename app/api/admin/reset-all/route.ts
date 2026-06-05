import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Run each reset sequentially so we can report which one fails
  const steps = [
    { name: 'match results',      fn: () => admin.from('matches').update({ home_score: null, away_score: null }).neq('id', 0) },
    { name: 'group standings',    fn: () => admin.from('group_actual_standings').delete().neq('group_letter', '') },
    { name: 'third qualifiers',   fn: () => admin.from('r32_third_place_qualifiers').delete().neq('team_id', 0) },
    { name: 'stage qualifiers',   fn: () => admin.from('knockout_stage_qualifiers').delete().neq('team_id', 0) },
    // Delete scores entirely — profiles without a score row show as 0 in the leaderboard.
    // This avoids column-type issues with UPDATE that silently fail.
    { name: 'scores',             fn: () => admin.from('scores').delete().neq('user_id', '00000000-0000-0000-0000-000000000000') },
  ]

  for (const step of steps) {
    const { error } = await step.fn()
    if (error) return NextResponse.json({ error: `${step.name}: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'כל הנתונים אופסו ✓' })
}
