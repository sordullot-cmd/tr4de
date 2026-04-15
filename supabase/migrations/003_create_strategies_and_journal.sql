-- ====== STRATÉGIES ======
-- Contient les stratégies de trading définies par l'utilisateur
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  setup_name VARCHAR(255),
  entry_rules TEXT,
  exit_rules TEXT,
  risk_per_trade DECIMAL(5, 2),
  reward_multiplier DECIMAL(5, 2),
  symbols TEXT[] DEFAULT '{}',
  timeframe VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ====== JOURNAL DE TRADING ======
-- Contient les notes/journal de chaque session de trading
CREATE TABLE IF NOT EXISTS trading_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  title VARCHAR(255),
  content TEXT,
  mood VARCHAR(50),
  duration_minutes INTEGER,
  trades_count INTEGER,
  session_pnl DECIMAL(15, 2),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ====== RÈGLES DE TRADING ======
-- Contient les règles personnalisées d'adhérence
CREATE TABLE IF NOT EXISTS trading_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rule_text VARCHAR(500) NOT NULL,
  rule_category VARCHAR(100),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  violation_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ====== PRÉFÉRENCES UTILISATEUR ======
-- Contient les paramètres personnalisés
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  timezone VARCHAR(100) DEFAULT 'UTC',
  default_broker VARCHAR(100),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  dark_mode BOOLEAN DEFAULT FALSE,
  risk_percentage DECIMAL(5, 2) DEFAULT 2.0,
  max_trades_per_day INTEGER DEFAULT 5,
  preferred_timeframe VARCHAR(50) DEFAULT '1H',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ====== RLS POLICIES ======
-- Enable RLS
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Strategies policies
CREATE POLICY strategies_select ON strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY strategies_insert ON strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY strategies_update ON strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY strategies_delete ON strategies
  FOR DELETE USING (auth.uid() = user_id);

-- Trading Journal policies
CREATE POLICY trading_journal_select ON trading_journal
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trading_journal_insert ON trading_journal
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trading_journal_update ON trading_journal
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY trading_journal_delete ON trading_journal
  FOR DELETE USING (auth.uid() = user_id);

-- Trading Rules policies
CREATE POLICY trading_rules_select ON trading_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trading_rules_insert ON trading_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trading_rules_update ON trading_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY trading_rules_delete ON trading_rules
  FOR DELETE USING (auth.uid() = user_id);

-- User Preferences policies
CREATE POLICY user_preferences_select ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_preferences_insert ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_preferences_update ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- ====== INDEXES ======
CREATE INDEX IF NOT EXISTS idx_strategies_user ON strategies(user_id, is_active DESC);
CREATE INDEX IF NOT EXISTS idx_trading_journal_user_date ON trading_journal(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_trading_rules_user ON trading_rules(user_id, is_active DESC);
