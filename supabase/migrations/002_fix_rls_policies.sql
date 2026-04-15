-- Fix RLS Policies for Trading Accounts
-- Run this if you get "violates row-level security policy" errors

-- Drop existing policies
DROP POLICY IF EXISTS trading_accounts_select ON trading_accounts;
DROP POLICY IF EXISTS trading_accounts_insert ON trading_accounts;
DROP POLICY IF EXISTS trading_accounts_update ON trading_accounts;
DROP POLICY IF EXISTS trading_accounts_delete ON trading_accounts;

-- Re-create with proper authentication check
CREATE POLICY trading_accounts_select ON trading_accounts
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

CREATE POLICY trading_accounts_insert ON trading_accounts
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

CREATE POLICY trading_accounts_update ON trading_accounts
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY trading_accounts_delete ON trading_accounts
  FOR DELETE 
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

-- Also update trades table RLS if needed
DROP POLICY IF EXISTS trades_insert ON trades;

CREATE POLICY trades_insert ON trades
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = user_id
  );

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
