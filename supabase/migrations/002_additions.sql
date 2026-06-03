-- ============================================================
-- Migration 002 — New tables: group_match_predictions, futures_predictions
-- ============================================================

-- ── Group match score predictions (one per match per user) ──
CREATE TABLE IF NOT EXISTS group_match_predictions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id       INTEGER NOT NULL CHECK (match_id BETWEEN 1 AND 72),
  predicted_home INTEGER NOT NULL CHECK (predicted_home >= 0),
  predicted_away INTEGER NOT NULL CHECK (predicted_away >= 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, match_id)
);

CREATE INDEX IF NOT EXISTS gmp_user_idx ON group_match_predictions(user_id);

-- ── Futures predictions (one row per user) ──────────────────
CREATE TABLE IF NOT EXISTS futures_predictions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  champion_team_id        INTEGER REFERENCES teams(id),
  top_scorer_team_id      INTEGER REFERENCES teams(id),
  golden_boot_team_id     INTEGER REFERENCES teams(id),
  most_conceded_team_id   INTEGER REFERENCES teams(id),
  total_goals_prediction  INTEGER CHECK (total_goals_prediction >= 0),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Futures results (admin-entered once at tournament end) ──
CREATE TABLE IF NOT EXISTS futures_results (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  champion_team_id      INTEGER REFERENCES teams(id),
  top_scorer_team_id    INTEGER REFERENCES teams(id),
  golden_boot_team_id   INTEGER REFERENCES teams(id),
  most_conceded_team_id INTEGER REFERENCES teams(id),
  total_goals           INTEGER,
  entered_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row-Level Security ───────────────────────────────────────
ALTER TABLE group_match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE futures_predictions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE futures_results         ENABLE ROW LEVEL SECURITY;

-- group_match_predictions
CREATE POLICY "gmp_insert" ON group_match_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "gmp_update" ON group_match_predictions FOR UPDATE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "gmp_delete" ON group_match_predictions FOR DELETE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "gmp_select_own" ON group_match_predictions FOR SELECT
  USING (auth.uid() = user_id);

-- Reveal others' group match predictions at/after that match's kickoff
CREATE POLICY "gmp_select_others" ON group_match_predictions FOR SELECT
  USING (
    auth.uid() != user_id AND
    (SELECT m.scheduled_at FROM matches m WHERE m.id = group_match_predictions.match_id LIMIT 1) < NOW()
  );

-- futures_predictions
CREATE POLICY "fp_insert" ON futures_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "fp_update" ON futures_predictions FOR UPDATE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "fp_delete" ON futures_predictions FOR DELETE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "fp_select_own" ON futures_predictions FOR SELECT
  USING (auth.uid() = user_id);

-- Reveal futures predictions at Final kickoff
CREATE POLICY "fp_select_others" ON futures_predictions FOR SELECT
  USING (
    auth.uid() != user_id AND
    (SELECT m.scheduled_at FROM matches m WHERE m.bracket_slot = 'FINAL' LIMIT 1) < NOW()
  );

-- futures_results: public read, service role write
CREATE POLICY "fr_public_read" ON futures_results FOR SELECT USING (TRUE);
