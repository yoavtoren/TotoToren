'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import GlassCard from '@/components/ui/GlassCard'
import GlassButton from '@/components/ui/GlassButton'
import { getTeamById, getFlagEmoji } from '@/data/teams'
import { cn } from '@/lib/utils'
import type { Match } from '@/types'

interface AdminClientProps {
  matches: Match[]
  groupMatches: Match[]
}

type ActiveTab = 'group' | 'knockout' | 'scoring'

export default function AdminClient({ matches, groupMatches }: AdminClientProps) {
  const [tab, setTab] = useState<ActiveTab>('knockout')
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [recalcStatus, setRecalcStatus] = useState<string | null>(null)
  const [recalcLoading, setRecalcLoading] = useState(false)

  const supabase = createClient()

  const handleScoreChange = (matchId: number, side: 'home' | 'away', value: string) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { home: '', away: '' }), [side]: value },
    }))
  }

  const handleSaveScore = async (match: Match) => {
    const s = scores[match.id]
    if (!s?.home || !s?.away) return
    setSaving(match.id)

    const { error } = await supabase
      .from('matches')
      .update({
        home_score: parseInt(s.home),
        away_score: parseInt(s.away),
      })
      .eq('id', match.id)

    if (!error) {
      setSavedIds((prev) => new Set([...prev, match.id]))
    }
    setSaving(null)
  }

  const handleRecalculate = async () => {
    setRecalcLoading(true)
    setRecalcStatus(null)
    const res = await fetch('/api/scores/recalculate', { method: 'POST' })
    const data = await res.json()
    setRecalcStatus(data.message ?? data.error ?? 'Done')
    setRecalcLoading(false)
  }

  const renderMatchRow = (match: Match) => {
    const home = match.home_team_id ? getTeamById(match.home_team_id) : null
    const away = match.away_team_id ? getTeamById(match.away_team_id) : null
    const scoreEntry = scores[match.id]
    const saved = savedIds.has(match.id)
    const hasExisting = match.home_score !== null

    return (
      <div
        key={match.id}
        className={cn(
          'glass rounded-xl p-3 space-y-2',
          saved && 'ring-1 ring-emerald-400/40'
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-white/40">{match.bracket_slot}</span>
          <span className="text-[10px] text-white/30">
            {new Date(match.scheduled_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 text-sm font-medium text-white truncate text-right">
            {home ? `${getFlagEmoji(home.flag_code)} ${home.name}` : 'TBD'}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min="0"
              max="20"
              value={scoreEntry?.home ?? (hasExisting ? String(match.home_score) : '')}
              onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
              placeholder="0"
              className="glass-input w-12 text-center py-1 text-sm"
            />
            <span className="text-white/40 font-bold">:</span>
            <input
              type="number"
              min="0"
              max="20"
              value={scoreEntry?.away ?? (hasExisting ? String(match.away_score) : '')}
              onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
              placeholder="0"
              className="glass-input w-12 text-center py-1 text-sm"
            />
          </div>

          <div className="flex-1 text-sm font-medium text-white truncate">
            {away ? `${getFlagEmoji(away.flag_code)} ${away.name}` : 'TBD'}
          </div>

          <GlassButton
            size="sm"
            variant={saved ? 'default' : 'primary'}
            onClick={() => handleSaveScore(match)}
            disabled={saving === match.id || !scoreEntry?.home || !scoreEntry?.away}
            className="shrink-0"
          >
            {saving === match.id ? '…' : saved ? '✓' : 'Save'}
          </GlassButton>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-shadow">Admin Panel</h1>
        <p className="text-sm text-white/50 mt-1">Enter match results and recalculate scores.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['knockout', 'group', 'scoring'] as ActiveTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize',
              tab === t ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'knockout' && (
        <div className="space-y-2">
          <p className="text-sm text-white/50">Enter scores after each knockout match.</p>
          {matches.map(renderMatchRow)}
        </div>
      )}

      {tab === 'group' && (
        <div className="space-y-2">
          <p className="text-sm text-white/50">Group stage match results.</p>
          {groupMatches.map(renderMatchRow)}
        </div>
      )}

      {tab === 'scoring' && (
        <GlassCard className="space-y-4">
          <h2 className="font-semibold">Recalculate All Scores</h2>
          <p className="text-sm text-white/60">
            Run this after entering match results. It recomputes every user's score
            from scratch based on their predictions vs real results.
          </p>
          <GlassButton
            variant="primary"
            size="lg"
            onClick={handleRecalculate}
            disabled={recalcLoading}
          >
            {recalcLoading ? 'Calculating…' : '⚡ Recalculate All Scores'}
          </GlassButton>
          {recalcStatus && (
            <p className="text-sm text-emerald-400">{recalcStatus}</p>
          )}
        </GlassCard>
      )}
    </div>
  )
}
