'use client'

import { useState } from 'react'
import { getFlagEmoji, getTeamById } from '@/data/teams'
import { getThirdFromMatchNums, getThirdFromGroups } from '@/lib/bracket'
import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface ThirdPlacePickerProps {
  available3rdPlaceTeams: Record<string, number | null>
  assigned: Record<number, number | null>
  assignedIds: Set<number>
  onAssign: (r32MatchNum: number, teamId: number | null) => void
  disabled?: boolean
}

const THIRD_FROM_MATCHES = getThirdFromMatchNums()

export default function ThirdPlacePicker({
  available3rdPlaceTeams, assigned, assignedIds, onAssign, disabled,
}: ThirdPlacePickerProps) {
  // The group whose 3rd-place team the user tapped (selected for placement)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  const availableEntries = Object.entries(available3rdPlaceTeams)
    .filter(([, id]) => id !== null)
    .map(([group, id]) => ({ group, teamId: id as number }))

  function handleTeamTap(group: string) {
    if (disabled) return
    const teamId = available3rdPlaceTeams[group]
    if (!teamId || assignedIds.has(teamId)) return
    setSelectedGroup(g => g === group ? null : group)
  }

  function handleSlotTap(matchNum: number) {
    if (disabled || !selectedGroup) return
    const teamId = available3rdPlaceTeams[selectedGroup]
    if (!teamId) return
    if (assigned[matchNum]) return  // slot already filled
    const eligibleGroups = getThirdFromGroups(matchNum, 'away') ?? getThirdFromGroups(matchNum, 'home') ?? []
    if (!eligibleGroups.includes(selectedGroup)) return
    onAssign(matchNum, teamId)
    setSelectedGroup(null)
  }

  const selectedTeamId = selectedGroup ? available3rdPlaceTeams[selectedGroup] : null
  const selectedTeam = selectedTeamId ? getTeamById(selectedTeamId) : null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-shadow">חלק 3 — 8 הקבוצות הטובות במקום השלישי</h2>
        <p className="text-sm text-white/50 mt-0.5">
          בחרו קבוצה ואז לחצו על המיקום המתאים לה. בחרו 8 מתוך 12 קבוצות שניחשתם שיעברו.
        </p>
      </div>

      {/* Rules box */}
      <GlassCard className="space-y-4 py-3">
        <p className="font-semibold text-white/80 text-xs uppercase tracking-wider">איך עובדות 8 הקבוצות הטובות במקום שלישי?</p>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">שלב 1 — אילו 8 מתוך 12 עוברות?</p>
          <p className="text-sm text-white/60">כל בית מייצר קבוצה אחת שסיימה במקום שלישי — 12 בסך הכל. הן מדורגות ביניהן לפי:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-white/60">
            {[['1','נקודות בשלב הבתים'],['2','הפרש שערים'],['3','שערים שבוקעו'],['4','ציון הגינות (כרטיסים)'],['5','דירוג FIFA']].map(([n, rule]) => (
              <div key={n} className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
                <span className="text-indigo-400 font-bold w-3">{n}.</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2 border-t border-white/10 pt-3">
          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">שלב 2 — לאיזה מיקום? (לא הגרלה!)</p>
          <p className="text-sm text-white/60">
            המיקום <strong className="text-white">לא נקבע בהגרלה</strong> — FIFA קבעה מראש טבלה קבועה:
            בהתאם ל<strong className="text-white">אילו 8 בתים</strong> שלחו קבוצה, כל בית מקבל מיקום ספציפי.
          </p>
          <p className="text-sm text-white/60">
            לדוגמה: אם בית C יעבור, הוא עשוי להגיע ל-M75, M78 או M79 — תלוי אילו 7 בתים אחרים גם עברו.
            הבתים המוצגים ליד כל משבצת הם כל הבתים <strong className="text-white">שיכולים</strong> להגיע לשם תחת שילובים שונים.
          </p>
          <p className="text-sm text-amber-300/80 font-medium">
            ↳ בניחוש: בחר את 8 הבתים שניחשת שיעברו, ולפי הטבלה של FIFA — הצב כל אחד במיקום הנכון.
          </p>
        </div>
      </GlassCard>

      {/* ── Step 1: Pick a team ─────────────────────────────────── */}
      <GlassCard className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/70">
            שלב 1 — בחר קבוצה ({assignedIds.size}/8 הוצבו)
          </h3>
          {selectedGroup && (
            <button
              onClick={() => setSelectedGroup(null)}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >ביטול</button>
          )}
        </div>

        {availableEntries.length === 0 ? (
          <p className="text-sm text-white/30 italic text-center py-4">
            דרגו את הבתים בחלק 2 תחילה.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableEntries.map(({ group, teamId }) => {
              const team = getTeamById(teamId)
              if (!team) return null
              const isAssigned = assignedIds.has(teamId)
              const isSelected = selectedGroup === group
              return (
                <button
                  key={teamId}
                  onClick={() => handleTeamTap(group)}
                  disabled={disabled || isAssigned}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl text-right transition-all w-full',
                    isSelected
                      ? 'ring-2 ring-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-500/10'
                      : isAssigned
                        ? 'glass opacity-40 cursor-not-allowed'
                        : 'glass hover:bg-white/10 active:scale-[0.98] cursor-pointer'
                  )}
                >
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0',
                    isSelected ? 'bg-indigo-400/30 text-indigo-200' : 'bg-indigo-500/15 text-indigo-300/70'
                  )}>
                    בית {group}
                  </span>
                  <span className="text-base leading-none shrink-0">{getFlagEmoji(team.flag_code)}</span>
                  <span className="text-sm font-medium text-white flex-1 truncate">{team.name}</span>
                  {isAssigned
                    ? <span className="text-emerald-400 text-xs shrink-0">✓</span>
                    : isSelected
                      ? <span className="text-indigo-300 text-xs shrink-0 animate-pulse">נבחרה ▶</span>
                      : null
                  }
                </button>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* ── Step 2: Pick a slot ─────────────────────────────────── */}
      <GlassCard className="space-y-2">
        <h3 className="text-sm font-semibold text-white/70 mb-1">
          שלב 2 — בחר מיקום
          {selectedTeam && (
            <span className="mr-2 text-indigo-300">
              עבור {getFlagEmoji(selectedTeam.flag_code)} {selectedTeam.name}
            </span>
          )}
        </h3>

        {THIRD_FROM_MATCHES.map((matchNum) => {
          const eligibleGroups =
            getThirdFromGroups(matchNum, 'away') ?? getThirdFromGroups(matchNum, 'home') ?? []
          const assignedTeamId = assigned[matchNum] ?? null
          const team = assignedTeamId ? getTeamById(assignedTeamId) : null
          const isEligible = selectedGroup ? eligibleGroups.includes(selectedGroup) : null

          return (
            <div
              key={matchNum}
              onClick={() => handleSlotTap(matchNum)}
              className={cn(
                'rounded-xl px-3 py-2.5 border transition-all',
                team
                  ? 'glass border-emerald-400/25 bg-emerald-500/8'
                  : isEligible === true
                    ? 'border-indigo-400/70 bg-indigo-500/15 cursor-pointer active:scale-[0.98] shadow-md shadow-indigo-500/10'
                    : isEligible === false
                      ? 'border-red-500/20 bg-red-500/5 opacity-40 cursor-not-allowed'
                      : 'glass border-white/8 cursor-default'
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  'text-[10px] font-mono w-10 shrink-0 font-bold',
                  isEligible === true ? 'text-indigo-300' : 'text-white/35'
                )}>
                  M{matchNum}
                </span>

                {team ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base leading-none shrink-0">{getFlagEmoji(team.flag_code)}</span>
                    <span className="text-sm font-medium text-white flex-1 truncate">{team.name}</span>
                    {!disabled && (
                      <button
                        onClick={e => { e.stopPropagation(); onAssign(matchNum, null) }}
                        className="text-white/25 hover:text-red-400 text-xs transition-colors shrink-0 px-1"
                      >✕</button>
                    )}
                  </div>
                ) : isEligible === true ? (
                  <div className="flex items-center gap-2 flex-1">
                    {selectedTeam && (
                      <>
                        <span className="text-base leading-none shrink-0">{getFlagEmoji(selectedTeam.flag_code)}</span>
                        <span className="text-sm text-indigo-200 flex-1 truncate">{selectedTeam.name}</span>
                      </>
                    )}
                    <span className="text-xs text-indigo-300 font-semibold shrink-0 mr-auto">← הצב כאן</span>
                  </div>
                ) : isEligible === false ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-xs text-red-400/60">✕</span>
                    <span className="text-xs text-red-400/50">בית {selectedGroup} לא מורשה כאן</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap flex-1">
                    <span className="text-[9px] text-white/25 shrink-0">בתים:</span>
                    {eligibleGroups.map(g => (
                      <span
                        key={g}
                        className={cn(
                          'text-[9px] font-mono px-1.5 py-0.5 rounded font-bold',
                          available3rdPlaceTeams[g] != null
                            ? 'bg-indigo-500/20 text-indigo-300/80'
                            : 'bg-white/5 text-white/25'
                        )}
                      >{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </GlassCard>
    </section>
  )
}
