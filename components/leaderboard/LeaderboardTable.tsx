'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import UserPredictionDrawer from './UserPredictionDrawer'
import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface LeaderboardEntry {
  user_id: string
  total_score: number
  group_stage_points: number
  knockout_points: number
  last_calculated_at: string
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardTable({
  initialEntries,
}: {
  initialEntries: LeaderboardEntry[]
}) {
  const [entries, setEntries] = useState(initialEntries)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('scores-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scores' },
        async () => {
          const { data } = await supabase
            .from('scores')
            .select('*, profiles(display_name, avatar_url)')
            .order('total_score', { ascending: false })
          if (data) setEntries(data as LeaderboardEntry[])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (entries.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-white/60">No scores yet — be the first to submit predictions!</p>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => {
        const isExpanded = expandedUserId === entry.user_id
        const medal = RANK_MEDALS[i] ?? `#${i + 1}`

        return (
          <div key={entry.user_id}>
            <GlassCard
              hover
              className="cursor-pointer"
              onClick={() => setExpandedUserId(isExpanded ? null : entry.user_id)}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <span className="text-xl min-w-[36px] text-center">{medal}</span>

                {/* Avatar placeholder */}
                <div className="w-9 h-9 rounded-full glass flex items-center justify-center text-sm font-bold text-white/70 shrink-0">
                  {entry.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">
                    {entry.profiles?.display_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-white/40">
                    Group: {entry.group_stage_points} pts &nbsp;·&nbsp;
                    Knockout: {entry.knockout_points} pts
                  </p>
                </div>

                {/* Total score */}
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-indigo-300">{entry.total_score}</p>
                  <p className="text-xs text-white/40">points</p>
                </div>

                {/* Expand indicator */}
                <span className={cn('text-white/30 transition-transform', isExpanded && 'rotate-180')}>
                  ▼
                </span>
              </div>
            </GlassCard>

            {/* Expanded prediction drawer */}
            {isExpanded && (
              <div className="mt-1 px-2 animate-fade-in">
                <UserPredictionDrawer
                  userId={entry.user_id}
                  displayName={entry.profiles?.display_name ?? ''}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
