-- Create daily_session_notes table
CREATE TABLE IF NOT EXISTS daily_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

-- Enable RLS on daily_session_notes
ALTER TABLE daily_session_notes ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see and manage their own session notes
CREATE POLICY daily_session_notes_select ON daily_session_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY daily_session_notes_insert ON daily_session_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY daily_session_notes_update ON daily_session_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY daily_session_notes_delete ON daily_session_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_session_notes_user_id ON daily_session_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_session_notes_date ON daily_session_notes(date);
CREATE INDEX IF NOT EXISTS idx_daily_session_notes_user_date ON daily_session_notes(user_id, date);
