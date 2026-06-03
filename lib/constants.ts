// World Cup 2026 opens June 11, 2026 at 15:00 ET = 19:00 UTC
export const TOURNAMENT_START = '2026-06-11T19:00:00Z'

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const
export type GroupLetter = (typeof GROUP_LETTERS)[number]

export const STAGES = ['r32', 'r16', 'qf', 'sf', 'third_place', 'final'] as const

// All scoring constants live in lib/scoring.config.ts
// Re-export for convenience
export { SCORING } from './scoring.config'
