-- Actual final group standings entered by admin after group stage
CREATE TABLE IF NOT EXISTS group_actual_standings (
  group_letter CHAR(1) NOT NULL CHECK (group_letter BETWEEN 'A' AND 'L'),
  position     INTEGER NOT NULL CHECK (position BETWEEN 1 AND 4),
  team_id      INTEGER NOT NULL REFERENCES teams(id),
  PRIMARY KEY (group_letter, position)
);

-- The 8 third-place teams that actually qualified for R32
CREATE TABLE IF NOT EXISTS r32_third_place_qualifiers (
  team_id INTEGER PRIMARY KEY REFERENCES teams(id)
);

GRANT ALL ON group_actual_standings      TO service_role;
GRANT ALL ON r32_third_place_qualifiers  TO service_role;
GRANT SELECT ON group_actual_standings     TO authenticated, anon;
GRANT SELECT ON r32_third_place_qualifiers TO authenticated, anon;
