-- Create table for user-defined custom discipline rules
CREATE TABLE IF NOT EXISTS custom_discipline_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_id VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('texte', 'horaire', 'argent')),
  text TEXT NOT NULL,
  time VARCHAR(10),
  amount VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id, rule_id)
);

ALTER TABLE custom_discipline_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS custom_discipline_rules_select ON custom_discipline_rules;
DROP POLICY IF EXISTS custom_discipline_rules_insert ON custom_discipline_rules;
DROP POLICY IF EXISTS custom_discipline_rules_update ON custom_discipline_rules;
DROP POLICY IF EXISTS custom_discipline_rules_delete ON custom_discipline_rules;

CREATE POLICY custom_discipline_rules_select ON custom_discipline_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY custom_discipline_rules_insert ON custom_discipline_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY custom_discipline_rules_update ON custom_discipline_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY custom_discipline_rules_delete ON custom_discipline_rules
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_custom_discipline_rules_user ON custom_discipline_rules(user_id, created_at DESC);
