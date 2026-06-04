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
  const [{ data: groupMatches }, { data: knockoutMatches }] = await Promise.all([
    admin.from('matches').select('*').eq('stage', 'group').order('scheduled_at'),
    admin.from('matches').select('*').neq('stage', 'group').order('scheduled_at'),
  ])

  return (
    <AdminClient
      groupMatches={groupMatches ?? []}
      knockoutMatches={knockoutMatches ?? []}
    />
  )
}
