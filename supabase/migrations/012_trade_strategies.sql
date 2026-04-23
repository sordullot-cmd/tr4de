-- Junction table: assignments of strategies to trades
-- Composite key (user_id, trade_id, strategy_id) ensures no duplicates.
CREATE TABLE IF NOT EXISTS trade_strategies (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, trade_id, strategy_id)
);

ALTER TABLE trade_strategies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trade_strategies_select ON trade_strategies;
DROP POLICY IF EXISTS trade_strategies_insert ON trade_strategies;
DROP POLICY IF EXISTS trade_strategies_delete ON trade_strategies;

CREATE POLICY trade_strategies_select ON trade_strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trade_strategies_insert ON trade_strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trade_strategies_delete ON trade_strategies
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trade_strategies_user_trade ON trade_strategies(user_id, trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_strategies_user_strategy ON trade_strategies(user_id, strategy_id);
