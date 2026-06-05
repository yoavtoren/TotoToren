import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const ids = (req.nextUrl.searchParams.get('ids') ?? '')
    .split(',')
    .map(Number)
    .filter(Boolean)
  if (ids.length === 0) return NextResponse.json([])

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('group_match_predictions')
    .select('user_id, match_id, predicted_home, predicted_away, profiles(display_name)')
    .in('match_id', ids)

  return NextResponse.json(data ?? [])
}
