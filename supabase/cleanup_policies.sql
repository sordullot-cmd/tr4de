-- Script pour corriger l'erreur "policy already exists"
-- Exécutez ce script si vous recevez une erreur "policy ... already exists"

-- Cette commande supprime les anciennes politiques des tables existantes
-- et les récréera correctement

-- Pour la table trades (existante)
DROP POLICY IF EXISTS trades_select ON trades;
DROP POLICY IF EXISTS trades_insert ON trades;
DROP POLICY IF EXISTS trades_update ON trades;
DROP POLICY IF EXISTS trades_delete ON trades;

-- Pour la table trade_details (existante)
DROP POLICY IF EXISTS trade_details_select ON trade_details;
DROP POLICY IF EXISTS trade_details_insert ON trade_details;
DROP POLICY IF EXISTS trade_details_update ON trade_details;
DROP POLICY IF EXISTS trade_details_delete ON trade_details;

-- Pour la table trade_embeddings (existante)
DROP POLICY IF EXISTS trade_embeddings_select ON trade_embeddings;
DROP POLICY IF EXISTS trade_embeddings_insert ON trade_embeddings;

-- Pour la table agent_notifications (existante)
DROP POLICY IF EXISTS agent_notifications_select ON agent_notifications;
DROP POLICY IF EXISTS agent_notifications_insert ON agent_notifications;
DROP POLICY IF EXISTS agent_notifications_update ON agent_notifications;

-- Pour les nouvelles tables (si elles existent déjà)
DROP POLICY IF EXISTS strategies_select ON strategies;
DROP POLICY IF EXISTS strategies_insert ON strategies;
DROP POLICY IF EXISTS strategies_update ON strategies;
DROP POLICY IF EXISTS strategies_delete ON strategies;

DROP POLICY IF EXISTS daily_discipline_tracking_select ON daily_discipline_tracking;
DROP POLICY IF EXISTS daily_discipline_tracking_insert ON daily_discipline_tracking;
DROP POLICY IF EXISTS daily_discipline_tracking_update ON daily_discipline_tracking;
DROP POLICY IF EXISTS daily_discipline_tracking_delete ON daily_discipline_tracking;

DROP POLICY IF EXISTS daily_session_notes_select ON daily_session_notes;
DROP POLICY IF EXISTS daily_session_notes_insert ON daily_session_notes;
DROP POLICY IF EXISTS daily_session_notes_update ON daily_session_notes;
DROP POLICY IF EXISTS daily_session_notes_delete ON daily_session_notes;

-- Message de confirmation
SELECT 'Toutes les anciennes politiques ont été supprimées. Vous pouvez maintenant exécuter migration_safe.sql' as status;
