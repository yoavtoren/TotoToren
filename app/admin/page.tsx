import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { computeAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  // Admin-specific auth (separate from main site)
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  const expectedToken = await computeAdminToken()

  if (!token || token !== expectedToken) {
    redirect('/admin/login')
  }

  const admin = createAdminClient()
  const [
    { data: groupMatches }, { data: knockoutMatches },
    { data: actualStandingsRows }, { data: thirdQualifierRows },
  ] = await Promise.all([
    admin.from('matches').select('*').eq('stage', 'group').order('scheduled_at'),
    admin.from('matches').select('*').neq('stage', 'group').order('scheduled_at'),
    admin.from('group_actual_standings').select('*').order('position'),
    admin.from('r32_third_place_qualifiers').select('team_id'),
  ])

  // Build actualStandings map: group_letter → [1st,2nd,3rd,4th] team_ids
  const actualStandings: Record<string, number[]> = {}
  for (const row of (actualStandingsRows ?? []) as any[]) {
    if (!actualStandings[row.group_letter]) actualStandings[row.group_letter] = [0, 0, 0, 0]
    actualStandings[row.group_letter][row.position - 1] = row.team_id
  }

  return (
    <AdminClient
      groupMatches={groupMatches ?? []}
      knockoutMatches={knockoutMatches ?? []}
      adminToken={expectedToken}
      actualStandings={actualStandings}
      thirdQualifiers={(thirdQualifierRows ?? []).map((r: any) => r.team_id)}
    />
  )
}
