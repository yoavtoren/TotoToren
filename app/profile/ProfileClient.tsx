'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TEAMS, getFlagEmoji, getTeamById } from '@/data/teams'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface LeaderboardRow {
  user_id: string
  total_score: number
  profiles: { display_name: string; avatar_url: string | null } | null
}

interface Props {
  userId: string
  profile: Profile | null
  leaderboard: LeaderboardRow[]
}

// ── Avatar initials fallback ───────────────────────────────────
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

function Avatar({ url, name, size = 'lg' }: { url: string | null; name: string; size?: 'sm' | 'lg' }) {
  const px = size === 'lg' ? 80 : 28
  if (url) return (
    <Image src={url} alt={name} width={px} height={px}
      className={cn('rounded-full object-cover shrink-0', size === 'lg' ? 'w-20 h-20' : 'w-7 h-7')} />
  )
  return <Initials name={name} size={size} />
}

// ── Standing row ───────────────────────────────────────────────
function StandingRow({
  rank, name, score, avatarUrl, highlight, gap, gapLabel,
}: {
  rank: number; name: string; score: number; avatarUrl: string | null
  highlight?: boolean; gap?: number; gapLabel?: string
}) {
  const medal = rank === 1 ? '🥇' : null
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-xl transition-all',
      highlight ? 'bg-indigo-500/20 ring-1 ring-indigo-400/40' : 'bg-white/5',
    )}>
      <span className="text-xs text-white/30 w-5 text-right shrink-0">
        {medal ?? `#${rank}`}
      </span>
      <Avatar url={avatarUrl} name={name} size="sm" />
      <span className={cn('flex-1 text-sm truncate', highlight ? 'text-white font-semibold' : 'text-white/70')}>
        {name}
        {highlight && <span className="ml-1.5 text-xs text-indigo-300">← you</span>}
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

// ── Main ──────────────────────────────────────────────────────
export default function ProfileClient({ userId, profile: initialProfile, leaderboard }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile>(initialProfile ?? {
    id: userId,
    display_name: '',
    avatar_url: null,
    is_admin: false,
    favorite_team_id: null,
    notifications_whistle: true,
    created_at: new Date().toISOString(),
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

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  async function patchProfile(patch: Partial<Profile>) {
    const next = { ...profile, ...patch }
    setProfile(next)
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId)
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
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await patchProfile({ avatar_url: publicUrl + `?t=${Date.now()}` })
      showToast('Photo updated!')
    } catch (err: any) {
      showToast(err.message ?? 'Upload failed', false)
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
      showToast('Name updated!')
    })
  }

  // ── Delete account ───────────────────────────────────────────
  function handleDelete() {
    startDeleting(async () => {
      const res = await fetch('/api/profile/delete', { method: 'DELETE' })
      if (!res.ok) { showToast('Delete failed — try again', false); return }
      await supabase.auth.signOut()
      router.push('/')
    })
  }

  // ── Leaderboard position ─────────────────────────────────────
  const myIndex = leaderboard.findIndex(r => r.user_id === userId)
  const myScore = myIndex >= 0 ? leaderboard[myIndex] : null
  const myRank = myIndex + 1
  const total = leaderboard.length
  const above = myIndex > 0 ? leaderboard[myIndex - 1] : null
  const below = myIndex < total - 1 ? leaderboard[myIndex + 1] : null
  const first = leaderboard[0] ?? null
  const last = leaderboard[total - 1] ?? null
  const myPts = myScore?.total_score ?? 0

  // Rows to display in the standing card (deduplicated)
  const standingRows: Array<{ row: LeaderboardRow; rank: number; isMe: boolean; isBoundary?: 'first' | 'last' }> = []
  const seen = new Set<string>()
  function addRow(r: LeaderboardRow | null, rank: number, isMe: boolean, isBoundary?: 'first' | 'last') {
    if (!r || seen.has(r.user_id)) return
    seen.add(r.user_id)
    standingRows.push({ row: r, rank, isMe, isBoundary })
  }

  if (first && first.user_id !== userId) addRow(first, 1, false, 'first')
  if (above) addRow(above, myRank - 1, false)
  if (myScore) addRow(myScore, myRank, true)
  if (below) addRow(below, myRank + 1, false)
  if (last && last.user_id !== userId) addRow(last, total, false, 'last')

  // ── Team picker filter ───────────────────────────────────────
  const filteredTeams = TEAMS.filter(t =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  )

  const favTeam = profile.favorite_team_id ? getTeamById(profile.favorite_team_id) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed top-20 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all animate-fade-in',
          toast.ok ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white',
        )}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}

      {/* ── Profile header ────────────────────────────────────── */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <Avatar url={profile.avatar_url} name={profile.display_name || 'User'} size="lg" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium"
            >
              {uploading ? '…' : '📷'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            {nameEditing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setNameEditing(false) }}
                  className="glass-input py-1.5 px-2 text-lg font-bold flex-1"
                  maxLength={40}
                />
                <button onClick={saveName} disabled={saving}
                  className="glass px-3 py-1.5 rounded-lg text-sm text-emerald-300 hover:text-emerald-200">
                  {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => { setDisplayName(profile.display_name); setNameEditing(false) }}
                  className="text-white/30 hover:text-white/60 text-sm">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/name">
                <h1 className="text-xl font-bold text-white truncate">
                  {profile.display_name || 'Anonymous'}
                </h1>
                <button
                  onClick={() => setNameEditing(true)}
                  className="text-white/20 hover:text-white/60 transition-colors opacity-0 group-hover/name:opacity-100 text-sm"
                  title="Edit name"
                >✎</button>
              </div>
            )}

            {/* Rank badge */}
            {myScore && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-bold text-white">{myPts}</span>
                <span className="text-white/40 text-sm">pts</span>
                <span className="glass px-2 py-0.5 rounded-full text-xs text-white/60 font-mono">
                  #{myRank} of {total}
                </span>
              </div>
            )}

            {favTeam && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-base">{getFlagEmoji(favTeam.flag_code)}</span>
                <span className="text-sm text-white/50">{favTeam.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Standing card ─────────────────────────────────────── */}
      {leaderboard.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-2">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">My Standing</h2>

          {standingRows.map(({ row, rank, isMe, isBoundary }, i) => {
            const prev = standingRows[i - 1]
            const showDivider = prev && Math.abs(rank - prev.rank) > 1
            const name = row.profiles?.display_name ?? 'Unknown'
            const pts = row.total_score
            const gap = pts - myPts   // positive = they're ahead, negative = we're ahead
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
                  name={name}
                  score={pts}
                  avatarUrl={row.profiles?.avatar_url ?? null}
                  highlight={isMe}
                  gap={isMe ? undefined : gap}
                />
              </div>
            )
          })}

          {!myScore && (
            <p className="text-sm text-white/30 text-center py-2">No score yet — save your predictions first.</p>
          )}
        </div>
      )}

      {/* ── Settings ──────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 space-y-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Settings</h2>

        {/* Favorite team */}
        <div>
          <p className="text-sm text-white/70 mb-2">Favourite team</p>
          <button
            onClick={() => setTeamPickerOpen(o => !o)}
            className="glass glass-hover flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
          >
            {favTeam ? (
              <>
                <span className="text-base">{getFlagEmoji(favTeam.flag_code)}</span>
                <span>{favTeam.name}</span>
              </>
            ) : (
              <span className="text-white/40">Pick your team…</span>
            )}
            <span className="ml-auto text-white/30 text-xs">{teamPickerOpen ? '▲' : '▼'}</span>
          </button>

          {teamPickerOpen && (
            <div className="mt-2 glass rounded-xl p-3 space-y-2">
              <input
                autoFocus
                placeholder="Search team…"
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                className="glass-input py-1.5 px-2 text-sm w-full"
              />
              <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto no-scrollbar">
                {filteredTeams.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      patchProfile({ favorite_team_id: t.id })
                      setTeamPickerOpen(false)
                      setTeamSearch('')
                      showToast(`${t.name} set as favourite!`)
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-left transition-colors',
                      profile.favorite_team_id === t.id
                        ? 'bg-indigo-500/30 text-indigo-100'
                        : 'hover:bg-white/10 text-white/70',
                    )}
                  >
                    <span className="text-base leading-none">{getFlagEmoji(t.flag_code)}</span>
                    <span className="truncate">{t.name}</span>
                  </button>
                ))}
              </div>
              {profile.favorite_team_id && (
                <button
                  onClick={() => { patchProfile({ favorite_team_id: null }); setTeamPickerOpen(false) }}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors"
                >
                  Clear favourite
                </button>
              )}
            </div>
          )}
        </div>

        {/* Whistle notifications */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">Whistle on save 🔔</p>
            <p className="text-xs text-white/30 mt-0.5">Play a whistle sound when predictions are saved</p>
          </div>
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
        </div>
      </div>

      {/* ── Danger zone ───────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 border border-red-500/20">
        <h2 className="text-sm font-semibold text-red-400/70 uppercase tracking-widest mb-3">Danger Zone</h2>

        {!deleteConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Delete account</p>
              <p className="text-xs text-white/30 mt-0.5">Permanently removes your profile and all predictions</p>
            </div>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-sm hover:bg-red-500/15 transition-colors shrink-0"
            >
              Delete…
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300">
              Type <span className="font-mono font-bold">DELETE</span> to confirm. This cannot be undone.
            </p>
            <input
              autoFocus
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="glass-input py-1.5 px-3 text-sm font-mono w-full"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 py-2 rounded-lg bg-red-600/70 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {deleting ? 'Deleting…' : 'Permanently delete'}
              </button>
              <button
                onClick={() => { setDeleteConfirm(false); setDeleteInput('') }}
                className="px-4 py-2 rounded-lg glass text-white/60 text-sm hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
