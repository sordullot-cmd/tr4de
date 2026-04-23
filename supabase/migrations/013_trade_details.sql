-- Trade details: notes, screenshots, etc. attached to a specific trade.
-- trade_id is TEXT (no FK) so we can store details for trades not yet in apex_trades
-- or trades whose ids are non-UUID strings.
CREATE TABLE IF NOT EXISTS trade_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id TEXT NOT NULL,
  notes TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Drop any old FK first (must precede type change since trade_id may be in an FK)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'trade_details'::regclass AND contype = 'f'
  LOOP
    EXECUTE 'ALTER TABLE trade_details DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Si la table existait déjà avec trade_id en UUID, on le passe en TEXT.
ALTER TABLE trade_details ALTER COLUMN trade_id TYPE TEXT USING trade_id::text;

-- Re-add le FK user_id (user_id pointe sur auth.users)
ALTER TABLE trade_details
  ADD CONSTRAINT trade_details_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Nettoyer doublons éventuels avant d'ajouter la contrainte unique.
DELETE FROM trade_details t1
USING trade_details t2
WHERE t1.ctid < t2.ctid
  AND t1.user_id = t2.user_id
  AND t1.trade_id = t2.trade_id;

-- Ajouter la contrainte UNIQUE (idempotent via DO)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trade_details_user_trade_unique'
  ) THEN
    ALTER TABLE trade_details
      ADD CONSTRAINT trade_details_user_trade_unique UNIQUE (user_id, trade_id);
  END IF;
END $$;

ALTER TABLE trade_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trade_details_select ON trade_details;
DROP POLICY IF EXISTS trade_details_insert ON trade_details;
DROP POLICY IF EXISTS trade_details_update ON trade_details;
DROP POLICY IF EXISTS trade_details_delete ON trade_details;

CREATE POLICY trade_details_select ON trade_details
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trade_details_insert ON trade_details
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trade_details_update ON trade_details
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY trade_details_delete ON trade_details
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trade_details_user_trade ON trade_details(user_id, trade_id);
