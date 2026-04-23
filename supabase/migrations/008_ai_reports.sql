-- Migration 008: AI Reports (daily / weekly)
-- Rapports auto-generes par l'IA (fin de jour / fin de semaine)

CREATE TABLE IF NOT EXISTS ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type VARCHAR(16) NOT NULL CHECK (report_type IN ('daily', 'weekly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title VARCHAR(255),
  content TEXT NOT NULL,
  stats JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, report_type, period_start)
);

CREATE INDEX IF NOT EXISTS ix_ai_reports_user ON ai_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_reports_user_type ON ai_reports(user_id, report_type, period_start DESC);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_reports_select ON ai_reports;
DROP POLICY IF EXISTS ai_reports_insert ON ai_reports;
DROP POLICY IF EXISTS ai_reports_update ON ai_reports;
DROP POLICY IF EXISTS ai_reports_delete ON ai_reports;

CREATE POLICY ai_reports_select ON ai_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ai_reports_insert ON ai_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ai_reports_update ON ai_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ai_reports_delete ON ai_reports FOR DELETE USING (auth.uid() = user_id);
