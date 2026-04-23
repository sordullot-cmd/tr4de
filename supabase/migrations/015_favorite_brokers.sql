-- Crée user_preferences si manquante (la migration 003 n'a peut-être jamais été appliquée),
-- puis ajoute la colonne des courtiers favoris.
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS favorite_brokers TEXT[] DEFAULT '{}';

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
