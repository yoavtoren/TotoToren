import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { champion_team_id, top_scorer_team_id, golden_boot_team_id, most_conceded_team_id, total_goals } = body

  const admin = createAdminClient()
  const { error } = await admin.from('futures_results').insert({
    champion_team_id:      champion_team_id      ?? null,
    top_scorer_team_id:    top_scorer_team_id    ?? null,
    golden_boot_team_id:   golden_boot_team_id   ?? null,
    most_conceded_team_id: most_conceded_team_id ?? null,
    total_goals:           total_goals           ?? null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
