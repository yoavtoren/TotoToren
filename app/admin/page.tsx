import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?redirectTo=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .neq('stage', 'group') // Show knockout matches in admin; group results derive standings
    .order('scheduled_at', { ascending: true })

  const { data: groupMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('stage', 'group')
    .order('scheduled_at', { ascending: true })

  return <AdminClient matches={matches ?? []} groupMatches={groupMatches ?? []} />
}
