-- Migration to allow anonymous users (no FK to auth.users)
-- Drop existing constraints and recreate tables without auth dependency

-- Drop foreign key constraints
ALTER TABLE apex_trades
DROP CONSTRAINT IF EXISTS apex_trades_user_id_fkey;

ALTER TABLE trading_accounts
DROP CONSTRAINT IF EXISTS trading_accounts_user_id_fkey;

-- Drop RLS policies (will recreate with simpler logic)
DROP POLICY IF EXISTS "Users can view their own trading accounts" ON trading_accounts;
DROP POLICY IF EXISTS "Users can insert their own trading accounts" ON trading_accounts;
DROP POLICY IF EXISTS "Users can update their own trading accounts" ON trading_accounts;
DROP POLICY IF EXISTS "Users can delete their own trading accounts" ON trading_accounts;

DROP POLICY IF EXISTS "Users can view their own trades" ON apex_trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON apex_trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON apex_trades;
DROP POLICY IF EXISTS "Users can delete their own trades" ON apex_trades;

-- Disable RLS temporarily (will use client-side filtering with userId)
ALTER TABLE trading_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE apex_trades DISABLE ROW LEVEL SECURITY;

-- Add note column for future authentication migration
ALTER TABLE trading_accounts 
ADD COLUMN IF NOT EXISTS note TEXT DEFAULT 'Anonymous user - migrate when auth is implemented';

ALTER TABLE apex_trades 
ADD COLUMN IF NOT EXISTS note TEXT DEFAULT 'Anonymous user - migrate when auth is implemented';

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_apex_trades_user_id ON apex_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_apex_trades_account_id ON apex_trades(account_id);

-- Optional: Create cleanup trigger to remove old anonymous data (older than 90 days)
-- This can be added later if needed
