'use client'

import { resolveMatchTeam } from '@/lib/bracket'
import { getFlagEmoji, getTeamById } from '@/data/teams'
import { KNOCKOUT_MATCHES } from '@/data/match-schedule'
import { cn } from '@/lib/utils'
import { SCORING } from '@/lib/scoring.config'
import type { GroupOrder, BracketWinners, ThirdPlaceState, KnockoutScores } from '@/types'

// ─── Match date lookup ─────────────────────────────────────────────────────────
const KO_DATE: Record<number, string> = Object.fromEntries(
  KNOCKOUT_MATCHES.map(m => [
    m.match,
    new Date(m.date_utc).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  ])
)

// ─── Layout constants ──────────────────────────────────────────────────────────
const CH     = 96             // card height (px) — teams + Σ row + exact score row
const CW     = 116            // card width (px)
const CGAP   = 16             // horizontal gap between columns (connector space)
const SGAP   = 40             // vertical gap between sibling cards in same round

const SLOT     = CH + SGAP        // = 104  one vertical slot
const HALF_W   = 4 * (CW + CGAP) // = 528  width of each bracket half
const CENTER_W = 160              // width of center section
const TOTAL_H  = 8 * SLOT         // = 832  total bracket height

// ─── Position helpers ──────────────────────────────────────────────────────────
type Round = 'r32' | 'r16' | 'qf' | 'sf'

function cardTopY(round: Round, i: number): number {
  switch (round) {
    case 'r32': return i * SLOT
    case 'r16': return (4 * i + 1) * SLOT / 2
    case 'qf':  return (8 * i + 3) * SLOT / 2
    case 'sf':  return 7 * SLOT / 2
  }
}

// Left half: col 0=R32, 1=R16, 2=QF, 3=SF
function lColX(pos: number) { return pos * (CW + CGAP) }

// Right half: col 0=SF (with CGAP stub on left), 1=QF, 2=R16, 3=R32
function rColX(pos: number) { return (pos + 1) * CGAP + pos * CW }

// ─── Match ordering (top-to-bottom within each half) ──────────────────────────
// Left: R32→R16→QF→SF (flows toward center)
// Pairing: R32[2i], R32[2i+1] → R16[i]; R16[2i], R16[2i+1] → QF[i]; QF[0,1] → SF
const L_R32 = [74, 77, 73, 75, 76, 78, 79, 80]
const L_R16 = [89, 90, 91, 92]
const L_QF  = [97, 98]
const L_SF  = 101

// Right: SF→QF→R16→R32 (fans out from center)
const R_SF  = 102
const R_QF  = [99, 100]
const R_R16 = [93, 94, 95, 96]
const R_R32 = [83, 84, 81, 82, 86, 88, 85, 87]

// ─── Compact match card ────────────────────────────────────────────────────────
interface MatchCardProps {
  matchNum: number
  date?: string
  homeId: number | null; awayId: number | null; winnerId: number | null
  homeScore: string; awayScore: string; totalScore: string
  onPickWinner: (id: number | null) => void
  onScoreChange: (side: 'home' | 'away' | 'total', val: string) => void
  disabled?: boolean
  highlight?: boolean
}

function MatchCard({
  matchNum, date, homeId, awayId, winnerId, homeScore, awayScore, totalScore,
  onPickWinner, onScoreChange, disabled, highlight,
}: MatchCardProps) {
  const canPick = !disabled && homeId !== null && awayId !== null

  const TeamRow = ({ teamId }: { teamId: number | null }) => {
    const team = teamId ? getTeamById(teamId) : null
    const isWinner = winnerId !== null && winnerId === teamId && teamId !== null
    const clickable = canPick && !!teamId
    return (
      <button
        onClick={() => {
          if (!clickable) return
          onPickWinner(isWinner ? null : teamId)
        }}
        disabled={!clickable}
        className={cn(
          'group flex items-center gap-1 w-full px-1.5 py-[5px] rounded text-left transition-all text-[11px]',
          isWinner
            ? 'bg-emerald-500/25 text-emerald-100 font-semibold hover:bg-red-500/20'
            : team && canPick
              ? 'hover:bg-white/10 text-white/80 cursor-pointer'
              : 'text-white/25 cursor-default',
        )}
      >
        {team ? (
          <>
            <span className="text-xs leading-none">{getFlagEmoji(team.flag_code)}</span>
            <span className="flex-1 truncate leading-none">{team.name}</span>
            {isWinner && (
              <span className="text-emerald-400 text-[9px] group-hover:hidden">★</span>
            )}
            {isWinner && (
              <span className="hidden text-red-400 text-[9px] group-hover:inline">✕</span>
            )}
          </>
        ) : (
          <span className="italic text-white/15 text-[10px]">TBD</span>
        )}
      </button>
    )
  }

  return (
    <div className={cn(
      'rounded-lg overflow-hidden glass',
      highlight && 'ring-1 ring-yellow-400/50',
    )}>
      <div className="flex items-center justify-between px-1.5 py-0.5 bg-white/5 border-b border-white/10">
        <span className="text-[9px] font-mono text-white/20">M{matchNum}</span>
        {date && <span className="text-[9px] font-mono text-white/25">{date}</span>}
      </div>
      <div className="px-0.5 py-0.5">
        <TeamRow teamId={homeId} />
        <div className="h-px bg-white/5 mx-1.5" />
        <TeamRow teamId={awayId} />
      </div>
      {/* Score inputs */}
      <div className="px-1.5 pb-1.5 pt-1 border-t border-white/10 space-y-1">
        {/* Σ total goals */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] shrink-0">⚽</span>
          <input type="number" min="0" max="30" value={totalScore}
            onChange={e => onScoreChange('total', e.target.value)} placeholder="?"
            disabled={disabled}
            className={cn(
              'w-full text-center py-0.5 text-[10px] font-mono rounded border outline-none',
              totalScore
                ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30',
            )} />
        </div>
        {/* Exact score */}
        <div className="flex items-center gap-0.5">
          <input type="number" min="0" max="20" value={homeScore}
            onChange={e => onScoreChange('home', e.target.value)} placeholder="?"
            disabled={disabled}
            className={cn(
              'w-full text-center py-0.5 text-[10px] font-mono rounded border outline-none',
              homeScore
                ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30',
            )} />
          <span className="text-white/30 text-[9px] font-bold shrink-0">:</span>
          <input type="number" min="0" max="20" value={awayScore}
            onChange={e => onScoreChange('away', e.target.value)} placeholder="?"
            disabled={disabled}
            className={cn(
              'w-full text-center py-0.5 text-[10px] font-mono rounded border outline-none',
              awayScore
                ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30',
            )} />
        </div>
      </div>
    </div>
  )
}

// ─── SVG connector lines ───────────────────────────────────────────────────────
type Line = { x1: number; y1: number; x2: number; y2: number }

function ConnectorSvg({ lines, width }: { lines: Line[]; width: number }) {
  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width={width} height={TOTAL_H}
      style={{ overflow: 'visible' }}
    >
      <g stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none">
        {lines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
        ))}
      </g>
    </svg>
  )
}

function buildLeftLines(): Line[] {
  const lines: Line[] = []

  function fanIn(srcRound: Round, dstRound: Round, srcRightX: number, dstLeftX: number, count: number) {
    const midX = (srcRightX + dstLeftX) / 2
    for (let i = 0; i < count; i++) {
      const y0 = cardTopY(srcRound, 2 * i) + CH / 2
      const y1 = cardTopY(srcRound, 2 * i + 1) + CH / 2
      const yt = cardTopY(dstRound, i) + CH / 2
      lines.push({ x1: srcRightX, y1: y0, x2: midX,     y2: y0 })
      lines.push({ x1: srcRightX, y1: y1, x2: midX,     y2: y1 })
      lines.push({ x1: midX,      y1: y0, x2: midX,     y2: y1 })
      lines.push({ x1: midX,      y1: yt, x2: dstLeftX, y2: yt })
    }
  }

  fanIn('r32', 'r16', lColX(0) + CW, lColX(1), 4)
  fanIn('r16', 'qf',  lColX(1) + CW, lColX(2), 2)
  fanIn('qf',  'sf',  lColX(2) + CW, lColX(3), 1)

  // SF → center stub
  const sfY = cardTopY('sf', 0) + CH / 2
  lines.push({ x1: lColX(3) + CW, y1: sfY, x2: HALF_W, y2: sfY })

  return lines
}

function buildRightLines(): Line[] {
  const lines: Line[] = []

  // center → SF stub
  const sfY = cardTopY('sf', 0) + CH / 2
  lines.push({ x1: 0, y1: sfY, x2: rColX(0), y2: sfY })

  function fanOut(srcRound: Round, dstRound: Round, srcRightX: number, dstLeftX: number, count: number) {
    const midX = (srcRightX + dstLeftX) / 2
    for (let i = 0; i < count; i++) {
      const ys = cardTopY(srcRound, i) + CH / 2
      const y0 = cardTopY(dstRound, 2 * i) + CH / 2
      const y1 = cardTopY(dstRound, 2 * i + 1) + CH / 2
      lines.push({ x1: srcRightX, y1: ys, x2: midX,     y2: ys })
      lines.push({ x1: midX,      y1: y0, x2: midX,     y2: y1 })
      lines.push({ x1: midX,      y1: y0, x2: dstLeftX, y2: y0 })
      lines.push({ x1: midX,      y1: y1, x2: dstLeftX, y2: y1 })
    }
  }

  fanOut('sf', 'qf',  rColX(0) + CW, rColX(1), 1)
  fanOut('qf', 'r16', rColX(1) + CW, rColX(2), 2)
  fanOut('r16','r32', rColX(2) + CW, rColX(3), 4)

  return lines
}

// ─── Main bracket ──────────────────────────────────────────────────────────────
interface KnockoutBracketProps {
  groupOrder: GroupOrder
  thirdPlace: ThirdPlaceState
  bracketWinners: BracketWinners
  knockoutScores: KnockoutScores
  onPickWinner: (matchNum: number, teamId: number | null) => void
  onScoreChange: (matchNum: number, side: 'home' | 'away' | 'total', value: string) => void
  disabled?: boolean
}

export default function KnockoutBracket({
  groupOrder, thirdPlace, bracketWinners, knockoutScores,
  onPickWinner, onScoreChange, disabled,
}: KnockoutBracketProps) {
  const resolve = (m: number, s: 'home' | 'away') =>
    resolveMatchTeam(m, s, groupOrder, thirdPlace, bracketWinners)

  function card(matchNum: number, highlight?: boolean) {
    const sc = knockoutScores[matchNum]
    return (
      <MatchCard
        matchNum={matchNum}
        date={KO_DATE[matchNum]}
        homeId={resolve(matchNum, 'home')}
        awayId={resolve(matchNum, 'away')}
        winnerId={bracketWinners[matchNum] ?? null}
        homeScore={sc?.home ?? ''}
        awayScore={sc?.away ?? ''}
        totalScore={sc?.total ?? ''}
        onPickWinner={(id) => onPickWinner(matchNum, id)}
        onScoreChange={(side, val) => onScoreChange(matchNum, side, val)}
        disabled={disabled}
        highlight={highlight}
      />
    )
  }

  const champion    = bracketWinners[104] != null ? getTeamById(bracketWinners[104]!) : null
  const sfTopY      = cardTopY('sf', 0)
  const sfCenterY   = sfTopY + CH / 2

  const LEFT_LINES  = buildLeftLines()
  const RIGHT_LINES = buildRightLines()

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-shadow">חלק 4 — סבבי הנוקאאוט</h2>
        <div className="flex flex-wrap gap-2 mt-1 text-xs">
          <span className="glass px-2 py-1 rounded-lg"><strong className="text-amber-300">🥅 סך שערים</strong> <span className="text-white/40">= +{SCORING.KO_TOTAL_GOALS} נק׳</span></span>
          <span className="glass px-2 py-1 rounded-lg"><strong className="text-emerald-300">תוצאה מדויקת</strong> <span className="text-white/40">= +{SCORING.KO_EXACT} נק׳</span></span>
          <span className="text-white/30 py-1 text-xs">לחצו על נבחרת לניחוש המנצח</span>
        </div>
      </div>

      {/* dir=ltr: bracket always reads left→right regardless of page language */}
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
      <div dir="ltr" style={{ width: HALF_W * 2 + CENTER_W }}>

        {/* Round label row */}
        <div className="flex items-end pb-2" style={{ height: 56 }}>
          {([
            { label: '32 אחרונות', pts: SCORING.ADV_R16   },
            { label: 'שמינית גמר', pts: SCORING.ADV_QF    },
            { label: 'רבע גמר',    pts: SCORING.ADV_SF    },
            { label: 'חצי גמר',    pts: SCORING.ADV_FINAL },
          ] as const).map(({ label, pts }, i) => (
            <div key={label} style={{ width: CW, marginLeft: i === 0 ? 0 : CGAP }} className="text-center">
              <p className="text-[7px] font-semibold text-white/30 uppercase tracking-widest truncate">{label}</p>
              <p className="text-[11px] font-bold text-emerald-400 leading-tight mt-0.5">+{pts} pts</p>
            </div>
          ))}

          <div style={{ width: CENTER_W, marginLeft: CGAP, marginRight: CGAP }} className="text-center">
            <p className="text-[9px] font-bold text-yellow-400/70 uppercase tracking-widest">🏆 גמר</p>
            <p className="text-[11px] font-bold text-yellow-400 leading-tight mt-0.5">+{SCORING.ADV_FINAL} pts</p>
          </div>

          {([
            { label: 'חצי גמר',    pts: SCORING.ADV_FINAL },
            { label: 'רבע גמר',    pts: SCORING.ADV_SF    },
            { label: 'שמינית גמר', pts: SCORING.ADV_QF    },
            { label: '32 אחרונות', pts: SCORING.ADV_R16   },
          ] as const).map(({ label, pts }, i) => (
            <div key={label} style={{ width: CW, marginLeft: i === 0 ? 0 : CGAP }} className="text-center">
              <p className="text-[7px] font-semibold text-white/30 uppercase tracking-widest truncate">{label}</p>
              <p className="text-[11px] font-bold text-emerald-400 leading-tight mt-0.5">+{pts} pts</p>
            </div>
          ))}
        </div>

        {/* Bracket row */}
        <div className="flex items-start">

          {/* ── Left half ──────────────────────────────────────── */}
          <div className="relative shrink-0" style={{ width: HALF_W, height: TOTAL_H }}>
            <ConnectorSvg lines={LEFT_LINES} width={HALF_W} />

            {L_R32.map((m, i) => (
              <div key={m} className="absolute" style={{ left: lColX(0), top: cardTopY('r32', i), width: CW }}>
                {card(m)}
              </div>
            ))}
            {L_R16.map((m, i) => (
              <div key={m} className="absolute" style={{ left: lColX(1), top: cardTopY('r16', i), width: CW }}>
                {card(m)}
              </div>
            ))}
            {L_QF.map((m, i) => (
              <div key={m} className="absolute" style={{ left: lColX(2), top: cardTopY('qf', i), width: CW }}>
                {card(m)}
              </div>
            ))}
            <div className="absolute" style={{ left: lColX(3), top: sfTopY, width: CW }}>
              {card(L_SF)}
            </div>
          </div>

          {/* ── Center ─────────────────────────────────────────── */}
          <div className="relative shrink-0" style={{ width: CENTER_W, height: TOTAL_H }}>
            <svg
              className="absolute inset-0 pointer-events-none"
              width={CENTER_W} height={TOTAL_H}
              style={{ overflow: 'visible' }}
            >
              <g stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none">
                <line x1={0}         y1={sfCenterY} x2={16}            y2={sfCenterY} />
                <line x1={CENTER_W}  y1={sfCenterY} x2={CENTER_W - 16} y2={sfCenterY} />
              </g>
            </svg>

            {/* Final */}
            <div className="absolute" style={{ top: sfTopY, left: 8, right: 8 }}>
              <div className="rounded-2xl overflow-hidden ring-2 ring-yellow-400/60 shadow-lg shadow-yellow-500/20">
                <div className="bg-yellow-400/15 border-b border-yellow-400/30 py-1.5 text-center">
                  <p className="text-2xl leading-none">🏆</p>
                  <p className="text-[10px] text-yellow-300 font-bold tracking-widest uppercase mt-0.5">גמר</p>
                </div>
                {card(104, true)}
              </div>
            </div>

            {/* Champion */}
            {champion && (
              <div
                className="absolute glass rounded-xl p-2 text-center glow-emerald"
                style={{ top: sfTopY + CH + 48, left: 8, right: 8 }}
              >
                <p className="text-lg">{getFlagEmoji(champion.flag_code)}</p>
                <p className="text-[10px] text-emerald-300 font-bold">{champion.name}</p>
                <p className="text-[9px] text-white/30">Champion 🏆</p>
              </div>
            )}

            {/* 3rd-place */}
            <div className="absolute" style={{ top: sfTopY + CH * 2 + 80, left: 8, right: 8 }}>
              <div className="rounded-xl overflow-hidden ring-1 ring-amber-700/40">
                <div className="bg-amber-900/20 border-b border-amber-700/30 py-1 text-center flex items-center justify-center gap-1">
                  <span className="text-base leading-none">🥉</span>
                  <p className="text-[9px] text-amber-400/80 font-semibold tracking-wide">משחק על המקום השלישי</p>
                </div>
                {card(103)}
              </div>
            </div>
          </div>

          {/* ── Right half ─────────────────────────────────────── */}
          <div className="relative shrink-0" style={{ width: HALF_W, height: TOTAL_H }}>
            <ConnectorSvg lines={RIGHT_LINES} width={HALF_W} />

            <div className="absolute" style={{ left: rColX(0), top: sfTopY, width: CW }}>
              {card(R_SF)}
            </div>
            {R_QF.map((m, i) => (
              <div key={m} className="absolute" style={{ left: rColX(1), top: cardTopY('qf', i), width: CW }}>
                {card(m)}
              </div>
            ))}
            {R_R16.map((m, i) => (
              <div key={m} className="absolute" style={{ left: rColX(2), top: cardTopY('r16', i), width: CW }}>
                {card(m)}
              </div>
            ))}
            {R_R32.map((m, i) => (
              <div key={m} className="absolute" style={{ left: rColX(3), top: cardTopY('r32', i), width: CW }}>
                {card(m)}
              </div>
            ))}
          </div>

        </div>
      </div>
      </div> {/* overflow-x-auto wrapper */}
    </section>
  )
}
