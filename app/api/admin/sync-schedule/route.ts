import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '@/data/match-schedule'
import { getTeamIdByName } from '@/data/teams'

export async function POST(request: NextRequest) {
  const expected = await computeAdminToken()
  const token = request.headers.get('x-admin-token') ?? request.cookies.get(ADMIN_COOKIE)?.value
  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const groupRows = GROUP_MATCHES.map(m => ({
    id: m.match,
    stage: 'group',
    group_letter: m.group,
    bracket_slot: `M${m.match}`,
    home_team_id: getTeamIdByName(m.home) ?? null,
    away_team_id: getTeamIdByName(m.away) ?? null,
    scheduled_at: m.kickoff_utc,
  }))

  const knockoutRows = KNOCKOUT_MATCHES.map(m => ({
    id: m.match,
    stage: m.stage,
    group_letter: null,
    bracket_slot: `M${m.match}`,
    home_team_id: null,
    away_team_id: null,
    scheduled_at: m.kickoff_utc,
  }))

  const { error } = await admin
    .from('matches')
    .upsert([...groupRows, ...knockoutRows], { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: `סונכרנו ${groupRows.length + knockoutRows.length} משחקים` })
}
