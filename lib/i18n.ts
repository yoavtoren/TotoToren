/**
 * i18n string table.
 * All UI text lives here. Add a "he" object with the same keys for Hebrew.
 * Toggle language via a lang context; layout sets dir="rtl" automatically.
 */

const en = {
  // Navigation
  nav_home:        'Home',
  nav_predict:     'Predict',
  nav_leaderboard: 'Leaderboard',
  nav_format:      'Format',
  nav_signin:      'Sign in',
  nav_signout:     'Sign out',

  // Home page
  home_hero_badge:     '🇺🇸 🇨🇦 🇲🇽  FIFA World Cup 2026',
  home_hero_title:     'TotoToren',
  home_hero_subtitle:  'Predict the World Cup 2026 with your friends. Pick every group, build your full bracket, and prove you called it first.',
  home_cta_predict:    'Build My Predictions →',
  home_cta_leaderboard:'View Leaderboard',
  home_countdown_label:'Tournament starts in',
  home_locked_title:   'Predictions Locked',
  home_locked_sub:     'The tournament has started — see you on the leaderboard!',
  home_howto_title:    'How it works',

  // Prediction builder parts
  part1_title:   'Part 1 — Group Match Scorelines',
  part1_sub:     'Predict the score of every group stage match (72 total). From your scores, the 1X2 outcome is derived automatically.',
  part2_title:   'Part 2 — Group Standings',
  part2_sub:     'Drag to rank all 4 teams in each group (1st → 4th).',
  part3_title:   'Part 3 — Best 8 Third-Place Teams',
  part3_sub:     'Pick 8 of the 12 3rd-place teams to advance to the Round of 32.',
  part4_title:   'Part 4 — Knockout Bracket',
  part4_sub:     'Click to pick the winner of each knockout match. Winners cascade automatically.',
  part5_title:   'Part 5 — Tournament Futures',
  part5_sub:     'Five tournament-long bets scored at the end.',

  // Futures labels
  futures_champion:      'World Cup Champion',
  futures_top_scorer:    'Top-Scoring Team (most goals)',
  futures_golden_boot:   'Golden Boot Team (top scorer\'s club)',
  futures_most_conceded: 'Most Goals Conceded',
  futures_total_goals:   'Total Goals in Tournament',
  futures_total_hint:    'Typical range: 140–180',

  // Progress
  progress_title:    'Bet Progress',
  progress_complete: '% complete',
  progress_items:    'items left',

  // Predict page
  predict_title:   'My Predictions',
  predict_sub:     'Complete all five parts and save before the tournament starts.',
  predict_save:    '💾 Save Predictions',
  predict_saving:  'Saving…',
  predict_saved:   '✓ Saved!',
  predict_locked:  '🔒 Predictions locked — tournament has started',

  // Format page
  format_title:   'Tournament Format',
  format_sub:     '2026 FIFA World Cup — How it works',

  // Leaderboard
  lb_title:       'Leaderboard',
  lb_participants:'participants',
  lb_top_score:   'Top Score',
  lb_avg_score:   'Avg Score',
  lb_empty:       'No scores yet — be the first to submit predictions!',

  // Admin
  admin_title:    'Admin Panel',
  admin_sub:      'Enter match results and recalculate scores.',
  admin_recalc:   '⚡ Recalculate All Scores',
  admin_recalcing:'Calculating…',

  // General
  tbd: 'TBD',
  hidden_until: '🔒 hidden until kick-off',
  drag_to_rank: 'drag to rank',
  save: 'Save',
  cancel: 'Cancel',
  loading: 'Loading…',
} as const

// Placeholder Hebrew strings (same keys, English values for now — replace to ship Hebrew)
const he: typeof en = { ...en }

export type Lang = 'en' | 'he'
export type I18nKey = keyof typeof en

const STRINGS: Record<Lang, typeof en> = { en, he }

export function t(key: I18nKey, lang: Lang = 'en'): string {
  return STRINGS[lang][key] ?? key
}

export function isRtl(lang: Lang): boolean {
  return lang === 'he'
}
