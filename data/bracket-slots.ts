/**
 * WC 2026 knockout bracket structure — derived from worldcup2026_data.json.
 *
 * Each R32 slot side is one of:
 *   { winner: 'G' }        → predicted 1st place of group G
 *   { runner_up: 'G' }     → predicted 2nd place of group G
 *   { third_from: [...] }  → user-chosen 3rd-place team from the listed eligible groups
 *
 * R16/QF/SF sides are identified by the feeder match number whose winner fills that side.
 */

export type SlotSource =
  | { winner: string }
  | { runner_up: string }
  | { third_from: string[] }
  | { feeder_match: number }

export interface BracketMatchDef {
  match: number
  round: 'r32' | 'r16' | 'qf' | 'sf' | 'third_place' | 'final'
  home_source: SlotSource
  away_source: SlotSource
  feeds_into_match: number | null
  feeds_into_side: 'home' | 'away' | null
}

// R32 → R16 feeder map
const R32_INTO: Record<number, { match: number; side: 'home' | 'away' }> = {
  73: { match: 90, side: 'home' }, 74: { match: 89, side: 'home' },
  75: { match: 90, side: 'away' }, 76: { match: 91, side: 'home' },
  77: { match: 89, side: 'away' }, 78: { match: 91, side: 'away' },
  79: { match: 92, side: 'home' }, 80: { match: 92, side: 'away' },
  81: { match: 94, side: 'home' }, 82: { match: 94, side: 'away' },
  83: { match: 93, side: 'home' }, 84: { match: 93, side: 'away' },
  85: { match: 96, side: 'home' }, 86: { match: 95, side: 'home' },
  87: { match: 96, side: 'away' }, 88: { match: 95, side: 'away' },
}

// R16 → QF feeder map
const R16_INTO: Record<number, { match: number; side: 'home' | 'away' }> = {
  89: { match: 97, side: 'home' }, 90: { match: 97, side: 'away' },
  91: { match: 98, side: 'home' }, 92: { match: 98, side: 'away' },
  93: { match: 99, side: 'home' }, 94: { match: 99, side: 'away' },
  95: { match:100, side: 'home' }, 96: { match:100, side: 'away' },
}

// QF → SF feeder map
const QF_INTO: Record<number, { match: number; side: 'home' | 'away' }> = {
  97: { match:101, side: 'home' }, 98: { match:101, side: 'away' },
  99: { match:102, side: 'home' },100: { match:102, side: 'away' },
}

// SF → Final
const SF_INTO: Record<number, { match: number; side: 'home' | 'away' }> = {
  101: { match:104, side: 'home' },
  102: { match:104, side: 'away' },
}

export const BRACKET_MATCHES: BracketMatchDef[] = [
  // ── Round of 32 ──────────────────────────────────────────
  { match: 73, round:'r32', home_source:{runner_up:'A'}, away_source:{runner_up:'B'}, ...intoOf(R32_INTO,73) },
  { match: 74, round:'r32', home_source:{winner:'C'},    away_source:{runner_up:'F'}, ...intoOf(R32_INTO,74) },
  { match: 75, round:'r32', home_source:{winner:'E'},    away_source:{third_from:['A','B','C','D','F']}, ...intoOf(R32_INTO,75) },
  { match: 76, round:'r32', home_source:{winner:'F'},    away_source:{runner_up:'C'}, ...intoOf(R32_INTO,76) },
  { match: 77, round:'r32', home_source:{runner_up:'E'}, away_source:{runner_up:'I'}, ...intoOf(R32_INTO,77) },
  { match: 78, round:'r32', home_source:{winner:'I'},    away_source:{third_from:['C','D','F','G','H']}, ...intoOf(R32_INTO,78) },
  { match: 79, round:'r32', home_source:{winner:'A'},    away_source:{third_from:['C','E','F','H','I']}, ...intoOf(R32_INTO,79) },
  { match: 80, round:'r32', home_source:{winner:'L'},    away_source:{third_from:['E','H','I','J','K']}, ...intoOf(R32_INTO,80) },
  { match: 81, round:'r32', home_source:{winner:'G'},    away_source:{third_from:['A','E','H','I','J']}, ...intoOf(R32_INTO,81) },
  { match: 82, round:'r32', home_source:{winner:'D'},    away_source:{third_from:['B','E','F','I','J']}, ...intoOf(R32_INTO,82) },
  { match: 83, round:'r32', home_source:{winner:'H'},    away_source:{runner_up:'J'}, ...intoOf(R32_INTO,83) },
  { match: 84, round:'r32', home_source:{runner_up:'K'}, away_source:{runner_up:'L'}, ...intoOf(R32_INTO,84) },
  { match: 85, round:'r32', home_source:{winner:'B'},    away_source:{third_from:['E','F','G','I','J']}, ...intoOf(R32_INTO,85) },
  { match: 86, round:'r32', home_source:{runner_up:'D'}, away_source:{runner_up:'G'}, ...intoOf(R32_INTO,86) },
  { match: 87, round:'r32', home_source:{winner:'J'},    away_source:{runner_up:'H'}, ...intoOf(R32_INTO,87) },
  { match: 88, round:'r32', home_source:{winner:'K'},    away_source:{third_from:['D','E','I','J','L']}, ...intoOf(R32_INTO,88) },
  // ── Round of 16 ──────────────────────────────────────────
  { match: 89, round:'r16', home_source:{feeder_match:74}, away_source:{feeder_match:77}, ...intoOf(R16_INTO,89) },
  { match: 90, round:'r16', home_source:{feeder_match:73}, away_source:{feeder_match:75}, ...intoOf(R16_INTO,90) },
  { match: 91, round:'r16', home_source:{feeder_match:76}, away_source:{feeder_match:78}, ...intoOf(R16_INTO,91) },
  { match: 92, round:'r16', home_source:{feeder_match:79}, away_source:{feeder_match:80}, ...intoOf(R16_INTO,92) },
  { match: 93, round:'r16', home_source:{feeder_match:83}, away_source:{feeder_match:84}, ...intoOf(R16_INTO,93) },
  { match: 94, round:'r16', home_source:{feeder_match:81}, away_source:{feeder_match:82}, ...intoOf(R16_INTO,94) },
  { match: 95, round:'r16', home_source:{feeder_match:86}, away_source:{feeder_match:88}, ...intoOf(R16_INTO,95) },
  { match: 96, round:'r16', home_source:{feeder_match:85}, away_source:{feeder_match:87}, ...intoOf(R16_INTO,96) },
  // ── Quarter-finals ───────────────────────────────────────
  { match: 97, round:'qf', home_source:{feeder_match:89}, away_source:{feeder_match:90}, ...intoOf(QF_INTO,97) },
  { match: 98, round:'qf', home_source:{feeder_match:91}, away_source:{feeder_match:92}, ...intoOf(QF_INTO,98) },
  { match: 99, round:'qf', home_source:{feeder_match:93}, away_source:{feeder_match:94}, ...intoOf(QF_INTO,99) },
  { match:100, round:'qf', home_source:{feeder_match:95}, away_source:{feeder_match:96}, ...intoOf(QF_INTO,100) },
  // ── Semi-finals ──────────────────────────────────────────
  { match:101, round:'sf', home_source:{feeder_match:97},  away_source:{feeder_match:98},  ...intoOf(SF_INTO,101) },
  { match:102, round:'sf', home_source:{feeder_match:99},  away_source:{feeder_match:100}, ...intoOf(SF_INTO,102) },
  // ── 3rd-place play-off (losers of SF — handled specially in bracket UI) ──
  { match:103, round:'third_place', home_source:{feeder_match:101}, away_source:{feeder_match:102}, feeds_into_match:null, feeds_into_side:null },
  // ── Final ────────────────────────────────────────────────
  { match:104, round:'final',       home_source:{feeder_match:101}, away_source:{feeder_match:102}, feeds_into_match:null, feeds_into_side:null },
]

function intoOf(
  map: Record<number, { match: number; side: 'home' | 'away' }>,
  id: number
): { feeds_into_match: number | null; feeds_into_side: 'home' | 'away' | null } {
  const f = map[id]
  return f
    ? { feeds_into_match: f.match, feeds_into_side: f.side }
    : { feeds_into_match: null, feeds_into_side: null }
}

export const BRACKET_BY_MATCH = Object.fromEntries(
  BRACKET_MATCHES.map((m) => [m.match, m])
) as Record<number, BracketMatchDef>

export const BRACKET_BY_ROUND: Record<string, BracketMatchDef[]> = {}
for (const m of BRACKET_MATCHES) {
  if (!BRACKET_BY_ROUND[m.round]) BRACKET_BY_ROUND[m.round] = []
  BRACKET_BY_ROUND[m.round].push(m)
}

// The 8 R32 match numbers that have a third_from slot
export const THIRD_FROM_MATCHES = BRACKET_MATCHES
  .filter((m) => m.round === 'r32' && (
    'third_from' in m.home_source || 'third_from' in m.away_source
  ))
  .map((m) => m.match)

export function isThirdFromSlot(matchNum: number, side: 'home' | 'away'): boolean {
  const m = BRACKET_BY_MATCH[matchNum]
  if (!m) return false
  const src = side === 'home' ? m.home_source : m.away_source
  return 'third_from' in src
}

export function getThirdFromGroups(matchNum: number, side: 'home' | 'away'): string[] {
  const m = BRACKET_BY_MATCH[matchNum]
  if (!m) return []
  const src = side === 'home' ? m.home_source : m.away_source
  return 'third_from' in src ? src.third_from : []
}
