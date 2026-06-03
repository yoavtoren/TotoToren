import { createClient } from '@/lib/supabase/server'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import GlassCard from '@/components/ui/GlassCard'

export const revalidate = 60 // ISR: revalidate every 60s

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: scores } = await supabase
    .from('scores')
    .select('*, profiles(display_name, avatar_url)')
    .order('total_score', { ascending: false })

  const { data: totalUsers } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-shadow">Leaderboard</h1>
        <p className="text-sm text-white/50">
          {totalUsers?.length ?? 0} participants &nbsp;·&nbsp; Scores update after each match
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Participants', value: totalUsers?.length ?? 0 },
          { label: 'Top Score', value: scores?.[0]?.total_score ?? 0 },
          { label: 'Avg Score', value: scores?.length
            ? Math.round(scores.reduce((s, e) => s + e.total_score, 0) / scores.length)
            : 0 },
        ].map(({ label, value }) => (
          <GlassCard key={label} className="text-center py-3">
            <p className="text-2xl font-bold text-indigo-300">{value}</p>
            <p className="text-xs text-white/50 mt-0.5">{label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Table — realtime-enhanced on client */}
      <LeaderboardTable initialEntries={(scores as any) ?? []} />
    </div>
  )
}
