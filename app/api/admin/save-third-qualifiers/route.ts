import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { team_ids } = await request.json() // array of up to 8 team IDs

  const admin = createAdminClient()
  await admin.from('r32_third_place_qualifiers').delete().neq('team_id', 0)

  if ((team_ids as number[]).length > 0) {
    const { error } = await admin.from('r32_third_place_qualifiers')
      .insert((team_ids as number[]).map(id => ({ team_id: id })))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
