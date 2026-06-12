-- Ajouter les colonnes quantité / volume à apex_trades.
--   quantity : nombre de contrats / lots du trade
--   volume   : montant notionnel total (qty × prix × multiplicateur)
ALTER TABLE apex_trades ADD COLUMN IF NOT EXISTS quantity NUMERIC;
ALTER TABLE apex_trades ADD COLUMN IF NOT EXISTS volume NUMERIC;
