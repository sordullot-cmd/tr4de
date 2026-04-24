-- Le check constraint "trading_accounts_broker_check" ne connaissait que
-- Tradovate / MetaTrader 5 / WealthCharts et bloque tout nouveau broker
-- (IG, FTMO, Rithmic, NinjaTrader, etc.). On le supprime — la validation se
-- fait désormais côté application via la liste brokers[].
ALTER TABLE trading_accounts DROP CONSTRAINT IF EXISTS trading_accounts_broker_check;
