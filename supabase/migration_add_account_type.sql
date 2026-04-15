-- Add account_type and eval_account_size columns to trading_accounts
ALTER TABLE trading_accounts
ADD COLUMN account_type TEXT DEFAULT 'live',
ADD COLUMN eval_account_size TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN trading_accounts.account_type IS 'Type of account: live or eval';
COMMENT ON COLUMN trading_accounts.eval_account_size IS 'Size of eval account: 25k, 50k, 100k, or 150k (only for eval accounts)';
