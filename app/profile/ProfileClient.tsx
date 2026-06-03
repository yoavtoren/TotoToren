'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TEAMS, getFlagEmoji, getTeamById } from '@/data/teams'
import { GROUP_MATCHES } from '@/data/match-schedule'
import { cn, pad } from '@/lib/utils'
import type { Profile } from '@/types'

interface LeaderboardRow {
  user_id: string
  total_score: number
  profiles: { display_name: string; avatar_url: string | null } | null
}

interface Props {
  userId: string
  email: string
  profile: Profile | null
  leaderboard: LeaderboardRow[]
  predictedMatchIds: number[]
}

// ── Helpers ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">{children}</h2>
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/50 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0 justify-end">{children}</div>
    </div>
  )
}

// ── Avatar ─────────────────────────────────────────────────────

function Initials({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const letters = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={cn(
      'rounded-full bg-indigo-600/60 flex items-center justify-center font-bold text-white shrink-0',
      size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-7 h-7 text-xs',
    )}>
      {letters || '?'}
    </div>
  )
}

function AvatarImg({ url, name, size = 'lg' }: { url: string | null; name: string; size?: 'sm' | 'lg' }) {
  const px = size === 'lg' ? 80 : 28
  if (url) return (
    <Image src={url} alt={name} width={px} height={px}
      className={cn('rounded-full object-cover shrink-0', size === 'lg' ? 'w-20 h-20' : 'w-7 h-7')} />
  )
  return <Initials name={name} size={size} />
}

// ── Standing row ───────────────────────────────────────────────

function StandingRow({ rank, name, score, avatarUrl, highlight, gap }: {
  rank: number; name: string; score: number; avatarUrl: string | null
  highlight?: boolean; gap?: number
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-xl',
      highlight ? 'bg-indigo-500/20 ring-1 ring-indigo-400/40' : 'bg-white/5',
    )}>
      <span className="text-xs text-white/30 w-5 text-right shrink-0">
        {rank === 1 ? '🥇' : `#${rank}`}
      </span>
      <AvatarImg url={avatarUrl} name={name} size="sm" />
      <span className={cn('flex-1 text-sm truncate', highlight ? 'text-white font-semibold' : 'text-white/70')}>
        {name}
        {highlight && <span className="mr-1.5 text-xs text-indigo-300">← אתה</span>}
      </span>
      <span className="text-sm font-mono font-semibold text-white/80 shrink-0">{score}</span>
      {gap !== undefined && (
        <span className={cn(
          'text-[10px] font-mono shrink-0 w-14 text-right',
          gap > 0 ? 'text-red-400/70' : gap < 0 ? 'text-emerald-400/70' : 'text-white/20',
        )}>
          {gap > 0 ? `−${gap}` : gap < 0 ? `+${Math.abs(gap)}` : 'tied'}
        </span>
      )}
    </div>
  )
}

// ── Countdown ──────────────────────────────────────────────────

function Countdown({ targetUtc }: { targetUtc: string }) {
  const [ms, setMs] = useState(() => new Date(targetUtc).getTime() - Date.now())
  useEffect(() => {
    const id = setInterval(() => setMs(new Date(targetUtc).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [targetUtc])
  if (ms <= 0) return <span className="text-[10px] text-emerald-400 font-semibold">המשחק התחיל</span>
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (d > 0) return <span className="text-xs text-white/60 font-mono">{d}d {pad(h)}h {pad(m)}m</span>
  return <span className="text-sm text-amber-400 font-mono font-bold tabular-nums">{pad(h)}:{pad(m)}:{pad(s)}</span>
}

// ── Next game card ─────────────────────────────────────────────

function MatchCard({ match, label, color }: {
  match: (typeof GROUP_MATCHES)[0]
  label: string
  color: 'blue' | 'emerald'
}) {
  const localDate = new Date(match.kickoff_utc).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  const localTime = new Date(match.kickoff_utc).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  })
  return (
    <div className="glass rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className={cn(
          'text-[10px] font-bold uppercase tracking-wider',
          color === 'blue' ? 'text-blue-400' : 'text-emerald-400',
        )}>{label}</span>
        <span className="text-[10px] text-white/30 font-mono">בית {(match as any).group}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-white truncate flex-1">{match.home}</span>
        <span className="text-white/30 text-xs font-bold shrink-0">נגד</span>
        <span className="text-sm font-medium text-white truncate flex-1 text-right">{match.away}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">{localDate} · {localTime}</span>
        <Countdown targetUtc={match.kickoff_utc} />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────

export default function ProfileClient({ userId, email, profile: initialProfile, leaderboard, predictedMatchIds }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile & Record<string, any>>(initialProfile ?? {
    id: userId, display_name: '', avatar_url: null,
    is_admin: false, favorite_team_id: null,
    notifications_whistle: true, created_at: new Date().toISOString(),
  })

  const [displayName, setDisplayName] = useState(profile.display_name)
  const [nameEditing, setNameEditing] = useState(false)
  const [teamPickerOpen, setTeamPickerOpen] = useState(false)
  const [teamSearch, setTeamSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, startSaving] = useTransition()
  const [deleting, startDeleting] = useTransition()
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Password change
  const [pwOpen, setPwOpen] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, startPwSave] = useTransition()

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function patchProfile(patch: Record<string, any>) {
    const next = { ...profile, ...patch }
    setProfile(next)
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
    if (error) showToast(error.message, false)
  }

  // ── Avatar upload ────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${userId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await patchProfile({ avatar_url: publicUrl + `?t=${Date.now()}` })
      showToast('תמונה עודכנה!')
    } catch (err: any) {
      showToast(err.message ?? 'ההעלאה נכשלה', false)
    } finally {
      setUploading(false)
    }
  }

  // ── Display name save ────────────────────────────────────────
  function saveName() {
    const trimmed = displayName.trim()
    if (!trimmed || trimmed === profile.display_name) { setNameEditing(false); return }
    startSaving(async () => {
      await patchProfile({ display_name: trimmed })
      setNameEditing(false)
      showToast('שם עודכן!')
    })
  }

  // ── Password change ──────────────────────────────────────────
  function handleChangePassword() {
    if (newPw !== confirmPw) { showToast('הסיסמאות אינן תואמות', false); return }
    if (newPw.length < 6) { showToast('מינימום 6 תווים', false); return }
    startPwSave(async () => {
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) { showToast(error.message, false); return }
      showToast('סיסמה עודכנה!')
      setPwOpen(false); setNewPw(''); setConfirmPw('')
    })
  }

  // ── Delete account ───────────────────────────────────────────
  function handleDelete() {
    startDeleting(async () => {
      const res = await fetch('/api/profile/delete', { method: 'DELETE' })
      if (!res.ok) { showToast('המחיקה נכשלה — נסה שוב', false); return }
      await supabase.auth.signOut()
      router.push('/')
    })
  }

  // ── Leaderboard position ─────────────────────────────────────
  const myIndex = leaderboard.findIndex(r => r.user_id === userId)
  const myScore = myIndex >= 0 ? leaderboard[myIndex] : null
  const myRank = myIndex + 1
  const total = leaderboard.length
  const myPts = myScore?.total_score ?? 0
  const above = myIndex > 0 ? leaderboard[myIndex - 1] : null
  const below = myIndex < total - 1 ? leaderboard[myIndex + 1] : null
  const first = leaderboard[0] ?? null
  const last = leaderboard[total - 1] ?? null

  const standingRows: Array<{ row: LeaderboardRow; rank: number; isMe: boolean }> = []
  const seen = new Set<string>()
  function addRow(r: LeaderboardRow | null, rank: number, isMe: boolean) {
    if (!r || seen.has(r.user_id)) return
    seen.add(r.user_id)
    standingRows.push({ row: r, rank, isMe })
  }
  if (first && first.user_id !== userId) addRow(first, 1, false)
  if (above) addRow(above, myRank - 1, false)
  if (myScore) addRow(myScore, myRank, true)
  if (below) addRow(below, myRank + 1, false)
  if (last && last.user_id !== userId) addRow(last, total, false)

  // ── Next game & next bet ─────────────────────────────────────
  const now = Date.now()
  const predSet = new Set(predictedMatchIds)
  const sortedMatches = [...GROUP_MATCHES].sort(
    (a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime()
  )
  const nextGame = sortedMatches.find(m => new Date(m.kickoff_utc).getTime() > now)
  const nextBet  = sortedMatches.find(m => new Date(m.kickoff_utc).getTime() > now && predSet.has(m.match))

  // ── Team picker ──────────────────────────────────────────────
  const filteredTeams = TEAMS
    .filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
  const favTeam = profile.favorite_team_id ? getTeamById(profile.favorite_team_id) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-20 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-fade-in',
          toast.ok ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white',
        )}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* ── Profile header ─────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-5">

          {/* Avatar */}
          <div className="relative group shrink-0">
            <AvatarImg url={profile.avatar_url} name={profile.display_name || 'User'} size="lg" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
            >
              {uploading ? '…' : '📷 עריכה'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name */}
            {nameEditing ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setNameEditing(false) }}
                  className="glass-input py-1.5 px-2 text-lg font-bold flex-1" maxLength={40} />
                <button onClick={saveName} disabled={saving}
                  className="glass px-3 py-1.5 rounded-lg text-sm text-emerald-300 hover:text-emerald-200">
                  {saving ? '…' : 'שמור'}
                </button>
                <button onClick={() => { setDisplayName(profile.display_name); setNameEditing(false) }}
                  className="text-white/30 hover:text-white/60 text-sm">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/name">
                <h1 className="text-xl font-bold text-white truncate">
                  {profile.display_name || 'אנונימי'}
                </h1>
                <button onClick={() => setNameEditing(true)}
                  className="text-white/20 hover:text-white/60 transition-colors opacity-0 group-hover/name:opacity-100 text-sm"
                  title="ערוך שם">✎</button>
              </div>
            )}

            {/* Email */}
            <p className="text-xs text-white/35 font-mono truncate">{email}</p>

            {/* Score + rank */}
            {myScore ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-bold text-white tabular-nums">{myPts}</span>
                <span className="text-white/40 text-sm">נק'</span>
                <span className="glass px-2 py-0.5 rounded-full text-xs text-white/60 font-mono">
                  #{myRank} מתוך {total}
                </span>
                {favTeam && (
                  <span className="flex items-center gap-1 glass px-2 py-0.5 rounded-full text-xs text-white/60">
                    {getFlagEmoji(favTeam.flag_code)} {favTeam.name}
                  </span>
                )}
              </div>
            ) : (
              favTeam && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-base">{getFlagEmoji(favTeam.flag_code)}</span>
                  <span className="text-sm text-white/50">{favTeam.name}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ── Coming Up ─────────────────────────────────────────── */}
      {(nextGame || nextBet) && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <SectionLabel>בקרוב</SectionLabel>
          <div className={cn('grid gap-3', nextGame && nextBet && nextGame.match !== nextBet.match ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
            {nextGame && <MatchCard match={nextGame} label="המשחק הבא" color="blue" />}
            {nextBet && nextBet.match !== nextGame?.match && (
              <MatchCard match={nextBet} label="ההימור הבא" color="emerald" />
            )}
            {nextBet && nextBet.match === nextGame?.match && (
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[10px] text-emerald-400">✓</span>
                <span className="text-xs text-emerald-400/70">יש לך ניחוש למשחק זה</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── My Standing ───────────────────────────────────────── */}
      {leaderboard.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-2">
          <SectionLabel>המיקום שלי</SectionLabel>
          {standingRows.map(({ row, rank, isMe }, i) => {
            const prev = standingRows[i - 1]
            const showDivider = prev && Math.abs(rank - prev.rank) > 1
            const gap = (row.total_score ?? 0) - myPts
            return (
              <div key={row.user_id}>
                {showDivider && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[9px] text-white/20 font-mono">···</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                )}
                <StandingRow
                  rank={rank}
                  name={row.profiles?.display_name ?? 'לא ידוע'}
                  score={row.total_score ?? 0}
                  avatarUrl={row.profiles?.avatar_url ?? null}
                  highlight={isMe}
                  gap={isMe ? undefined : gap}
                />
              </div>
            )
          })}
          {!myScore && (
            <p className="text-sm text-white/30 text-center py-2">אין ניקוד עדיין — שמור ניחושים תחילה.</p>
          )}
        </div>
      )}

      {/* ── Settings ──────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 space-y-1">
        <SectionLabel>הגדרות</SectionLabel>

        {/* Display name */}
        <Row label="שם תצוגה">
          <span className="text-sm text-white/70 truncate max-w-[160px]">{profile.display_name || '—'}</span>
          <button onClick={() => setNameEditing(true)}
            className="text-xs text-white/30 hover:text-white/70 transition-colors glass px-2 py-1 rounded-lg">
            עריכה
          </button>
        </Row>

        {/* Email */}
        <Row label="אימייל">
          <span className="text-xs text-white/50 font-mono truncate max-w-[200px]">{email}</span>
        </Row>

        {/* Password */}
        <Row label="סיסמה">
          {!pwOpen ? (
            <button onClick={() => setPwOpen(true)}
              className="text-xs text-white/30 hover:text-white/70 transition-colors glass px-2 py-1 rounded-lg">
              שינוי
            </button>
          ) : (
            <div className="flex-1 space-y-2 ml-0">
              <input type="password" placeholder="סיסמה חדשה" value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="glass-input py-1.5 px-2 text-sm w-full" />
              <input type="password" placeholder="אימות סיסמה" value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleChangePassword() }}
                className="glass-input py-1.5 px-2 text-sm w-full" />
              <div className="flex gap-2">
                <button onClick={handleChangePassword} disabled={pwSaving || !newPw}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-600/60 hover:bg-emerald-600/80 disabled:opacity-40 text-white text-xs font-semibold transition-colors">
                  {pwSaving ? '…' : 'שמור'}
                </button>
                <button onClick={() => { setPwOpen(false); setNewPw(''); setConfirmPw('') }}
                  className="px-3 py-1.5 rounded-lg glass text-white/50 text-xs hover:text-white/80">
                  ביטול
                </button>
              </div>
            </div>
          )}
        </Row>

        {/* Favourite team */}
        <Row label="קבוצה אהובה">
          <button onClick={() => setTeamPickerOpen(o => !o)}
            className="flex items-center gap-1.5 glass glass-hover px-2.5 py-1.5 rounded-lg text-sm">
            {favTeam ? (
              <><span>{getFlagEmoji(favTeam.flag_code)}</span><span className="text-white/80">{favTeam.name}</span></>
            ) : (
              <span className="text-white/40 text-xs">בחר…</span>
            )}
            <span className="text-white/25 text-xs ml-1">{teamPickerOpen ? '▲' : '▼'}</span>
          </button>
        </Row>

        {teamPickerOpen && (
          <div className="mt-1 glass rounded-xl p-3 space-y-2">
            <input autoFocus placeholder="חפש קבוצה…" value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
              className="glass-input py-1.5 px-2 text-sm w-full" />
            <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto no-scrollbar">
              {filteredTeams.map(t => (
                <button key={t.id}
                  onClick={() => { patchProfile({ favorite_team_id: t.id }); setTeamPickerOpen(false); setTeamSearch(''); showToast(`${t.name} נבחרה!`) }}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-right transition-colors',
                    profile.favorite_team_id === t.id ? 'bg-indigo-500/30 text-indigo-100' : 'hover:bg-white/10 text-white/70',
                  )}>
                  <span className="text-base leading-none">{getFlagEmoji(t.flag_code)}</span>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
            {profile.favorite_team_id && (
              <button onClick={() => { patchProfile({ favorite_team_id: null }); setTeamPickerOpen(false) }}
                className="text-xs text-white/30 hover:text-red-400 transition-colors">
                הסר קבוצה
              </button>
            )}
          </div>
        )}

        {/* Whistle */}
        <Row label="שריקה בשמירה 🔔">
          <span className="text-xs text-white/30 mr-2">נגן צליל כששומרים ניחושים</span>
          <button
            onClick={() => patchProfile({ notifications_whistle: !profile.notifications_whistle })}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
              profile.notifications_whistle ? 'bg-indigo-500' : 'bg-white/20',
            )}
          >
            <span className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
              profile.notifications_whistle ? 'translate-x-6' : 'translate-x-1',
            )} />
          </button>
        </Row>
      </div>

      {/* ── Danger zone ───────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-red-500/20">
        <SectionLabel>אזור מסוכן</SectionLabel>

        {!deleteConfirm ? (
          <Row label="מחיקת חשבון">
            <span className="text-xs text-white/30 mr-2">מוחק פרופיל וכל הניחושים</span>
            <button onClick={() => setDeleteConfirm(true)}
              className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-xs hover:bg-red-500/15 transition-colors shrink-0">
              מחיקה…
            </button>
          </Row>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300">
              הקלד <span className="font-mono font-bold">DELETE</span> לאישור. לא ניתן לביטול.
            </p>
            <input autoFocus value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE" className="glass-input py-1.5 px-3 text-sm font-mono w-full" />
            <div className="flex gap-2">
              <button onClick={handleDelete}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 py-2 rounded-lg bg-red-600/70 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                {deleting ? 'מוחק…' : 'מחיקה לצמיתות'}
              </button>
              <button onClick={() => { setDeleteConfirm(false); setDeleteInput('') }}
                className="px-4 py-2 rounded-lg glass text-white/60 text-sm hover:text-white/80 transition-colors">
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
