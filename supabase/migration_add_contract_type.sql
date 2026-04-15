-- Add contract_type field to distinguish MICRO vs MINI contracts
-- This is essential for accurate PnL calculations and risk management

ALTER TABLE apex_trades
ADD COLUMN contract_type VARCHAR(20) DEFAULT 'standard',
ADD COLUMN lot_size INT DEFAULT 1;

-- Add comment to explain the field
COMMENT ON COLUMN apex_trades.contract_type IS 'Type of contract: micro, mini, or standard. Examples: NQ=mini, MNQ=micro, ES=mini, MES=micro';
COMMENT ON COLUMN apex_trades.lot_size IS 'Number of contracts traded';

-- Create index for filtering by contract type
CREATE INDEX idx_apex_trades_contract_type ON apex_trades(user_id, contract_type);

-- Update existing trades to auto-detect contract type based on symbol
-- Micro contracts: MNQ, MES, MYM, M2K
-- Mini contracts: NQ, ES, YM, NK
UPDATE apex_trades 
SET contract_type = 'micro'
WHERE symbol IN ('MNQ', 'MES', 'MYM', 'M2K', 'MME', 'MNGU', 'MNQM6', 'MESM6', 'MYMU6');

UPDATE apex_trades 
SET contract_type = 'mini'
WHERE symbol IN ('NQ', 'ES', 'YM', 'NK', 'NE', 'GE', 'NQM6', 'ESM6', 'YMM6');

UPDATE apex_trades
SET contract_type = 'standard'
WHERE symbol NOT IN ('MNQ', 'MES', 'MYM', 'M2K', 'MME', 'MNGU', 'MNQM6', 'MESM6', 'MYMU6', 'NQ', 'ES', 'YM', 'NK', 'NE', 'GE', 'NQM6', 'ESM6', 'YMM6');
