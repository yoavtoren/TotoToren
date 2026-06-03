/**
 * All scoring point constants for TotoToren WC 2026.
 * Change values here only — logic in scoring.ts reads these.
 *
 * D-1 defaults (advancement tiers):
 *   R32=4, R16=5, QF=6, SF=7, Final=8
 * Futures set by owner: Champion=15, Top-scoring team=8, Golden Boot=8, Most-conceding=10, Total goals=12
 */
export const SCORING = {
  // ── Group match (per match, stacking — §6.1) ─────────────
  GROUP_MATCH_OUTCOME:      1,  // correct 1X2
  GROUP_MATCH_TOTAL_GOALS:  2,  // correct total goals (home+away) — independent of outcome
  GROUP_MATCH_EXACT:        3,  // correct exact score — stacks with both above

  // ── Group standings (per position, per group — §6.2) ─────
  GROUP_POSITION_CORRECT:   3,  // ×4 positions = 12 pts max per group

  // ── Advancement tiers (per team — §6.3) ─────────────────
  ADV_R32:    4,  // team correctly predicted to reach Round of 32
  ADV_R16:    5,  // … Round of 16
  ADV_QF:     6,  // … Quarter-final
  ADV_SF:     7,  // … Semi-final
  ADV_FINAL:  8,  // … Final (champion worth a separate FUTURES_CHAMPION on top)

  // ── Knockout scoreline (no 1X2 — §6.4) ──────────────────
  KO_TOTAL_GOALS:  2,  // correct total goals
  KO_EXACT:        3,  // correct exact score (stacks with total)

  // ── Tournament futures (§6.5) ────────────────────────────
  FUTURES_CHAMPION:         15,
  FUTURES_TOP_SCORER_TEAM:   8,
  FUTURES_GOLDEN_BOOT_TEAM:  8,
  FUTURES_MOST_CONCEDED:    10,
  FUTURES_TOTAL_GOALS:      12,
} as const

export type ScoringKey = keyof typeof SCORING
