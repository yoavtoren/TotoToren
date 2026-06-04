import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

const VALID_STAGES = ['r16', 'qf', 'sf', 'final', 'champion'] as const

export async function POST(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stage, team_ids } = await request.json()
  if (!VALID_STAGES.includes(stage)) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('knockout_stage_qualifiers').delete().eq('stage', stage)

  if ((team_ids as number[]).length > 0) {
    const { error } = await admin.from('knockout_stage_qualifiers')
      .insert((team_ids as number[]).map(id => ({ stage, team_id: id })))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
