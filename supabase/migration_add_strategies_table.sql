-- Create strategies table
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#5F7FB4',
  groups JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on strategies table
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;

-- RLS: strategies - Users can only see and manage their own strategies
CREATE POLICY strategies_select ON strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY strategies_insert ON strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY strategies_update ON strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY strategies_delete ON strategies
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
