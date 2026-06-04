-- Migration 006 — Schema corrections for scoring to work
-- Safe to re-run (all IF NOT EXISTS / IF EXISTS guards)

-- ── scores: add per-category breakdown columns ──────────────
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS group_match_points     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_standing_points  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advancement_points     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS knockout_score_points  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS futures_points         INTEGER NOT NULL DEFAULT 0;

-- ── group_match_predictions: add independent prediction fields
ALTER TABLE group_match_predictions
  ADD COLUMN IF NOT EXISTS predicted_outcome     TEXT CHECK (predicted_outcome IN ('1','X','2')),
  ADD COLUMN IF NOT EXISTS predicted_total_goals INTEGER CHECK (predicted_total_goals >= 0);

-- Relax the NOT NULL constraint on predicted_home/away so users can
-- predict only 1X2 or only Σ without being forced to enter a score.
ALTER TABLE group_match_predictions
  ALTER COLUMN predicted_home DROP NOT NULL,
  ALTER COLUMN predicted_away DROP NOT NULL;

-- ── knockout_predictions: add match_num + total_goals if missing
ALTER TABLE knockout_predictions
  ADD COLUMN IF NOT EXISTS match_num             INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_total_goals INTEGER;

-- Populate match_num from bracket_slot if still null (e.g. "M89" → 89)
UPDATE knockout_predictions
  SET match_num = CAST(SUBSTRING(bracket_slot FROM 2) AS INTEGER)
  WHERE match_num IS NULL AND bracket_slot ~ '^M[0-9]+$';

-- ── knockout_stage_qualifiers: needed by recalculate route ──
CREATE TABLE IF NOT EXISTS knockout_stage_qualifiers (
  stage    TEXT NOT NULL CHECK (stage IN ('r16','qf','sf','final','champion')),
  team_id  INTEGER NOT NULL REFERENCES teams(id),
  PRIMARY KEY (stage, team_id)
);

GRANT ALL ON knockout_stage_qualifiers TO service_role;
GRANT SELECT ON knockout_stage_qualifiers TO authenticated, anon;

-- ── scores: grant service_role full access ──────────────────
GRANT ALL ON scores TO service_role;
