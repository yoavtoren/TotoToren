'use client'

import { useState, useEffect } from 'react'
import { usePredictions } from '@/hooks/usePredictions'
import { useWhistle } from '@/lib/useWhistle'
import GroupMatchScorelineSection from '@/components/groups/GroupMatchScorelineSection'
import GroupStageSection from '@/components/groups/GroupStageSection'
import ThirdPlacePicker from '@/components/third-place/ThirdPlacePicker'
import KnockoutBracket from '@/components/bracket/KnockoutBracket'
import FuturesBetsSection from '@/components/futures/FuturesBetsSection'
import BetProgress from '@/components/ui/BetProgress'
import GlassButton from '@/components/ui/GlassButton'
import GlassCard from '@/components/ui/GlassCard'
import { createClient } from '@/lib/supabase/client'
import { GROUP_LETTERS } from '@/lib/constants'
import type {
  GroupPrediction, KnockoutPrediction, ThirdPlaceSelection,
  GroupMatchPrediction, FuturesPrediction,
  GroupMatchScores, ThirdPlaceState, BracketWinners, KnockoutScores, FuturesState,
} from '@/types'

interface PredictClientProps {
  userId: string
  existingGroupPredictions:    GroupPrediction[]
  existingGroupMatchPreds:     GroupMatchPrediction[]
  existingThirdPlace:          ThirdPlaceSelection[]
  existingKnockoutPredictions: KnockoutPrediction[]
  existingFutures:             FuturesPrediction | null
  isLocked: boolean
}

function buildInitial(
  groupPreds:    GroupPrediction[],
  matchPreds:    GroupMatchPrediction[],
  thirdPreds:    ThirdPlaceSelection[],
  knockoutPreds: KnockoutPrediction[],
  futures:       FuturesPrediction | null
) {
  // Group order
  const groupOrder: Record<string, number[]> = {}
  for (const g of GROUP_LETTERS) {
    const rows = groupPreds
      .filter((p) => p.group_letter === g)
      .sort((a, b) => a.predicted_position - b.predicted_position)
    if (rows.length === 4) groupOrder[g] = rows.map((r) => r.team_id)
  }

  // Group match scores
  const groupMatchScores: GroupMatchScores = {}
  for (const m of matchPreds) {
    groupMatchScores[m.match_id] = {
      outcome: (m as any).predicted_outcome ?? '',
      total:   (m as any).predicted_total_goals != null ? String((m as any).predicted_total_goals) : '',
      home:    m.predicted_home != null ? String(m.predicted_home) : '',
      away:    m.predicted_away != null ? String(m.predicted_away) : '',
    }
  }

  // Third-place
  const thirdPlace: ThirdPlaceState = {}
  for (const t of thirdPreds) {
    thirdPlace[t.r32_match_num] = t.team_id
  }

  // Knockout winners + scores
  const bracketWinners: BracketWinners = {}
  const knockoutScores: KnockoutScores = {}
  for (const k of knockoutPreds) {
    bracketWinners[k.match_num] = k.predicted_winner_id
    knockoutScores[k.match_num] = {
      home: k.predicted_home_score?.toString() ?? '',
      away: k.predicted_away_score?.toString() ?? '',
    }
  }

  // Futures
  const futuresState: Partial<FuturesState> = futures
    ? {
        champion_team_id:       futures.champion_team_id,
        top_scorer_team_id:     futures.top_scorer_team_id,
        golden_boot_team_id:    futures.golden_boot_team_id,
        most_conceded_team_id:  futures.most_conceded_team_id,
        total_goals_prediction: futures.total_goals_prediction?.toString() ?? '',
      }
    : {}

  return { groupOrder, groupMatchScores, thirdPlace, bracketWinners, knockoutScores, futures: futuresState }
}

export default function PredictClient({
  userId, existingGroupPredictions, existingGroupMatchPreds, existingThirdPlace,
  existingKnockoutPredictions, existingFutures, isLocked,
}: PredictClientProps) {
  const init = buildInitial(
    existingGroupPredictions, existingGroupMatchPreds,
    existingThirdPlace, existingKnockoutPredictions, existingFutures
  )

  const {
    groupOrder, groupMatchScores, thirdPlace, bracketWinners, knockoutScores, futures,
    available3rdPlaceTeams, assigned3rdTeamIds, completionStats,
    reorderGroup, setGroupMatchScore, setThirdPlaceTeam, setBracketWinner, setKnockoutScore, setFuture,
  } = usePredictions(
    Object.keys(init.groupOrder).length > 0 ? init : undefined
  )

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [whistleEnabled, setWhistleEnabled] = useState(true)
  const playWhistle = useWhistle(whistleEnabled)

  // Load whistle preference from profile
  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('notifications_whistle').eq('id', userId).single()
      .then(({ data }) => { if (data) setWhistleEnabled(data.notifications_whistle) })
  }, [userId])

  const handleSave = async () => {
    if (isLocked) return
    setSaving(true)
    setSaveError(null)

    const supabase = createClient()

    try {
      // Part 2 — group standings
      const groupRows = GROUP_LETTERS.flatMap((g) =>
        (groupOrder[g] ?? []).map((teamId, index) => ({
          user_id: userId, team_id: teamId, group_letter: g,
          predicted_position: index + 1, updated_at: new Date().toISOString(),
        }))
      )

      // Part 1 — save any match where at least one prediction is filled
      const matchRows = Object.entries(groupMatchScores)
        .filter(([, s]) => s.outcome !== '' || s.total !== '' || s.home !== '' || s.away !== '')
        .map(([matchId, s]) => ({
          user_id: userId, match_id: parseInt(matchId),
          predicted_outcome:     s.outcome !== '' ? s.outcome : null,
          predicted_total_goals: s.total   !== '' ? parseInt(s.total) : null,
          predicted_home:        s.home    !== '' ? parseInt(s.home)  : null,
          predicted_away:        s.away    !== '' ? parseInt(s.away)  : null,
          updated_at: new Date().toISOString(),
        }))

      // Part 3 — third-place
      const thirdRows = Object.entries(thirdPlace)
        .filter(([, id]) => id !== null)
        .map(([r32MatchNum, teamId]) => ({
          user_id: userId, team_id: teamId as number,
          r32_match_num: parseInt(r32MatchNum),
        }))

      // Part 4 — knockout
      const knockoutRows = Object.entries(bracketWinners)
        .filter(([, id]) => id !== null)
        .map(([matchNum, winnerId]) => {
          const s = knockoutScores[parseInt(matchNum)]
          return {
            user_id: userId, match_num: parseInt(matchNum),
            predicted_winner_id: winnerId as number,
            predicted_home_score: s?.home ? parseInt(s.home) : null,
            predicted_away_score: s?.away ? parseInt(s.away) : null,
            updated_at: new Date().toISOString(),
          }
        })

      // Part 5 — futures
      const futuresRow = {
        user_id: userId,
        champion_team_id:       futures.champion_team_id,
        top_scorer_team_id:     futures.top_scorer_team_id,
        golden_boot_team_id:    futures.golden_boot_team_id,
        most_conceded_team_id:  futures.most_conceded_team_id,
        total_goals_prediction: futures.total_goals_prediction
          ? parseInt(futures.total_goals_prediction) : null,
        updated_at: new Date().toISOString(),
      }

      const [gRes, mRes, tRes, kRes, fRes] = await Promise.all([
        supabase.from('group_predictions')
          .upsert(groupRows, { onConflict: 'user_id,group_letter,predicted_position' }),
        matchRows.length > 0
          ? supabase.from('group_match_predictions')
              .upsert(matchRows, { onConflict: 'user_id,match_id' })
          : { error: null },
        thirdRows.length > 0
          ? supabase.from('third_place_selections')
              .upsert(thirdRows, { onConflict: 'user_id,r32_match_num' })
          : { error: null },
        knockoutRows.length > 0
          ? supabase.from('knockout_predictions')
              .upsert(knockoutRows, { onConflict: 'user_id,match_num' })
          : { error: null },
        supabase.from('futures_predictions')
          .upsert([futuresRow], { onConflict: 'user_id' }),
      ])

      const err = gRes.error ?? mRes.error ?? tRes.error ?? kRes.error ?? fRes.error
      if (err) throw new Error(err.message)

      setSaveSuccess(true)
      playWhistle()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-shadow">הניחושים שלי</h1>
          <p className="text-sm text-white/50 mt-1">
            מלאו את כל חמשת החלקים ושמרו לפני תחילת הטורניר.
          </p>
        </div>

        {isLocked ? (
          <GlassCard className="flex items-center gap-2 px-4 py-2 shrink-0">
            <span className="text-lg">🔒</span>
            <span className="text-sm font-semibold text-white/70">הניחושים נעולים</span>
          </GlassCard>
        ) : (
          <div className="flex items-center gap-3 shrink-0">
            {saveError && <p className="text-sm text-red-400 max-w-[200px]">{saveError}</p>}
            {saveSuccess && <p className="text-sm text-emerald-400">✓ נשמר!</p>}
            <GlassButton variant="primary" size="lg" onClick={handleSave} disabled={saving}>
              {saving ? 'שומר…' : '💾 שמור ניחושים'}
            </GlassButton>
          </div>
        )}
      </div>

      {/* Progress */}
      <BetProgress stats={completionStats} />

      {/* Part 1 */}
      <GroupMatchScorelineSection
        scores={groupMatchScores}
        onScoreChange={setGroupMatchScore}
        disabled={isLocked}
      />

      {/* Part 2 */}
      <GroupStageSection groupOrder={groupOrder} onReorder={reorderGroup} disabled={isLocked} />

      {/* Part 3 */}
      <ThirdPlacePicker
        available3rdPlaceTeams={available3rdPlaceTeams}
        assigned={thirdPlace}
        assignedIds={assigned3rdTeamIds}
        onAssign={setThirdPlaceTeam}
        disabled={isLocked}
      />

      {/* Part 4 */}
      <KnockoutBracket
        groupOrder={groupOrder}
        thirdPlace={thirdPlace}
        bracketWinners={bracketWinners}
        knockoutScores={knockoutScores}
        onPickWinner={setBracketWinner}
        onScoreChange={setKnockoutScore}
        disabled={isLocked}
      />

      {/* Part 5 */}
      <FuturesBetsSection futures={futures} onSet={setFuture} disabled={isLocked} />

      {/* Sticky mobile save */}
      {!isLocked && (
        <div className="fixed bottom-6 right-6 sm:hidden z-50">
          <GlassButton variant="primary" size="lg" onClick={handleSave} disabled={saving}
            className="shadow-2xl glow-indigo">
            {saving ? '…' : '💾'}
          </GlassButton>
        </div>
      )}
    </div>
  )
}
