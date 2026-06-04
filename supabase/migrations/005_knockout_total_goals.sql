-- Migration 005 — Add predicted_total_goals to knockout_predictions
ALTER TABLE knockout_predictions
  ADD COLUMN IF NOT EXISTS predicted_total_goals INTEGER;
