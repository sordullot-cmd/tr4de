-- Migration to add WealthCharts broker support
-- Updates the CHECK constraint on trading_accounts.broker to include "WealthCharts"

-- Drop the old constraint
ALTER TABLE trading_accounts
DROP CONSTRAINT IF EXISTS trading_accounts_broker_check;

-- Add the new constraint with WealthCharts support
ALTER TABLE trading_accounts
ADD CONSTRAINT trading_accounts_broker_check 
CHECK (broker IN ('Tradovate', 'MetaTrader 5', 'WealthCharts'));

-- Note: This migration should be run in Supabase directly via the SQL editor
-- or through your database migration tool
