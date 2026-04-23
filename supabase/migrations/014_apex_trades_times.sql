-- Ajouter les colonnes d'horaires à apex_trades (Fill Time entrée/sortie).
ALTER TABLE apex_trades ADD COLUMN IF NOT EXISTS entry_time TEXT;
ALTER TABLE apex_trades ADD COLUMN IF NOT EXISTS exit_time TEXT;
