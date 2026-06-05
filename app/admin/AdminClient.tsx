'use client'

import { useState } from 'react'
import { getTeamById, getFlagEmoji, TEAMS } from '@/data/teams'
import { GROUP_LETTERS } from '@/lib/constants'
import { SCORING } from '@/lib/scoring.config'
import type { Match } from '@/types'

const ROUND_LABELS: Record<string, string> = {
  r32: 'שלב 32', r16: 'שלב 16', qf: 'רבע גמר',
  sf: 'חצי גמר', third_place: 'מקום שלישי', final: 'גמר',
}
const KNOCKOUT_ROUNDS = ['r32', 'r16', 'qf', 'sf', 'third_place', 'final'] as const

export default function AdminClient({
  groupMatches, knockoutMatches, adminToken, actualStandings: initialStandings,
  thirdQualifiers: initialQualifiers, stageQualifiers: initialStageQualifiers,
}: {
  groupMatches: Match[]
  knockoutMatches: Match[]
  adminToken: string
  actualStandings: Record<string, number[]>
  thirdQualifiers: number[]
  stageQualifiers: Record<string, number[]>
}) {
  const total = groupMatches.length + knockoutMatches.length
  const [scores, setScores] = useState<Record<number, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<number | null>(null)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [resetting, setResetting] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([GROUP_LETTERS[0]]))
  const [openRounds, setOpenRounds] = useState<Set<string>>(new Set())
  const [futures, setFutures] = useState({
    champion_team_id: '', top_scorer_team_id: '', golden_boot_team_id: '',
    most_conceded_team_id: '', total_goals: '',
  })
  const [savingFutures, setSavingFutures] = useState(false)
  const [standings, setStandings] = useState<Record<string, number[]>>(initialStandings)
  const [savingStanding, setSavingStanding] = useState<string | null>(null)
  const [thirdQualifiers, setThirdQualifiers] = useState<Set<number>>(new Set(initialQualifiers))
  const [savingQualifiers, setSavingQualifiers] = useState(false)
  // Cascading knockout stages: r16 → qf → sf → final → champion
  const [stageTeams, setStageTeams] = useState<Record<string, Set<number>>>({
    r16:     new Set(initialStageQualifiers.r16     ?? []),
    qf:      new Set(initialStageQualifiers.qf      ?? []),
    sf:      new Set(initialStageQualifiers.sf      ?? []),
    final:   new Set(initialStageQualifiers.final   ?? []),
    champion:new Set(initialStageQualifiers.champion ?? []),
  })
  const [savingStage, setSavingStage] = useState<string | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  const authHeaders = { 'x-admin-token': adminToken }

  async function handleSync() {
    setSyncing(true)
    const res = await fetch('/api/admin/sync-schedule', { method: 'POST', headers: authHeaders })
    const data = await res.json()
    setSyncing(false)
    if (res.ok) { showToast(data.message); window.location.reload() }
    else showToast(data.error, false)
  }

  async function handleSave(matchId: number) {
    const s = scores[matchId]
    if (!s?.home || !s?.away) return
    setSaving(matchId)

    const saveRes = await fetch('/api/admin/save-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ matchId, homeScore: parseInt(s.home), awayScore: parseInt(s.away) }),
    })
    if (!saveRes.ok) {
      showToast((await saveRes.json()).error, false)
      setSaving(null)
      return
    }

    const calcRes = await fetch('/api/scores/recalculate', { method: 'POST', headers: authHeaders })
    const calcData = await calcRes.json()
    setSavedIds(prev => new Set([...prev, matchId]))
    setSaving(null)
    if (!calcRes.ok) {
      showToast(`נשמר ✓ אבל חישוב ניקוד נכשל: ${calcData.error ?? calcRes.status}`, false)
    } else {
      showToast(`נשמר ✓  ${calcData.message ?? ''}`)
    }
  }

  function setScore(id: number, side: 'home' | 'away', val: string) {
    setScores(p => ({ ...p, [id]: { ...(p[id] ?? { home: '', away: '' }), [side]: val } }))
  }

  async function handleReset(matchId: number) {
    if (!confirm('מחוק את תוצאת המשחק?')) return
    setResetting(matchId)
    const res = await fetch('/api/admin/reset-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ matchId }),
    })
    setResetting(null)
    if (res.ok) {
      const calcRes = await fetch('/api/scores/recalculate', { method: 'POST', headers: authHeaders })
      const calcData = await calcRes.json()
      showToast(`תוצאה נמחקה ✓  ${calcData.message ?? ''}`)
      window.location.reload()
    } else showToast((await res.json()).error, false)
  }

  function renderRow(m: Match) {
    const home = m.home_team_id ? getTeamById(m.home_team_id) : null
    const away = m.away_team_id ? getTeamById(m.away_team_id) : null
    const sc = scores[m.id]
    const isSaved = savedIds.has(m.id)
    const hasResult = m.home_score !== null
    const hv = sc?.home !== undefined ? sc.home : (hasResult ? String(m.home_score) : '')
    const av = sc?.away !== undefined ? sc.away : (hasResult ? String(m.away_score) : '')
    const canSave = sc?.home !== undefined && sc?.away !== undefined && sc.home !== '' && sc.away !== ''

    // Live result label
    const h = hv !== '' ? parseInt(hv) : null
    const a = av !== '' ? parseInt(av) : null
    const resultLabel = (h !== null && a !== null && !isNaN(h) && !isNaN(a))
      ? h > a ? { text: `${home?.name ?? 'Home'} wins`, color: '#276749', bg: '#c6f6d5' }
      : a > h ? { text: `${away?.name ?? 'Away'} wins`, color: '#c53030', bg: '#fed7d7' }
      : { text: 'Tie (X)', color: '#744210', bg: '#fefcbf' }
      : null

    return (
      // dir="ltr" matches the predict page — Home LEFT : Away RIGHT, same as users see
      <div key={m.id} dir="ltr" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 8,
        border: isSaved ? '1px solid #68d391' : hasResult ? '1px solid #e2e8f0' : '1px solid #eee',
        background: isSaved ? '#f0fff4' : hasResult ? '#f7fafc' : '#fafafa',
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 11, color: '#999', fontFamily: 'monospace', width: 32, flexShrink: 0 }}>M{m.id}</span>
        <span style={{ fontSize: 11, color: '#bbb', width: 48, flexShrink: 0 }}>
          {new Date(m.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>

        {/* Home team — "1" in 1X2 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#3182ce', background: '#ebf8ff', borderRadius: 4, padding: '1px 4px', flexShrink: 0 }}>1</span>
          {home && <span style={{ fontSize: 18, flexShrink: 0 }}>{getFlagEmoji(home.flag_code)}</span>}
          <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {home ? home.name : 'TBD'}
          </span>
        </div>

        {/* Score: home : away */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <input type="number" min="0" max="20" value={hv}
            onChange={e => setScore(m.id, 'home', e.target.value)}
            placeholder="–"
            style={{ width: 44, padding: '5px 4px', border: '1px solid #3182ce', borderRadius: 6, fontSize: 14, textAlign: 'center', fontFamily: 'monospace' }}
          />
          <span style={{ fontWeight: 700, color: '#999' }}>:</span>
          <input type="number" min="0" max="20" value={av}
            onChange={e => setScore(m.id, 'away', e.target.value)}
            placeholder="–"
            style={{ width: 44, padding: '5px 4px', border: '1px solid #e53e3e', borderRadius: 6, fontSize: 14, textAlign: 'center', fontFamily: 'monospace' }}
          />
          {resultLabel && (
            <span style={{ fontSize: 11, fontWeight: 700, color: resultLabel.color, background: resultLabel.bg, borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>
              {resultLabel.text}
            </span>
          )}
        </div>

        {/* Away team — "2" in 1X2 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {away ? away.name : 'TBD'}
          </span>
          {away && <span style={{ fontSize: 18, flexShrink: 0 }}>{getFlagEmoji(away.flag_code)}</span>}
          <span style={{ fontSize: 10, fontWeight: 700, color: '#e53e3e', background: '#fff5f5', borderRadius: 4, padding: '1px 4px', flexShrink: 0 }}>2</span>
        </div>

        {/* Save button */}
        <button
          onClick={() => handleSave(m.id)}
          disabled={saving === m.id || !canSave}
          style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 7, border: 'none',
            cursor: saving === m.id || !canSave ? 'not-allowed' : 'pointer',
            fontSize: 12, fontWeight: 600,
            background: isSaved ? '#48bb78' : canSave ? '#3182ce' : '#e2e8f0',
            color: isSaved || canSave ? '#fff' : '#aaa',
          }}
        >
          {saving === m.id ? '…' : isSaved ? '✓ נשמר' : 'שמור'}
        </button>
        {/* Reset button — shown when result exists */}
        {hasResult && (
          <button
            onClick={() => handleReset(m.id)}
            disabled={resetting === m.id}
            title="מחק תוצאה"
            style={{
              flexShrink: 0, padding: '5px 8px', borderRadius: 7,
              border: '1px solid #fc8181', background: 'transparent',
              color: '#fc8181', fontSize: 12, cursor: 'pointer',
            }}
          >
            {resetting === m.id ? '…' : '↩'}
          </button>
        )}
      </div>
    )
  }

  const byGroup: Record<string, Match[]> = {}
  for (const g of GROUP_LETTERS) byGroup[g] = groupMatches.filter(m => m.group_letter === g)

  const byRound: Record<string, Match[]> = {}
  for (const r of KNOCKOUT_ROUNDS) byRound[r] = knockoutMatches.filter(m => m.stage === r)

  function toggleG(g: string) { setOpenGroups(p => { const n = new Set(p); n.has(g) ? n.delete(g) : n.add(g); return n }) }
  function toggleR(r: string) { setOpenRounds(p => { const n = new Set(p); n.has(r) ? n.delete(r) : n.add(r); return n }) }

  async function handleSaveFutures() {
    setSavingFutures(true)
    const res = await fetch('/api/admin/save-futures-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        champion_team_id:      futures.champion_team_id      ? parseInt(futures.champion_team_id)      : null,
        top_scorer_team_id:    futures.top_scorer_team_id    ? parseInt(futures.top_scorer_team_id)    : null,
        golden_boot_team_id:   futures.golden_boot_team_id   ? parseInt(futures.golden_boot_team_id)   : null,
        most_conceded_team_id: futures.most_conceded_team_id ? parseInt(futures.most_conceded_team_id) : null,
        total_goals:           futures.total_goals           ? parseInt(futures.total_goals)           : null,
      }),
    })
    const data = await res.json()
    setSavingFutures(false)
    if (res.ok) {
      showToast('תוצאות עתידיות נשמרו ✓')
      const calcRes = await fetch('/api/scores/recalculate', { method: 'POST', headers: authHeaders })
      const calcData = await calcRes.json()
      showToast(`נשמר ✓  ${calcData.message ?? ''}`)
    } else {
      showToast(data.error, false)
    }
  }

  async function handleSaveStanding(g: string, overrideIds?: number[]) {
    setSavingStanding(g)
    const ids = overrideIds ?? standings[g] ?? [0,0,0,0]
    const res = await fetch('/api/admin/save-group-standings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ group_letter: g, team_ids: ids }),
    })
    const data = await res.json()
    setSavingStanding(null)
    if (!res.ok) {
      showToast(`שגיאה בשמירת בית ${g}: ${data.error}`, false)
      return
    }
    const isReset = ids.every((id: number) => !id)
    showToast(isReset ? `בית ${g} אופס ✓` : `בית ${g} נשמר ✓`)
  }

  async function handleSaveQualifiers() {
    setSavingQualifiers(true)
    const ids = [...thirdQualifiers]
    const res = await fetch('/api/admin/save-third-qualifiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ team_ids: ids }),
    })
    setSavingQualifiers(false)
    if (res.ok) showToast('נבחרות מקום שלישי נשמרו ✓')
    else showToast((await res.json()).error, false)
  }

  async function handleSaveStage(stage: string, ids: Set<number>) {
    setSavingStage(stage)
    const res = await fetch('/api/admin/save-stage-qualifiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ stage, team_ids: [...ids] }),
    })
    setSavingStage(null)
    if (res.ok) showToast(`שמור ✓`)
    else showToast((await res.json()).error, false)
  }

  function toggleStageTeam(stage: string, teamId: number, nextStages: string[]) {
    setStageTeams(prev => {
      const next = { ...prev, [stage]: new Set(prev[stage]) }
      if (next[stage].has(teamId)) {
        next[stage].delete(teamId)
        // Cascade: remove from all later stages too
        for (const s of nextStages) {
          next[s] = new Set([...prev[s]].filter(id => id !== teamId))
        }
      } else {
        next[stage].add(teamId)
      }
      return next
    })
  }

  const POSITION_LABELS = ['🥇 מקום 1', '🥈 מקום 2', '🥉 מקום 3', '4️⃣ מקום 4']

  const teamSelect = (key: keyof typeof futures, label: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568' }}>{label}</label>
      <select
        value={futures[key]}
        onChange={e => setFutures(p => ({ ...p, [key]: e.target.value }))}
        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: 13, background: '#fff' }}
      >
        <option value="">— לא ידוע —</option>
        {TEAMS.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
          <option key={t.id} value={t.id}>
            {getFlagEmoji(t.flag_code)} {t.name}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? '#276749' : '#c53030', color: '#fff',
          padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
          zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#1a202c', color: '#fff', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 18, fontWeight: 700 }}>דף המנהל</span>
          <span style={{ marginRight: 12, fontSize: 13, color: '#a0aec0' }}>TotoToren · {total} משחקים</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={async () => {
              showToast('מחשב ניקוד…')
              const res = await fetch('/api/scores/recalculate', { method: 'POST', headers: authHeaders })
              const d = await res.json()
              if (res.ok) {
                const dbg = d.debug
                const scores = (d.scores ?? []).map((s: any) => `${s.user_id.slice(0,6)}: total=${s.total} (match=${s.group_match} stand=${s.group_standing} adv=${s.advancement})`).join(' | ')
                showToast(`✓ משחקים=${dbg?.groupMatchesWithResults} שלב-קבוצות=${dbg?.groupStageComplete} | ${scores}`)
              } else showToast(`שגיאה: ${d.error}`, false)
            }}
            style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#276749', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            💾 חשב ניקוד מחדש
          </button>
          <button onClick={handleSync} disabled={syncing}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #4a5568', background: 'transparent', color: '#e2e8f0', cursor: syncing ? 'not-allowed' : 'pointer', fontSize: 13 }}>
            {syncing ? 'מסנכרן…' : '🔄 סנכרן לוח'}
          </button>
          <button onClick={handleLogout}
            style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#e53e3e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            התנתק
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: '24px auto', padding: '0 16px' }}>

        {total === 0 && (
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, textAlign: 'center', color: '#666', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize: 16, marginBottom: 8 }}>לא נמצאו משחקים במסד הנתונים.</p>
            <p style={{ fontSize: 13, color: '#999' }}>לחץ "סנכרן לוח" בכותרת כדי לטעון את 104 המשחקים.</p>
          </div>
        )}

        {/* Group stage */}
        {groupMatches.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#4a5568', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
              שלב הבתים
            </h2>
            {GROUP_LETTERS.map(g => {
              const ms = byGroup[g] ?? []
              if (!ms.length) return null
              const done = ms.filter(m => m.home_score !== null).length
              const open = openGroups.has(g)
              return (
                <div key={g} style={{ background: '#fff', borderRadius: 10, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                  <div onClick={() => toggleG(g)} style={{ padding: '11px 16px', background: '#f7fafc', borderBottom: open ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>בית {g}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: done === 6 ? '#c6f6d5' : '#e2e8f0', color: done === 6 ? '#276749' : '#718096' }}>
                        {done}/6
                      </span>
                    </div>
                    <span style={{ color: '#a0aec0', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
                  </div>
                  {open && <div style={{ padding: '10px 12px' }}>{ms.map(renderRow)}</div>}
                </div>
              )
            })}
          </section>
        )}

        {/* Group Final Standings */}
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#4a5568', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
            דירוג סופי — שלב הבתים
          </h2>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            הזן לאחר סיום כל 6 משחקי הבית. דירוג זה ישמש לניקוד חלק 2.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {GROUP_LETTERS.map(g => {
              const groupTeams = TEAMS.filter(t => t.group_letter === g)
              const gs = standings[g] ?? [0, 0, 0, 0]
              const done = gs.filter(Boolean).length
              return (
                <div key={g} style={{ background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>בית {g}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: done === 4 ? '#c6f6d5' : '#e2e8f0', color: done === 4 ? '#276749' : '#718096' }}>
                      {done}/4
                    </span>
                  </div>
                  {POSITION_LABELS.map((label, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, width: 64, flexShrink: 0, color: '#718096' }}>{label}</span>
                      <select
                        value={gs[i] || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0
                          setStandings(p => {
                            const arr = [...(p[g] ?? [0,0,0,0])]
                            arr[i] = val
                            return { ...p, [g]: arr }
                          })
                        }}
                        style={{ flex: 1, padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: 12 }}
                      >
                        <option value="">— בחר —</option>
                        {groupTeams.map(t => (
                          <option key={t.id} value={t.id}>
                            {getFlagEmoji(t.flag_code)} {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button
                      onClick={() => handleSaveStanding(g)}
                      disabled={savingStanding === g}
                      style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: done === 4 ? '#3182ce' : '#a0aec0', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {savingStanding === g ? '…' : 'שמור בית ' + g}
                    </button>
                    {done > 0 && (
                      <button
                        onClick={() => {
                          setStandings(p => ({ ...p, [g]: [0,0,0,0] }))
                          handleSaveStanding(g, [0,0,0,0])
                        }}
                        title="איפוס דירוג"
                        style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #fc8181', background: 'transparent', color: '#fc8181', fontSize: 12, cursor: 'pointer' }}
                      >↩</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* 3rd Place Qualifiers */}
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#4a5568', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 1 }}>
            נבחרות מקום שלישי שעלו לסבב 32
          </h2>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            בחר את 8 הנבחרות שסיימו 3רד ועלו לסבב 32 ({thirdQualifiers.size}/8 נבחרו).
          </p>
          <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 14 }}>
              {GROUP_LETTERS.map(g => {
                const pos3 = standings[g]?.[2]
                const team = pos3 ? getTeamById(pos3) : null
                if (!team) return (
                  <div key={g} style={{ padding: '8px 12px', borderRadius: 8, background: '#f7fafc', border: '1px solid #e2e8f0', opacity: 0.5 }}>
                    <span style={{ fontSize: 12, color: '#a0aec0' }}>בית {g} — הזן דירוג תחילה</span>
                  </div>
                )
                const checked = thirdQualifiers.has(team.id)
                return (
                  <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${checked ? '#68d391' : '#e2e8f0'}`, background: checked ? '#f0fff4' : '#fafafa', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setThirdQualifiers(prev => {
                        const next = new Set(prev)
                        if (e.target.checked) next.add(team.id)
                        else next.delete(team.id)
                        return next
                      })}
                    />
                    <span style={{ fontSize: 16 }}>{getFlagEmoji(team.flag_code)}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{team.name}</div>
                      <div style={{ fontSize: 10, color: '#a0aec0' }}>בית {g}</div>
                    </div>
                  </label>
                )
              })}
            </div>
            <button
              onClick={handleSaveQualifiers}
              disabled={savingQualifiers}
              style={{ padding: '8px 20px', borderRadius: 7, border: 'none', background: thirdQualifiers.size === 8 ? '#276749' : '#3182ce', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {savingQualifiers ? 'שומר…' : `💾 שמור (${thirdQualifiers.size}/8 נבחרו)`}
            </button>
          </div>
        </section>

        {/* ── Knockout stage qualifiers (R16 → QF → SF → Final → Champion) ── */}
        {(() => {
          // Build R32 pool from confirmed group standings + 3rd-place qualifiers
          const r32Set = new Set<number>()
          for (const g of GROUP_LETTERS) {
            const s = standings[g] ?? []
            if (s[0]) r32Set.add(s[0])
            if (s[1]) r32Set.add(s[1])
          }
          for (const id of thirdQualifiers) r32Set.add(id)
          const r32Pool = [...r32Set]

          // Show as soon as there are any R32 teams to work with
          if (r32Pool.length === 0) return null

          const nextOf: Record<string, string[]> = {
            r16: ['qf','sf','final','champion'], qf: ['sf','final','champion'],
            sf: ['final','champion'], final: ['champion'], champion: [],
          }
          const stages = [
            { key: 'r16',      label: 'שמינית גמר — 16 נבחרות', max: 16, pts: SCORING.ADV_R32,  pool: r32Pool },
            { key: 'qf',       label: 'רבע גמר — 8 נבחרות',      max: 8,  pts: SCORING.ADV_R16,  pool: [...stageTeams.r16] },
            { key: 'sf',       label: 'חצי גמר — 4 נבחרות',      max: 4,  pts: SCORING.ADV_QF,   pool: [...stageTeams.qf] },
            { key: 'final',    label: 'גמר — 2 נבחרות',           max: 2,  pts: SCORING.ADV_SF,   pool: [...stageTeams.sf] },
            { key: 'champion', label: '🏆 אלוף',                  max: 1,  pts: SCORING.ADV_FINAL, pool: [...stageTeams.final] },
          ]

          return (
            <section style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#4a5568', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                בחירת נבחרות לכל שלב נוקאאוט
              </h2>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                בחר את הנבחרות שעברו בכל שלב ולחץ 💾 לשמירה ועדכון ניקוד.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {stages.map(({ key, label, max, pts, pool }) => {
                  const selected = stageTeams[key as keyof typeof stageTeams]
                  const done = selected.size
                  return (
                    <div key={key} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                            background: done === max ? '#c6f6d5' : '#e2e8f0',
                            color: done === max ? '#276749' : '#718096' }}>{done}/{max}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#3182ce', background: '#ebf8ff', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>+{pts} נק׳ לנבחרת</span>
                          <button
                            onClick={async () => {
                              await handleSaveStage(key, selected)
                              const calcRes = await fetch('/api/scores/recalculate', { method: 'POST', headers: authHeaders })
                              const d = await calcRes.json()
                              if (!calcRes.ok) showToast(`שגיאה: ${d.error}`, false)
                              else showToast(`נשמר ✓ ${d.message ?? ''}`)
                            }}
                            disabled={savingStage === key}
                            style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: done > 0 ? '#276749' : '#a0aec0', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >{savingStage === key ? '…' : '💾 שמור + עדכן ניקוד'}</button>
                        </div>
                      </div>
                      {pool.length === 0 ? (
                        <p style={{ fontSize: 12, color: '#a0aec0', margin: 0 }}>— בחר נבחרות בשלב הקודם תחילה —</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                          {pool.map(id => {
                            const t = getTeamById(id)
                            if (!t) return null
                            const checked = selected.has(id)
                            const disabled = !checked && done >= max
                            return (
                              <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8,
                                border: `1px solid ${checked ? '#68d391' : '#e2e8f0'}`,
                                background: checked ? '#f0fff4' : disabled ? '#fafafa' : '#fff',
                                cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}>
                                <input
                                  type={max === 1 ? 'radio' : 'checkbox'}
                                  name={max === 1 ? `stage-${key}` : undefined}
                                  checked={checked} disabled={disabled}
                                  onChange={() => {
                                    if (max === 1) {
                                      setStageTeams(prev => ({ ...prev, [key]: new Set([id]) }))
                                    } else {
                                      toggleStageTeam(key, id, nextOf[key] ?? [])
                                    }
                                  }}
                                />
                                <span style={{ fontSize: 18 }}>{getFlagEmoji(t.flag_code)}</span>
                                <span style={{ fontSize: 12, fontWeight: checked ? 700 : 400 }}>{t.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })()}

        {/* Knockout */}
        {knockoutMatches.length > 0 && (
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#4a5568', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
              נוקאאוט
            </h2>
            {KNOCKOUT_ROUNDS.map(round => {
              const ms = byRound[round] ?? []
              if (!ms.length) return null
              const done = ms.filter(m => m.home_score !== null).length
              const open = openRounds.has(round)
              return (
                <div key={round} style={{ background: '#fff', borderRadius: 10, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                  <div onClick={() => toggleR(round)} style={{ padding: '11px 16px', background: '#f7fafc', borderBottom: open ? '1px solid #eee' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{ROUND_LABELS[round]}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: done === ms.length ? '#c6f6d5' : '#e2e8f0', color: done === ms.length ? '#276749' : '#718096' }}>
                        {done}/{ms.length}
                      </span>
                    </div>
                    <span style={{ color: '#a0aec0', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
                  </div>
                  {open && <div style={{ padding: '10px 12px' }}>{ms.map(renderRow)}</div>}
                </div>
              )
            })}
          </section>
        )}

        {/* Knockout Advancement — placeholder, real one is after 3rd qualifiers */}
        {false && (() => {
          const winnerOf = (m: Match) =>
            m.home_score !== null && m.away_score !== null && m.home_team_id && m.away_team_id
              ? (m.home_score > m.away_score ? m.home_team_id : m.away_team_id)
              : null

          const tiers: { stage: string; label: string; pts: number; nextLabel: string }[] = [
            { stage: 'r32',       label: 'סבב 32 (עלו לשמינית גמר)', pts: 5, nextLabel: 'R16' },
            { stage: 'r16',       label: 'שמינית גמר (עלו לרבע גמר)', pts: 6, nextLabel: 'QF' },
            { stage: 'qf',        label: 'רבע גמר (עלו לחצי גמר)',    pts: 7, nextLabel: 'SF' },
            { stage: 'sf',        label: 'חצי גמר (עלו לגמר)',         pts: 8, nextLabel: 'Final' },
            { stage: 'final',     label: 'גמר — האלוף',                pts: 15, nextLabel: 'Champion' },
          ]

          return (
            <section style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#4a5568', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                נבחרות שעלו בכל שלב
              </h2>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                מחושב אוטומטית מתוצאות המשחקים. ניקוד לכל נבחרת שניחשת נכון.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tiers.map(({ stage, label, pts }) => {
                  const stageMatches = knockoutMatches.filter(m => m.stage === stage)
                  const advancingIds = stageMatches.map(winnerOf).filter(Boolean) as number[]
                  const done = advancingIds.length
                  const total = stageMatches.length

                  return (
                    <div key={stage} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: done > 0 ? 10 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: done === total && total > 0 ? '#c6f6d5' : '#e2e8f0', color: done === total && total > 0 ? '#276749' : '#718096' }}>
                            {done}/{total}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#3182ce', background: '#ebf8ff', padding: '3px 10px', borderRadius: 20 }}>
                          +{pts} נק׳ לכל נבחרת נכונה
                        </span>
                      </div>
                      {done > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {advancingIds.map(id => {
                            const t = getTeamById(id)
                            if (!t) return null
                            return (
                              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 10px' }}>
                                <span style={{ fontSize: 18 }}>{getFlagEmoji(t.flag_code)}</span>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {done === 0 && (
                        <span style={{ fontSize: 12, color: '#a0aec0' }}>— יש להזין תוצאות משחקי {label.split('(')[0].trim()} תחילה —</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })()}

        {/* Knockout Advancement display (auto from match scores) */}
        {knockoutMatches.length > 0 && (() => {
          const winnerOf = (m: Match) =>
            m.home_score !== null && m.away_score !== null && m.home_team_id && m.away_team_id
              ? (m.home_score > m.away_score ? m.home_team_id : m.away_team_id)
              : null
          const tiers = [
            { stage: 'r32',   label: 'עלו לשמינית גמר',   pts: 5 },
            { stage: 'r16',   label: 'עלו לרבע גמר',      pts: 6 },
            { stage: 'qf',    label: 'עלו לחצי גמר',      pts: 7 },
            { stage: 'sf',    label: 'עלו לגמר',           pts: 8 },
            { stage: 'final', label: 'אלוף',               pts: 15 },
          ]
          // Auto-derive R32 qualifiers: 1st + 2nd from each group + saved 3rd-place qualifiers
          const r32Auto: number[] = []
          for (const g of GROUP_LETTERS) {
            const order = standings[g] ?? []
            if (order[0]) r32Auto.push(order[0])
            if (order[1]) r32Auto.push(order[1])
          }
          // Include the manually-saved 3rd-place qualifiers in the R32 display
          for (const id of thirdQualifiers) {
            if (!r32Auto.includes(id)) r32Auto.push(id)
          }
          const r32Total = 24 + 8  // max: 24 from groups + 8 third-place

          return (
            <section style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#4a5568', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
                נבחרות שעלו בכל שלב
              </h2>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                מחושב אוטומטית. ניקוד לכל נבחרת שניחשת נכון.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* ── R32 qualifiers — AUTO from group standings ── */}
                <div style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: r32Auto.length > 0 ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>שלב 32 — 1+2 מכל בית + מקום שלישי</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: r32Auto.length === r32Total ? '#c6f6d5' : '#e2e8f0', color: r32Auto.length === r32Total ? '#276749' : '#718096' }}>
                        {r32Auto.length}/{r32Total}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#2b6cb0', background: '#bee3f8', padding: '3px 10px', borderRadius: 20 }}>
                      +4 נק׳ לכל נבחרת נכונה
                    </span>
                  </div>
                  {r32Auto.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {r32Auto.map(id => {
                        const t = getTeamById(id)
                        return t ? (
                          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid #bee3f8', borderRadius: 7, padding: '4px 8px' }}>
                            <span style={{ fontSize: 16 }}>{getFlagEmoji(t.flag_code)}</span>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#90cdf4' }}>— הזן דירוגי בתים למעלה —</span>
                  )}
                </div>

                {tiers.map(({ stage, label, pts }) => {
                  const ms = knockoutMatches.filter(m => m.stage === stage)
                  const ids = ms.map(winnerOf).filter(Boolean) as number[]
                  return (
                    <div key={stage} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: ids.length > 0 ? 10 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: ids.length === ms.length && ms.length > 0 ? '#c6f6d5' : '#e2e8f0', color: ids.length === ms.length && ms.length > 0 ? '#276749' : '#718096' }}>
                            {ids.length}/{ms.length}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#3182ce', background: '#ebf8ff', padding: '3px 10px', borderRadius: 20 }}>
                          +{pts} נק׳ לכל נבחרת נכונה
                        </span>
                      </div>
                      {ids.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {ids.map(id => {
                            const t = getTeamById(id)
                            return t ? (
                              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '5px 10px' }}>
                                <span style={{ fontSize: 18 }}>{getFlagEmoji(t.flag_code)}</span>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                              </div>
                            ) : null
                          })}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#a0aec0' }}>— הזן תוצאות משחקים תחילה —</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })()}

        {/* Futures Results */}
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#4a5568', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1 }}>
            תוצאות עתידיות (פיוצ׳רס)
          </h2>
          <div style={{ background: '#fff', borderRadius: 10, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
              הזן לאחר סיום הטורניר. שמירה תפעיל מחדש חישוב ניקוד.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              {teamSelect('champion_team_id', '🏆 הנבחרת הזוכה')}
              {teamSelect('top_scorer_team_id', '⚽ הנבחרת שהבקיעה הכי הרבה')}
              {teamSelect('golden_boot_team_id', '👟 נעל הזהב (הנבחרת שממנה הכובש הגיע)')}
              {teamSelect('most_conceded_team_id', '🥅 הנבחרת שספגה הכי הרבה')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a5568' }}>📊 סה״כ שערים בטורניר</label>
                <input
                  type="number" min="0" max="500"
                  value={futures.total_goals}
                  onChange={e => setFutures(p => ({ ...p, total_goals: e.target.value }))}
                  placeholder="e.g. 156"
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e0', fontSize: 13 }}
                />
              </div>
            </div>
            <button
              onClick={handleSaveFutures}
              disabled={savingFutures}
              style={{
                padding: '8px 20px', borderRadius: 7, border: 'none',
                background: savingFutures ? '#aaa' : '#276749',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: savingFutures ? 'not-allowed' : 'pointer',
              }}
            >
              {savingFutures ? 'שומר…' : '💾 שמור תוצאות עתידיות + עדכן ניקוד'}
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
