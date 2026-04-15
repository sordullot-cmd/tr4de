-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- TABLE: trades
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_time TIMESTAMP NOT NULL,
  exit_time TIMESTAMP,
  symbol VARCHAR(10) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('LONG', 'SHORT')),
  entry_price DECIMAL(10, 2) NOT NULL,
  exit_price DECIMAL(10, 2),
  quantity DECIMAL(10, 4) NOT NULL,
  pnl DECIMAL(15, 2),
  risk_reward_ratio DECIMAL(10, 2),
  duration_seconds INTEGER,
  exit_type VARCHAR(50) CHECK (exit_type IN ('Manual', 'Stop Loss', 'Take Profit', 'AutoLiq', NULL)),
  setup_name VARCHAR(255),
  broker VARCHAR(100),
  session_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- TABLE: trade_details
CREATE TABLE IF NOT EXISTS trade_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL,
  user_id UUID NOT NULL,
  notes TEXT,
  emotion_tags TEXT[] DEFAULT '{}',
  rule_indices INTEGER[] DEFAULT '{}',
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  screenshot_url TEXT,
  trade_serialized TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- TABLE: trade_embeddings
CREATE TABLE IF NOT EXISTS trade_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index IVFFlat pour la recherche rapide de similarité
CREATE INDEX IF NOT EXISTS ix_trade_embeddings_vector ON trade_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- TABLE: agent_notifications
CREATE TABLE IF NOT EXISTS agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trade_id UUID,
  agent_name VARCHAR(100) NOT NULL,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('info', 'warning', 'stop', 'report')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;

-- DROP existing policies to avoid conflicts
DROP POLICY IF EXISTS trades_select ON trades;
DROP POLICY IF EXISTS trades_insert ON trades;
DROP POLICY IF EXISTS trades_update ON trades;
DROP POLICY IF EXISTS trades_delete ON trades;

DROP POLICY IF EXISTS trade_details_select ON trade_details;
DROP POLICY IF EXISTS trade_details_insert ON trade_details;
DROP POLICY IF EXISTS trade_details_update ON trade_details;
DROP POLICY IF EXISTS trade_details_delete ON trade_details;

DROP POLICY IF EXISTS trade_embeddings_select ON trade_embeddings;
DROP POLICY IF EXISTS trade_embeddings_insert ON trade_embeddings;

DROP POLICY IF EXISTS agent_notifications_select ON agent_notifications;
DROP POLICY IF EXISTS agent_notifications_insert ON agent_notifications;
DROP POLICY IF EXISTS agent_notifications_update ON agent_notifications;

-- RLS: trades
CREATE POLICY trades_select ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY trades_insert ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY trades_update ON trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY trades_delete ON trades FOR DELETE USING (auth.uid() = user_id);

-- RLS: trade_details
CREATE POLICY trade_details_select ON trade_details FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY trade_details_insert ON trade_details FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY trade_details_update ON trade_details FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY trade_details_delete ON trade_details FOR DELETE USING (auth.uid() = user_id);

-- RLS: trade_embeddings
CREATE POLICY trade_embeddings_select ON trade_embeddings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY trade_embeddings_insert ON trade_embeddings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: agent_notifications
CREATE POLICY agent_notifications_select ON agent_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY agent_notifications_insert ON agent_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY agent_notifications_update ON agent_notifications FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_details_trade ON trade_details(trade_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_user ON agent_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_unread ON agent_notifications(user_id, is_read);
