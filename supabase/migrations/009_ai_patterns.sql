-- Migration 009: AI Patterns (coaching personnalise)
-- Patterns comportementaux detectes dans le trading de l'user

CREATE TABLE IF NOT EXISTS ai_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type VARCHAR(64) NOT NULL,
  pattern_key VARCHAR(255) NOT NULL,
  pattern_data JSONB DEFAULT '{}'::jsonb,
  occurrences INTEGER DEFAULT 1,
  avg_pnl_impact DECIMAL(15, 2),
  confidence DECIMAL(5, 2) DEFAULT 0,
  first_detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pattern_type, pattern_key)
);

CREATE INDEX IF NOT EXISTS ix_ai_patterns_user ON ai_patterns(user_id, occurrences DESC);
CREATE INDEX IF NOT EXISTS ix_ai_patterns_type ON ai_patterns(user_id, pattern_type);

ALTER TABLE ai_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_patterns_select ON ai_patterns;
DROP POLICY IF EXISTS ai_patterns_insert ON ai_patterns;
DROP POLICY IF EXISTS ai_patterns_update ON ai_patterns;
DROP POLICY IF EXISTS ai_patterns_delete ON ai_patterns;

CREATE POLICY ai_patterns_select ON ai_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ai_patterns_insert ON ai_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_patterns_update ON ai_patterns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ai_patterns_delete ON ai_patterns FOR DELETE USING (auth.uid() = user_id);
