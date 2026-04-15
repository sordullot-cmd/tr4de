-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- TABLE: trades
-- Contient les informations de base de chaque trade
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
-- Contient les informations subjectives par trade
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
-- Contient les vecteurs pour la recherche sémantique
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
-- Contient les alertes générées par l'agent IA
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

-- RLS: trades - Les utilisateurs ne voient que leurs propres trades
CREATE POLICY trades_select ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trades_insert ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trades_update ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY trades_delete ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: trade_details
CREATE POLICY trade_details_select ON trade_details
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trade_details_insert ON trade_details
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trade_details_update ON trade_details
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY trade_details_delete ON trade_details
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: trade_embeddings
CREATE POLICY trade_embeddings_select ON trade_embeddings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trade_embeddings_insert ON trade_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS: agent_notifications
CREATE POLICY agent_notifications_select ON agent_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY agent_notifications_insert ON agent_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY agent_notifications_update ON agent_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_details_trade ON trade_details(trade_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_user ON agent_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_unread ON agent_notifications(user_id, is_read);

-- TABLE: strategies
-- Contient les stratégies de trading de l'utilisateur
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

-- TABLE: daily_discipline_tracking
-- Suivi quotidien des règles de discipline
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

-- TABLE: daily_session_notes
-- Notes de session quotidienne
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

-- Enable RLS on new tables
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_discipline_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_session_notes ENABLE ROW LEVEL SECURITY;

-- RLS: strategies
CREATE POLICY strategies_select ON strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY strategies_insert ON strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY strategies_update ON strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY strategies_delete ON strategies
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: daily_discipline_tracking
CREATE POLICY daily_discipline_tracking_select ON daily_discipline_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY daily_discipline_tracking_insert ON daily_discipline_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY daily_discipline_tracking_update ON daily_discipline_tracking
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY daily_discipline_tracking_delete ON daily_discipline_tracking
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: daily_session_notes
CREATE POLICY daily_session_notes_select ON daily_session_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY daily_session_notes_insert ON daily_session_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY daily_session_notes_update ON daily_session_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY daily_session_notes_delete ON daily_session_notes
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_discipline_user_id ON daily_discipline_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_discipline_date ON daily_discipline_tracking(date);
CREATE INDEX IF NOT EXISTS idx_daily_discipline_user_date ON daily_discipline_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_session_notes_user_id ON daily_session_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_session_notes_date ON daily_session_notes(date);
CREATE INDEX IF NOT EXISTS idx_daily_session_notes_user_date ON daily_session_notes(user_id, date);
