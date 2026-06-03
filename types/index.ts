export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third_place' | 'final'

export interface Team {
  id: number
  name: string
  flag_code: string
  group_letter: string
}

export interface Match {
  id: number
  stage: Stage
  group_letter: string | null
  bracket_slot: string
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  scheduled_at: string
  feeds_into_slot: string | null
  feeds_into_side: 'home' | 'away' | null
}

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

// ── Prediction rows (DB shape) ───────────────────────────────

export interface GroupPrediction {
  id: string
  user_id: string
  team_id: number
  group_letter: string
  predicted_position: number
  updated_at: string
}

export interface ThirdPlaceSelection {
  id: string
  user_id: string
  team_id: number
  r32_match_num: number // R32 match number (73–88) where this 3rd-place team plays
}

export interface KnockoutPrediction {
  id: string
  user_id: string
  match_num: number          // match number (73–104)
  predicted_winner_id: number
  predicted_home_score: number | null
  predicted_away_score: number | null
  updated_at: string
}

export interface GroupMatchPrediction {
  id: string
  user_id: string
  match_id: number           // match number (1–72)
  predicted_home: number
  predicted_away: number
  updated_at: string
}

export interface FuturesPrediction {
  id: string
  user_id: string
  champion_team_id: number | null
  top_scorer_team_id: number | null
  golden_boot_team_id: number | null
  most_conceded_team_id: number | null
  total_goals_prediction: number | null
  updated_at: string
}

// ── Score (DB shape) ──────────────────────────────────────────

export interface Score {
  id: string
  user_id: string
  total_score: number
  group_match_points: number
  group_standing_points: number
  advancement_points: number
  knockout_score_points: number
  futures_points: number
  breakdown: ScoreBreakdown
  last_calculated_at: string
}

export interface ScoreBreakdown {
  group_matches:    Record<string, number>
  group_standings:  Record<string, number>
  advancement:      Record<string, number>
  knockout_scores:  Record<string, number>
  futures:          Record<string, number>
}

// ── Client-side prediction builder state ─────────────────────

export interface GroupOrder {
  [groupLetter: string]: number[]  // team IDs, index = predicted position (0 = 1st)
}

export interface GroupMatchScores {
  [matchId: number]: { home: string; away: string }
}

// third-place assignment: R32 match number → teamId
export interface ThirdPlaceState {
  [r32MatchNum: number]: number | null
}

// knockout bracket: match number → predicted winner teamId
export interface BracketWinners {
  [matchNum: number]: number | null
}

// knockout score predictions: match number → { home, away } string inputs
export interface KnockoutScores {
  [matchNum: number]: { home: string; away: string }
}

export interface FuturesState {
  champion_team_id:        number | null
  top_scorer_team_id:      number | null
  golden_boot_team_id:     number | null
  most_conceded_team_id:   number | null
  total_goals_prediction:  string  // string for input, convert to number on save
}

// Completion stats for the progress bar
export interface CompletionStats {
  groupMatches:    { filled: number; total: 72 }
  groupStandings:  { filled: number; total: 12 }
  thirdPlace:      { filled: number; total: 8  }
  knockout:        { filled: number; total: 32 }
  futures:         { filled: number; total: 5  }
  overallPct:      number
}
