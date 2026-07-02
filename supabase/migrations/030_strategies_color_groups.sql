-- Aligne la table `strategies` avec le schéma attendu par l'application.
--
-- La table a été créée à l'origine par 003_create_strategies_and_journal.sql
-- avec un schéma « setup/entry/exit rules » qui ne contient NI `color` NI
-- `groups`. Or le hook useStrategies (lib/hooks/useUserData.ts) insère
-- { id, name, description, color, groups, user_id, created_at, updated_at }.
-- L'INSERT échouait donc côté Supabase (« Could not find the 'color' column »)
-- et le hook basculait silencieusement sur le fallback localStorage : les
-- stratégies n'étaient jamais persistées en ligne.
--
-- On ajoute les deux colonnes manquantes de façon idempotente. Les colonnes
-- de l'ancien schéma (setup_name, entry_rules, ...) restent en place mais
-- inutilisées ; elles sont toutes nullable et ne gênent pas les INSERT.

ALTER TABLE strategies ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#5F7FB4';
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS groups JSONB DEFAULT '[]';
