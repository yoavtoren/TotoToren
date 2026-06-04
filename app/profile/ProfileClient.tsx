'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TEAMS, getFlagEmoji, getTeamById, getTeamIdByName } from '@/data/teams'
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

// ── Avatar ─────────────────────────────────────────────────────

function Initials({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const letters = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={cn(
      'rounded-full bg-indigo-600/70 flex items-center justify-center font-bold text-white shrink-0',
      size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-8 h-8 text-xs',
    )}>
      {letters || '?'}
    </div>
  )
}

function AvatarImg({ url, name, size = 'lg' }: { url: string | null; name: string; size?: 'sm' | 'lg' }) {
  const px = size === 'lg' ? 96 : 32
  if (url) return (
    <Image src={url} alt={name} width={px} height={px}
      className={cn('rounded-full object-cover shrink-0', size === 'lg' ? 'w-24 h-24' : 'w-8 h-8')} />
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
      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
      highlight
        ? 'bg-indigo-500/20 ring-1 ring-indigo-400/30'
        : 'bg-white/5 hover:bg-white/8',
    )}>
      <span className="text-xs text-white/30 w-6 text-center shrink-0 font-mono">
        {rank === 1 ? '🥇' : `#${rank}`}
      </span>
      <AvatarImg url={avatarUrl} name={name} size="sm" />
      <span className={cn('flex-1 text-sm truncate', highlight ? 'text-white font-semibold' : 'text-white/70')}>
        {name}
        {highlight && <span className="mr-2 text-[11px] text-indigo-300 font-normal">אתה</span>}
      </span>
      <span className="text-sm font-mono font-semibold text-white/80 shrink-0">{score}</span>
      {gap !== undefined && (
        <span className={cn(
          'text-[10px] font-mono shrink-0 w-12 text-left',
          gap > 0 ? 'text-red-400/70' : gap < 0 ? 'text-emerald-400/70' : 'text-white/20',
        )}>
          {gap > 0 ? `−${gap}` : gap < 0 ? `+${Math.abs(gap)}` : '—'}
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
  if (ms <= 0) return <span className="text-xs text-emerald-400 font-semibold">המשחק התחיל</span>
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (d > 0) return <span className="text-sm text-white/60 font-mono tabular-nums">{d}d {pad(h)}h {pad(m)}m</span>
  return <span className="text-lg text-amber-400 font-mono font-bold tabular-nums">{pad(h)}:{pad(m)}:{pad(s)}</span>
}

// ── Match card ─────────────────────────────────────────────────

function MatchCard({ match, label, color }: {
  match: (typeof GROUP_MATCHES)[0]
  label: string
  color: 'blue' | 'emerald'
}) {
  const homeTeam = getTeamById(getTeamIdByName(match.home) ?? 0)
  const awayTeam = getTeamById(getTeamIdByName(match.away) ?? 0)
  const localDate = new Date(match.kickoff_utc).toLocaleDateString('he-IL', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
  const localTime = new Date(match.kickoff_utc).toLocaleTimeString('he-IL', {
    hour: '2-digit', minute: '2-digit',
  })
  const accent = color === 'blue'
    ? { label: 'text-blue-300', dot: 'bg-blue-400', border: 'border-blue-400/20' }
    : { label: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-emerald-400/20' }
  return (
    <div className={cn('rounded-xl p-4 space-y-3 border bg-white/5', accent.border)}>
      <div className="flex items-center gap-1.5">
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', accent.dot)} />
        <span className={cn('text-[10px] font-bold uppercase tracking-wider', accent.label)}>{label}</span>
        <span className="text-[10px] text-white/25 font-mono mr-auto">Group {(match as any).group}</span>
      </div>
      <div dir="ltr" className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {homeTeam && <span className="text-lg shrink-0">{getFlagEmoji(homeTeam.flag_code)}</span>}
          <span className="text-sm font-semibold text-white truncate">{match.home}</span>
        </div>
        <span className="text-white/20 text-xs font-bold px-1 shrink-0">—</span>
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm font-semibold text-white truncate text-right">{match.away}</span>
          {awayTeam && <span className="text-lg shrink-0">{getFlagEmoji(awayTeam.flag_code)}</span>}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/30">{localDate} · {localTime}</span>
        <Countdown targetUtc={match.kickoff_utc} />
      </div>
    </div>
  )
}

// ── Settings row ───────────────────────────────────────────────

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-white/6 last:border-0">
      <span className="text-sm text-white/50 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0 justify-end">{children}</div>
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

  function saveName() {
    const trimmed = displayName.trim()
    if (!trimmed || trimmed === profile.display_name) { setNameEditing(false); return }
    startSaving(async () => {
      await patchProfile({ display_name: trimmed })
      setNameEditing(false)
      showToast('שם עודכן!')
    })
  }

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

  function handleDelete() {
    startDeleting(async () => {
      const res = await fetch('/api/profile/delete', { method: 'DELETE' })
      if (!res.ok) { showToast('המחיקה נכשלה — נסה שוב', false); return }
      await supabase.auth.signOut()
      router.push('/')
    })
  }

  // Leaderboard context
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

  // Next matches
  const now = Date.now()
  const predSet = new Set(predictedMatchIds)
  const sortedMatches = [...GROUP_MATCHES].sort(
    (a, b) => new Date(a.kickoff_utc).getTime() - new Date(b.kickoff_utc).getTime()
  )
  const nextGame = sortedMatches.find(m => new Date(m.kickoff_utc).getTime() > now)
  const nextBet  = sortedMatches.find(m => new Date(m.kickoff_utc).getTime() > now && predSet.has(m.match))

  const filteredTeams = TEAMS
    .filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
  const favTeam = profile.favorite_team_id ? getTeamById(profile.favorite_team_id) : null

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-4" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-20 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-fade-in',
          toast.ok ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white',
        )}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* ── Profile hero ───────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 text-center space-y-4">
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative group">
            <AvatarImg url={profile.avatar_url} name={profile.display_name || 'User'} size="lg" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium"
            >
              {uploading ? '…' : '📷'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Name */}
        {nameEditing ? (
          <div className="flex items-center justify-center gap-2 px-4">
            <input autoFocus value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setNameEditing(false) }}
              className="glass-input py-1.5 px-3 text-lg font-bold text-center flex-1 max-w-[200px]" maxLength={40} />
            <button onClick={saveName} disabled={saving}
              className="glass px-3 py-1.5 rounded-lg text-sm text-emerald-300 hover:text-emerald-200 shrink-0">
              {saving ? '…' : 'שמור'}
            </button>
            <button onClick={() => { setDisplayName(profile.display_name); setNameEditing(false) }}
              className="text-white/30 hover:text-white/60 text-sm shrink-0">✕</button>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2 group/name">
              <h1 className="text-2xl font-bold text-white">{profile.display_name || 'אנונימי'}</h1>
              <button onClick={() => setNameEditing(true)}
                className="text-white/20 hover:text-white/60 transition-colors opacity-0 group-hover/name:opacity-100 text-sm"
                title="ערוך שם">✎</button>
            </div>
            <p className="text-xs text-white/35 font-mono">{email}</p>
            {favTeam && (
              <p className="text-sm text-white/45 pt-0.5">
                {getFlagEmoji(favTeam.flag_code)} {favTeam.name}
              </p>
            )}
          </div>
        )}

        {/* Stat pills */}
        {myScore && (
          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="bg-white/8 rounded-xl px-5 py-2.5 text-center min-w-[80px]">
              <p className="text-2xl font-bold text-white tabular-nums">{myPts}</p>
              <p className="text-[10px] text-white/40 mt-0.5">נקודות</p>
            </div>
            <div className="bg-indigo-500/20 rounded-xl px-5 py-2.5 text-center min-w-[80px] ring-1 ring-indigo-400/20">
              <p className="text-2xl font-bold text-indigo-200 tabular-nums">#{myRank}</p>
              <p className="text-[10px] text-indigo-300/60 mt-0.5">מתוך {total}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Coming Up ─────────────────────────────────────────── */}
      {(nextGame || nextBet) && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">בקרוב</h2>
          <div className={cn('grid gap-3', nextGame && nextBet && nextGame.match !== nextBet.match ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}>
            {nextGame && <MatchCard match={nextGame} label="המשחק הבא" color="blue" />}
            {nextBet && nextBet.match !== nextGame?.match && (
              <MatchCard match={nextBet} label="ההימור הבא" color="emerald" />
            )}
            {nextBet && nextBet.match === nextGame?.match && (
              <div className="flex items-center gap-1.5 px-1 pt-0.5">
                <span className="text-emerald-400 text-sm">✓</span>
                <span className="text-xs text-emerald-400/70">יש לך ניחוש למשחק זה</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── My Standing ───────────────────────────────────────── */}
      {leaderboard.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-2">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">המיקום שלי</h2>
          {standingRows.map(({ row, rank, isMe }, i) => {
            const prev = standingRows[i - 1]
            const showDivider = prev && Math.abs(rank - prev.rank) > 1
            const gap = (row.total_score ?? 0) - myPts
            return (
              <div key={row.user_id}>
                {showDivider && (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-[9px] text-white/20 font-mono">···</span>
                    <div className="flex-1 h-px bg-white/8" />
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
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-1">
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-widest">הגדרות</h2>
        </div>

        <div className="px-5 pb-4 divide-y divide-white/6">
          {/* Display name */}
          <SettingRow label="שם תצוגה">
            <span className="text-sm text-white/60 truncate max-w-[140px]">{profile.display_name || '—'}</span>
            <button onClick={() => setNameEditing(true)}
              className="text-xs text-white/40 hover:text-white/80 transition-colors bg-white/8 hover:bg-white/12 px-3 py-1.5 rounded-lg shrink-0">
              ✎ עריכה
            </button>
          </SettingRow>

          {/* Email */}
          <SettingRow label="אימייל">
            <span className="text-xs text-white/45 font-mono truncate max-w-[180px]">{email}</span>
          </SettingRow>

          {/* Password */}
          <div className="py-3 border-b border-white/6">
            {!pwOpen ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/50 shrink-0">סיסמה</span>
                <button onClick={() => setPwOpen(true)}
                  className="text-xs text-white/40 hover:text-white/80 transition-colors bg-white/8 hover:bg-white/12 px-3 py-1.5 rounded-lg shrink-0">
                  שינוי
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <span className="text-sm text-white/50">שינוי סיסמה</span>
                <input type="password" placeholder="סיסמה חדשה" value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="glass-input py-2 px-3 text-sm w-full" />
                <input type="password" placeholder="אימות סיסמה" value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleChangePassword() }}
                  className="glass-input py-2 px-3 text-sm w-full" />
                <div className="flex gap-2 pt-1">
                  <button onClick={handleChangePassword} disabled={pwSaving || !newPw}
                    className="flex-1 py-2 rounded-lg bg-emerald-600/60 hover:bg-emerald-600/80 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                    {pwSaving ? '…' : 'שמור'}
                  </button>
                  <button onClick={() => { setPwOpen(false); setNewPw(''); setConfirmPw('') }}
                    className="px-4 py-2 rounded-lg bg-white/8 text-white/50 text-sm hover:text-white/80 transition-colors">
                    ביטול
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Favourite team */}
          <SettingRow label="קבוצה אהובה">
            <button onClick={() => setTeamPickerOpen(o => !o)}
              className="flex items-center gap-1.5 bg-white/8 hover:bg-white/12 px-3 py-1.5 rounded-lg text-sm transition-colors">
              {favTeam ? (
                <><span>{getFlagEmoji(favTeam.flag_code)}</span><span className="text-white/80">{favTeam.name}</span></>
              ) : (
                <span className="text-white/40 text-xs">בחר…</span>
              )}
              <span className="text-white/25 text-xs mr-1">{teamPickerOpen ? '▲' : '▼'}</span>
            </button>
          </SettingRow>

          {teamPickerOpen && (
            <div className="py-3 space-y-2">
              <input autoFocus placeholder="חפש קבוצה…" value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                className="glass-input py-2 px-3 text-sm w-full" />
              <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto no-scrollbar">
                {filteredTeams.map(t => (
                  <button key={t.id}
                    onClick={() => { patchProfile({ favorite_team_id: t.id }); setTeamPickerOpen(false); setTeamSearch(''); showToast(`${t.name} נבחרה!`) }}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm text-right transition-colors',
                      profile.favorite_team_id === t.id ? 'bg-indigo-500/30 text-indigo-100' : 'hover:bg-white/10 text-white/70',
                    )}>
                    <span className="text-base leading-none">{getFlagEmoji(t.flag_code)}</span>
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
              {profile.favorite_team_id && (
                <button onClick={() => { patchProfile({ favorite_team_id: null }); setTeamPickerOpen(false) }}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors pt-1">
                  הסר קבוצה
                </button>
              )}
            </div>
          )}

          {/* Whistle toggle */}
          <SettingRow label="🔔 שריקה בשמירה">
            <span className="text-xs text-white/30 ml-2">נגן צליל כששומרים ניחושים</span>
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
          </SettingRow>
        </div>
      </div>

      {/* ── Danger zone ───────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-red-500/15">
        <h2 className="text-xs font-bold text-red-400/60 uppercase tracking-widest mb-4">אזור מסוכן</h2>

        {!deleteConfirm ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-white/60">מחיקת חשבון</p>
              <p className="text-xs text-white/30 mt-0.5">מוחק פרופיל וכל הניחושים לצמיתות</p>
            </div>
            <button onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2 rounded-lg border border-red-500/35 text-red-400 text-sm hover:bg-red-500/12 transition-colors shrink-0">
              מחיקה…
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300">
              הקלד <span className="font-mono font-bold bg-red-500/20 px-1.5 py-0.5 rounded">DELETE</span> לאישור. לא ניתן לביטול.
            </p>
            <input autoFocus value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE" className="glass-input py-2 px-3 text-sm font-mono w-full" />
            <div className="flex gap-2">
              <button onClick={handleDelete}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600/70 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                {deleting ? 'מוחק…' : 'מחיקה לצמיתות'}
              </button>
              <button onClick={() => { setDeleteConfirm(false); setDeleteInput('') }}
                className="px-4 py-2.5 rounded-lg bg-white/8 text-white/60 text-sm hover:text-white/80 transition-colors">
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
