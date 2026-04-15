-- Create table for trade emotion tags
CREATE TABLE IF NOT EXISTS trade_emotion_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL,
  user_id UUID NOT NULL,
  emotion_tag VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (trade_id) REFERENCES apex_trades(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(trade_id, emotion_tag)
);

-- Create table for trade error tags
CREATE TABLE IF NOT EXISTS trade_error_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL,
  user_id UUID NOT NULL,
  error_tag VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (trade_id) REFERENCES apex_trades(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(trade_id, error_tag)
);

-- Enable RLS
ALTER TABLE trade_emotion_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_error_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emotion tags
CREATE POLICY trade_emotion_tags_select ON trade_emotion_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trade_emotion_tags_insert ON trade_emotion_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trade_emotion_tags_delete ON trade_emotion_tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for error tags
CREATE POLICY trade_error_tags_select ON trade_error_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trade_error_tags_insert ON trade_error_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trade_error_tags_delete ON trade_error_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_emotion_tags_user ON trade_emotion_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_emotion_tags_trade ON trade_emotion_tags(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_error_tags_user ON trade_error_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_error_tags_trade ON trade_error_tags(trade_id);
