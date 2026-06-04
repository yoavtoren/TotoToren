import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GROUP_MATCHES, KNOCKOUT_MATCHES } from '@/data/match-schedule'
import { getTeamIdByName } from '@/data/teams'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const groupRows = GROUP_MATCHES.map(m => ({
    id: m.match,
    stage: 'group',
    group_letter: m.group,
    bracket_slot: `M${m.match}`,
    home_team_id: getTeamIdByName(m.home) ?? null,
    away_team_id: getTeamIdByName(m.away) ?? null,
    scheduled_at: m.kickoff_utc,
    feeds_into_slot: null,
    feeds_into_side: null,
  }))

  const knockoutRows = KNOCKOUT_MATCHES.map(m => ({
    id: m.match,
    stage: m.stage,
    group_letter: null,
    bracket_slot: `M${m.match}`,
    home_team_id: null,
    away_team_id: null,
    scheduled_at: m.kickoff_utc,
    feeds_into_slot: null,
    feeds_into_side: null,
  }))

  const { error } = await admin
    .from('matches')
    .upsert([...groupRows, ...knockoutRows], { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: `סונכרנו ${groupRows.length + knockoutRows.length} משחקים` })
}
