-- ============================================================
-- TotoToren — Initial schema
-- Run in Supabase SQL editor or via `supabase db push`
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Stage enum ──────────────────────────────────────────────
CREATE TYPE match_stage AS ENUM (
  'group', 'r32', 'r16', 'qf', 'sf', 'third_place', 'final'
);

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Teams ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  flag_code     TEXT NOT NULL,
  group_letter  CHAR(1) NOT NULL CHECK (group_letter BETWEEN 'A' AND 'L')
);

-- ── Matches ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id               INTEGER PRIMARY KEY,
  stage            match_stage NOT NULL,
  group_letter     CHAR(1),
  bracket_slot     TEXT NOT NULL UNIQUE,
  home_team_id     INTEGER REFERENCES teams(id),
  away_team_id     INTEGER REFERENCES teams(id),
  home_score       INTEGER,
  away_score       INTEGER,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  feeds_into_slot  TEXT,
  feeds_into_side  TEXT CHECK (feeds_into_side IN ('home', 'away')),
  location         TEXT
);

CREATE INDEX IF NOT EXISTS matches_stage_idx       ON matches(stage);
CREATE INDEX IF NOT EXISTS matches_group_idx       ON matches(group_letter);
CREATE INDEX IF NOT EXISTS matches_scheduled_idx   ON matches(scheduled_at);

-- ── Group Predictions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_predictions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id            INTEGER NOT NULL REFERENCES teams(id),
  group_letter       CHAR(1) NOT NULL,
  predicted_position INTEGER NOT NULL CHECK (predicted_position BETWEEN 1 AND 4),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_letter, predicted_position),
  UNIQUE (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS gp_user_idx ON group_predictions(user_id);

-- ── Third-place Selections ───────────────────────────────────
CREATE TABLE IF NOT EXISTS third_place_selections (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id          INTEGER NOT NULL REFERENCES teams(id),
  r32_bracket_slot TEXT NOT NULL,
  UNIQUE (user_id, r32_bracket_slot),
  UNIQUE (user_id, team_id)
);

-- ── Knockout Predictions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS knockout_predictions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bracket_slot          TEXT NOT NULL,
  predicted_winner_id   INTEGER NOT NULL REFERENCES teams(id),
  predicted_home_score  INTEGER,
  predicted_away_score  INTEGER,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, bracket_slot)
);

CREATE INDEX IF NOT EXISTS kp_user_idx ON knockout_predictions(user_id);

-- ── Scores ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_score         INTEGER NOT NULL DEFAULT 0,
  group_stage_points  INTEGER NOT NULL DEFAULT 0,
  knockout_points     INTEGER NOT NULL DEFAULT 0,
  breakdown           JSONB NOT NULL DEFAULT '{}',
  last_calculated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row-Level Security ───────────────────────────────────────
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches                ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_predictions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE third_place_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_predictions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores                 ENABLE ROW LEVEL SECURITY;

-- profiles: read own, admin reads all
CREATE POLICY "profiles_select_own"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
);
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (auth.uid() = id);

-- teams + matches: public read
CREATE POLICY "teams_public_read"   ON teams   FOR SELECT USING (TRUE);
CREATE POLICY "matches_public_read" ON matches FOR SELECT USING (TRUE);

-- group_predictions: write only before tournament start, read own always, read others after group's first match
CREATE POLICY "gp_insert" ON group_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "gp_update" ON group_predictions FOR UPDATE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "gp_delete" ON group_predictions FOR DELETE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "gp_select_own" ON group_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "gp_select_others" ON group_predictions FOR SELECT
  USING (
    auth.uid() != user_id AND
    (SELECT MIN(m.scheduled_at) FROM matches m WHERE m.group_letter = group_predictions.group_letter) < NOW()
  );

-- third_place_selections: same write rules, read after R32 slot's scheduled_at
CREATE POLICY "tps_insert" ON third_place_selections FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "tps_update" ON third_place_selections FOR UPDATE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "tps_delete" ON third_place_selections FOR DELETE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "tps_select_own" ON third_place_selections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tps_select_others" ON third_place_selections FOR SELECT
  USING (
    auth.uid() != user_id AND
    (SELECT m.scheduled_at FROM matches m WHERE m.bracket_slot = third_place_selections.r32_bracket_slot LIMIT 1) < NOW()
  );

-- knockout_predictions: write before tournament, reveal per match's scheduled_at
CREATE POLICY "kp_insert" ON knockout_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "kp_update" ON knockout_predictions FOR UPDATE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "kp_delete" ON knockout_predictions FOR DELETE
  USING (auth.uid() = user_id AND NOW() < '2026-06-11T19:00:00Z');

CREATE POLICY "kp_select_own" ON knockout_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "kp_select_others" ON knockout_predictions FOR SELECT
  USING (
    auth.uid() != user_id AND
    (SELECT m.scheduled_at FROM matches m WHERE m.bracket_slot = knockout_predictions.bracket_slot LIMIT 1) < NOW()
  );

-- scores: public read, service-role write
CREATE POLICY "scores_public_read" ON scores FOR SELECT USING (TRUE);
