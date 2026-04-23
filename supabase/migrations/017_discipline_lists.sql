-- Stocke les 3 listes de la page Discipline (Bias / Règles à suivre / Erreurs)
-- dans user_preferences.
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS bias_items     TEXT[];
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS error_items    TEXT[];
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS personal_rules JSONB;

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_preferences_select ON user_preferences;
DROP POLICY IF EXISTS user_preferences_insert ON user_preferences;
DROP POLICY IF EXISTS user_preferences_update ON user_preferences;
DROP POLICY IF EXISTS user_preferences_delete ON user_preferences;

CREATE POLICY user_preferences_select ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_preferences_insert ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_preferences_update ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY user_preferences_delete ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);
