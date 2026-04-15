-- Create table for daily discipline tracking
CREATE TABLE IF NOT EXISTS daily_discipline_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  rule_id VARCHAR(100) NOT NULL, -- 'premarket', 'biais', 'news', etc.
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date, rule_id)
);

-- Enable RLS
ALTER TABLE daily_discipline_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY daily_discipline_select ON daily_discipline_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY daily_discipline_insert ON daily_discipline_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY daily_discipline_update ON daily_discipline_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY daily_discipline_delete ON daily_discipline_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_discipline_user_date ON daily_discipline_tracking(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_discipline_user_rule ON daily_discipline_tracking(user_id, rule_id);
