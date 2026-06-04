-- ============================================================
-- Migration 004 — Explicit table grants for authenticated role
-- Without these, RLS policies are never evaluated and
-- authenticated users get "permission denied for table".
-- ============================================================

-- Core prediction tables (read + write for authenticated users)
GRANT SELECT, INSERT, UPDATE, DELETE ON group_predictions      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON group_match_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON third_place_selections  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON knockout_predictions    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON futures_predictions     TO authenticated;

-- Reference tables (read-only for authenticated users)
GRANT SELECT ON teams   TO authenticated;
GRANT SELECT ON matches TO authenticated;
GRANT SELECT ON scores  TO authenticated;
GRANT SELECT ON futures_results TO authenticated;

-- Profiles (read + update own row; admin reads all via existing policy)
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Anon users need read access to public reference data
GRANT SELECT ON teams   TO anon;
GRANT SELECT ON matches TO anon;
GRANT SELECT ON scores  TO anon;
