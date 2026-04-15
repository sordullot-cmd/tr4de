-- Create daily_discipline_tracking table
CREATE TABLE IF NOT EXISTS daily_discipline_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  rule_id VARCHAR(100) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date, rule_id)
);

-- Enable RLS on daily_discipline_tracking
ALTER TABLE daily_discipline_tracking ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see and manage their own discipline tracking
CREATE POLICY daily_discipline_tracking_select ON daily_discipline_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY daily_discipline_tracking_insert ON daily_discipline_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY daily_discipline_tracking_update ON daily_discipline_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY daily_discipline_tracking_delete ON daily_discipline_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_discipline_user_id ON daily_discipline_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_discipline_date ON daily_discipline_tracking(date);
CREATE INDEX IF NOT EXISTS idx_daily_discipline_user_date ON daily_discipline_tracking(user_id, date);
