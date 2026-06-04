'use client'

import { useState } from 'react'
import { getTeamById, getFlagEmoji } from '@/data/teams'
import { GROUP_LETTERS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Match } from '@/types'

const ROUND_LABELS: Record<string, string> = {
  r32: 'שלב 32', r16: 'שלב 16', qf: 'רבע גמר',
  sf: 'חצי גמר', third_place: 'מקום שלישי', final: 'גמר',
}

const KNOCKOUT_ROUNDS = ['r32', 'r16', 'qf', 'sf', 'third_place', 'final'] as const

export default function AdminClient({
  groupMatches, knockoutMatches,
}: {
  groupMatches: Match[]
  knockoutMatches: Match[]
}) {
  const totalMatches = groupMatches.length + knockoutMatches.length
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(GROUP_LETTERS.slice(0, 1)))
  const [openRounds, setOpenRounds] = useState<Set<string>>(new Set())

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSyncSchedule() {
    setSyncing(true)
    const res = await fetch('/api/admin/sync-schedule', { method: 'POST' })
    const data = await res.json()
    setSyncing(false)
    if (res.ok) { showToast(data.message); window.location.reload() }
    else showToast(`שגיאה: ${data.error}`)
  }

  async function handleSave(matchId: number) {
    const s = scores[matchId]
    if (!s?.home || !s?.away) return
    setSaving(matchId)

    // 1. Save result
    const saveRes = await fetch('/api/admin/save-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId,
        homeScore: parseInt(s.home),
        awayScore: parseInt(s.away),
      }),
    })
    if (!saveRes.ok) {
      const data = await saveRes.json()
      showToast(`שגיאה בשמירה: ${data.error}`)
      setSaving(null)
      return
    }

    // 2. Recalculate scores immediately
    const calcRes = await fetch('/api/scores/recalculate', { method: 'POST' })
    const calcData = await calcRes.json()

    setSavedIds(prev => new Set([...prev, matchId]))
    setSaving(null)
    showToast(`✓ נשמר ועודכן — ${calcData.message ?? ''}`)
  }

  function setScore(matchId: number, side: 'home' | 'away', value: string) {
    setScores(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { home: '', away: '' }), [side]: value },
    }))
  }

  function renderMatchRow(m: Match) {
    const home = m.home_team_id ? getTeamById(m.home_team_id) : null
    const away = m.away_team_id ? getTeamById(m.away_team_id) : null
    const sc = scores[m.id]
    const isSaved = savedIds.has(m.id)
    const hasResult = m.home_score !== null
    const homeVal = sc?.home !== undefined ? sc.home : (hasResult ? String(m.home_score) : '')
    const awayVal = sc?.away !== undefined ? sc.away : (hasResult ? String(m.away_score) : '')
    const canSave = (sc?.home !== undefined && sc?.away !== undefined && sc.home !== '' && sc.away !== '')

    return (
      <div
        key={m.id}
        dir="ltr"
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all',
          isSaved
            ? 'border-emerald-400/30 bg-emerald-500/8'
            : hasResult
              ? 'border-white/10 bg-white/5'
              : 'border-white/8',
        )}
      >
        {/* Match ID */}
        <span className="text-[10px] text-white/25 font-mono w-8 shrink-0 text-left">M{m.id}</span>

        {/* Date */}
        <span className="text-[10px] text-white/30 font-mono w-12 shrink-0 text-left">
          {new Date(m.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>

        {/* Home team */}
        <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
          <span className="text-xs font-medium text-white truncate">
            {home ? home.name : 'TBD'}
          </span>
          {home && <span className="text-base shrink-0">{getFlagEmoji(home.flag_code)}</span>}
        </div>

        {/* Score inputs */}
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number" min="0" max="20"
            value={homeVal}
            onChange={e => setScore(m.id, 'home', e.target.value)}
            placeholder="–"
            className={cn(
              'glass-input w-12 text-center py-1.5 text-sm font-mono',
              hasResult && !sc ? 'text-white/60' : '',
            )}
          />
          <span className="text-white/30 font-bold text-sm">:</span>
          <input
            type="number" min="0" max="20"
            value={awayVal}
            onChange={e => setScore(m.id, 'away', e.target.value)}
            placeholder="–"
            className={cn(
              'glass-input w-12 text-center py-1.5 text-sm font-mono',
              hasResult && !sc ? 'text-white/60' : '',
            )}
          />
        </div>

        {/* Away team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {away && <span className="text-base shrink-0">{getFlagEmoji(away.flag_code)}</span>}
          <span className="text-xs font-medium text-white truncate">
            {away ? away.name : 'TBD'}
          </span>
        </div>

        {/* Save button */}
        <button
          onClick={() => handleSave(m.id)}
          disabled={saving === m.id || !canSave}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            isSaved
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/25'
              : 'bg-indigo-500/25 hover:bg-indigo-500/40 text-indigo-200 border border-indigo-400/25 disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          {saving === m.id ? '…' : isSaved ? '✓ נשמר' : 'שמור'}
        </button>
      </div>
    )
  }

  // Group matches by group letter
  const byGroup: Record<string, Match[]> = {}
  for (const g of GROUP_LETTERS) {
    byGroup[g] = groupMatches.filter(m => m.group_letter === g)
  }

  // Knockout by round
  const byRound: Record<string, Match[]> = {}
  for (const r of KNOCKOUT_ROUNDS) {
    byRound[r] = knockoutMatches.filter(m => m.stage === r)
  }

  function toggleGroup(g: string) {
    setOpenGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n })
  }
  function toggleRound(r: string) {
    setOpenRounds(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500/90 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-shadow">דף המנהל</h1>
          <p className="text-sm text-white/50 mt-1">
            {totalMatches === 0
              ? 'לא נמצאו משחקים — סנכרן את הלוח תחילה'
              : `${totalMatches} משחקים · שמירה מחשבת ניקוד מחדש אוטומטית`}
          </p>
        </div>
        <button
          onClick={handleSyncSchedule}
          disabled={syncing}
          className="glass glass-hover px-4 py-2 rounded-xl text-sm font-semibold text-white/70 transition-colors shrink-0"
        >
          {syncing ? 'מסנכרן…' : '🔄 סנכרן לוח משחקים'}
        </button>
      </div>

      {totalMatches === 0 && (
        <div className="glass rounded-2xl p-8 text-center space-y-3">
          <p className="text-4xl">📋</p>
          <p className="text-white/70">לחץ על "סנכרן לוח משחקים" כדי לטעון את 104 המשחקים למסד הנתונים.</p>
          <p className="text-sm text-white/40">פעולה זו נדרשת פעם אחת בלבד.</p>
        </div>
      )}

      {/* ── Group stage ──────────────────────────────────────── */}
      {groupMatches.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white/80 px-1">שלב הבתים</h2>
          {GROUP_LETTERS.map(g => {
            const matches = byGroup[g] ?? []
            if (!matches.length) return null
            const done = matches.filter(m => m.home_score !== null).length
            const isOpen = openGroups.has(g)
            return (
              <div key={g} className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(g)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">בית {g}</span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-mono',
                      done === 6 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40',
                    )}>
                      {done}/6
                    </span>
                  </div>
                  <span className="text-white/30 text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-white/10 p-3 space-y-1.5">
                    {matches.map(renderMatchRow)}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* ── Knockout ─────────────────────────────────────────── */}
      {knockoutMatches.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-white/80 px-1">נוקאאוט</h2>
          {KNOCKOUT_ROUNDS.map(round => {
            const matches = byRound[round] ?? []
            if (!matches.length) return null
            const done = matches.filter(m => m.home_score !== null).length
            const isOpen = openRounds.has(round)
            return (
              <div key={round} className="glass rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleRound(round)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{ROUND_LABELS[round]}</span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-mono',
                      done === matches.length ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40',
                    )}>
                      {done}/{matches.length}
                    </span>
                  </div>
                  <span className="text-white/30 text-xs">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-white/10 p-3 space-y-1.5">
                    {matches.map(renderMatchRow)}
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
