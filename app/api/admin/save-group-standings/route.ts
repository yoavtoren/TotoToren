import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { group_letter, team_ids } = await request.json()
  // team_ids: [1st, 2nd, 3rd, 4th] team IDs

  const admin = createAdminClient()
  // Delete existing standings for this group
  const { error: deleteError } = await admin
    .from('group_actual_standings').delete().eq('group_letter', group_letter)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const rows = (team_ids as number[]).map((team_id, i) => ({
    group_letter,
    position: i + 1,
    team_id,
  })).filter(r => r.team_id)

  if (rows.length > 0) {
    const { error } = await admin.from('group_actual_standings').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
