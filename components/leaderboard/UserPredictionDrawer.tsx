'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getFlagEmoji, getTeamById } from '@/data/teams'
import GlassCard from '@/components/ui/GlassCard'
import { GROUP_LETTERS } from '@/lib/constants'
import type { GroupPrediction, KnockoutPrediction } from '@/types'

interface UserPredictionDrawerProps {
  userId: string
  displayName: string
}

const POSITION_LABELS = ['1st', '2nd', '3rd', '4th']

export default function UserPredictionDrawer({ userId, displayName }: UserPredictionDrawerProps) {
  const [groupPreds, setGroupPreds] = useState<GroupPrediction[]>([])
  const [knockoutPreds, setKnockoutPreds] = useState<KnockoutPrediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const fetchPredictions = async () => {
      const [g, k] = await Promise.all([
        supabase
          .from('group_predictions')
          .select('*')
          .eq('user_id', userId)
          .order('group_letter')
          .order('predicted_position'),
        supabase
          .from('knockout_predictions')
          .select('*')
          .eq('user_id', userId),
      ])
      setGroupPreds(g.data ?? [])
      setKnockoutPreds(k.data ?? [])
      setLoading(false)
    }
    fetchPredictions()
  }, [userId])

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 glass rounded-lg" />
        ))}
      </div>
    )
  }

  const now = new Date()
  const groupHasStarted = (g: string) => {
    // Approximate: group A starts June 11, each subsequent group +1 day
    const groupIndex = GROUP_LETTERS.indexOf(g as typeof GROUP_LETTERS[number])
    const groupStart = new Date('2026-06-11T19:00:00Z')
    groupStart.setDate(groupStart.getDate() + Math.floor(groupIndex / 2))
    return now >= groupStart
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      {/* Group predictions */}
      <GlassCard className="space-y-3">
        <h4 className="text-sm font-semibold text-white/70">Group Stage Predictions</h4>
        {GROUP_LETTERS.map((g) => {
          const rows = groupPreds
            .filter((p) => p.group_letter === g)
            .sort((a, b) => a.predicted_position - b.predicted_position)

          if (rows.length === 0) {
            return (
              <div key={g} className="flex items-center gap-2">
                <span className="text-xs font-mono text-white/40 w-6">G{g}</span>
                <span className="text-xs text-white/30 italic">not predicted</span>
              </div>
            )
          }

          const revealed = groupHasStarted(g)

          return (
            <div key={g}>
              <div className="text-xs text-white/40 font-mono mb-1">Group {g}</div>
              {rows.map((row, i) => {
                const team = getTeamById(row.team_id)
                return (
                  <div key={row.id} className="flex items-center gap-2 py-0.5">
                    <span className="text-xs text-white/40 w-6">{POSITION_LABELS[i]}</span>
                    {revealed && team ? (
                      <>
                        <span className="text-sm">{getFlagEmoji(team.flag_code)}</span>
                        <span className="text-sm text-white">{team.name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-white/20 flex items-center gap-1">
                        <span>🔒</span> hidden until kick-off
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </GlassCard>

      {/* Knockout predictions */}
      <GlassCard className="space-y-2">
        <h4 className="text-sm font-semibold text-white/70">Knockout Predictions</h4>
        {knockoutPreds.length === 0 && (
          <p className="text-xs text-white/30 italic">No knockout predictions yet.</p>
        )}
        {knockoutPreds.map((pred) => {
          const team = getTeamById(pred.predicted_winner_id)
          const tournamentStart = new Date('2026-06-29T19:00:00Z') // R32 start
          const revealed = now >= tournamentStart

          return (
            <div key={pred.id} className="flex items-center gap-2 py-0.5">
              <span className="text-xs font-mono text-white/40 w-14">M{pred.match_num}</span>
              {revealed && team ? (
                <>
                  <span className="text-sm">{getFlagEmoji(team.flag_code)}</span>
                  <span className="text-sm text-white">{team.name}</span>
                  {pred.predicted_home_score !== null && pred.predicted_away_score !== null && (
                    <span className="text-xs text-white/40 ml-auto">
                      {pred.predicted_home_score}:{pred.predicted_away_score}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-white/20 flex items-center gap-1">
                  <span>🔒</span> hidden
                </span>
              )}
            </div>
          )
        })}
      </GlassCard>
    </div>
  )
}
