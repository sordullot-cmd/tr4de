-- Migration 010: AI User Memory (profil long-terme du trader)
-- 1 ligne par user, distillation des conversations + trades pour permettre a l'IA d'apprendre

CREATE TABLE IF NOT EXISTS ai_user_memory (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trading_style TEXT,
  recurring_errors JSONB DEFAULT '[]'::jsonb,
  strengths JSONB DEFAULT '[]'::jsonb,
  emotional_patterns JSONB DEFAULT '[]'::jsonb,
  goals JSONB DEFAULT '[]'::jsonb,
  coach_notes TEXT,
  last_conversation_id UUID,
  messages_processed INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_user_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_user_memory_select ON ai_user_memory;
DROP POLICY IF EXISTS ai_user_memory_insert ON ai_user_memory;
DROP POLICY IF EXISTS ai_user_memory_update ON ai_user_memory;
DROP POLICY IF EXISTS ai_user_memory_delete ON ai_user_memory;

CREATE POLICY ai_user_memory_select ON ai_user_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ai_user_memory_insert ON ai_user_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_user_memory_update ON ai_user_memory FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ai_user_memory_delete ON ai_user_memory FOR DELETE USING (auth.uid() = user_id);
