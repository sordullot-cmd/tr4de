-- Migration 007: AI Chat History
-- Stocke les conversations et messages du chat Apex IA

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_conversations_user ON ai_conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_messages_conversation ON ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS ix_ai_messages_user ON ai_messages(user_id, created_at DESC);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_conversations_select ON ai_conversations;
DROP POLICY IF EXISTS ai_conversations_insert ON ai_conversations;
DROP POLICY IF EXISTS ai_conversations_update ON ai_conversations;
DROP POLICY IF EXISTS ai_conversations_delete ON ai_conversations;

CREATE POLICY ai_conversations_select ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ai_conversations_insert ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_conversations_update ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ai_conversations_delete ON ai_conversations FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_messages_select ON ai_messages;
DROP POLICY IF EXISTS ai_messages_insert ON ai_messages;
DROP POLICY IF EXISTS ai_messages_delete ON ai_messages;

CREATE POLICY ai_messages_select ON ai_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ai_messages_insert ON ai_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_messages_delete ON ai_messages FOR DELETE USING (auth.uid() = user_id);

-- Trigger pour garder ai_conversations.updated_at synchronisé au dernier message
CREATE OR REPLACE FUNCTION touch_ai_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_ai_conversation ON ai_messages;
CREATE TRIGGER trg_touch_ai_conversation
AFTER INSERT ON ai_messages
FOR EACH ROW EXECUTE FUNCTION touch_ai_conversation_updated_at();
