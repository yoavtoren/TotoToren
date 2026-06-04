import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirectTo=/admin')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

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
