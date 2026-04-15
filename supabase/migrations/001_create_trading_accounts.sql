-- Migration: Create Trading Accounts System
-- Description: Add trading_accounts table and link it to trades

-- TABLE: trading_accounts
-- Hiérarchie des comptes de trading par utilisateur
CREATE TABLE IF NOT EXISTS trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  broker VARCHAR(50) NOT NULL CHECK (broker IN ('MetaTrader 5', 'Tradovate')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Ajouter la colonne account_id à la table trades (si elle n'existe pas)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS account_id UUID;

-- Ajouter la contrainte de clé étrangère
ALTER TABLE trades ADD CONSTRAINT fk_trades_account 
  FOREIGN KEY (account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE;

-- Enable RLS sur trading_accounts
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

-- RLS: trading_accounts - Les utilisateurs ne voient que leurs propres comptes
CREATE POLICY trading_accounts_select ON trading_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trading_accounts_insert ON trading_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trading_accounts_update ON trading_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY trading_accounts_delete ON trading_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user ON trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
