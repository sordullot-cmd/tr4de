-- Create trading_accounts table
CREATE TABLE IF NOT EXISTS trading_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create apex_trades table
CREATE TABLE IF NOT EXISTS apex_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES trading_accounts(id) ON DELETE SET NULL,
  date TEXT,
  symbol TEXT,
  direction TEXT,
  entry FLOAT,
  exit FLOAT,
  pnl FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE apex_trades ENABLE ROW LEVEL SECURITY;

-- Create policies for trading_accounts
CREATE POLICY "Users can view their own trading accounts" 
  ON trading_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading accounts"
  ON trading_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading accounts"
  ON trading_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading accounts"
  ON trading_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for apex_trades
CREATE POLICY "Users can view their own trades"
  ON apex_trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON apex_trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
  ON apex_trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
  ON apex_trades FOR DELETE
  USING (auth.uid() = user_id);
