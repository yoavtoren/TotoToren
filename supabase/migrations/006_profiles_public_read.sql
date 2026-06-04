-- Migration 006 — Allow all authenticated users to read all profiles
-- Needed for leaderboard: names and avatars of other participants must be visible.
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
