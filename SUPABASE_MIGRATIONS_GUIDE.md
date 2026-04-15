# 📊 Guide d'Application des Migrations Supabase

Ce fichier contient les étapes à suivre pour appliquer les migrations Supabase nécessaires pour que le Journal, les Stratégies et la Discipline Tracking fonctionnent correctement.

## 🚀 Étapes pour appliquer les migrations

### ⚠️ SI VOUS AVEZ UNE ERREUR "policy already exists"

Si vous voyez l'erreur:
```
ERROR: 42710: policy "trades_select" for table "trades" already exists
```

**Cela signifie que vous avez déjà les tables existantes.** Utilisez le script sécurisé à la place:

1. Ouvrez **SQL Editor** dans Supabase
2. Ouvrez le fichier: `supabase/migration_safe.sql`
3. Copiez TOUT le contenu
4. Collez-le dans l'éditeur SQL de Supabase
5. Cliquez sur "Execute"

Ce script sûr:
- ✅ Crée UNIQUEMENT les 3 nouvelles tables
- ✅ Supprime les anciennes politiques avant les récréer
- ✅ Ne touche pas à vos tables existantes (trades, trade_details, etc)

### Option 1: Via Supabase SQL Editor (Recommandé - Plus facile)

1. **Ouvrir Supabase Dashboard**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet

2. **Utiliser SQL Editor**
   - Allez à "SQL Editor" dans le menu de gauche
   - Cliquez sur "+ New Query"

3. **Copier et exécuter le SQL**
   
   **SI C'EST VOTRE PREMIÈRE FOIS (pas d'erreur):**
   - Ouvrez le fichier `supabase/schema.sql`
   - Copiez TOUT le contenu
   - Collez-le dans l'éditeur SQL de Supabase
   - Cliquez sur "Execute"

   **SI VOUS AVEZ L'ERREUR "policy already exists":**
   - Ouvrez le fichier `supabase/migration_safe.sql` (NOUVEAU!)
   - Copiez TOUT le contenu
   - Collez-le dans l'éditeur SQL de Supabase
   - Cliquez sur "Execute"

   **OU appliquez les migrations individuellement dans cet ordre:**
   - `supabase/migration_add_strategies_table.sql`
   - `supabase/migration_add_daily_discipline_tracking.sql`
   - `supabase/migration_add_daily_session_notes.sql`

### Option 2: Via CLI (Si vous avez Supabase CLI installé)

```bash
# Installer Supabase CLI si pas fait
npm install -g supabase

# Se connecter à votre projet
supabase login

# Appliquer les migrations
supabase migration up

# Ou appliquer le schema complet
supabase db push
```

## 📊 Tables créées

Après l'application des migrations, vous aurez ces nouvelles tables:

### 1. `strategies`
Stocke les stratégies de trading créées dans la page Stratégies

**Colonnes:**
- `id` (UUID) - Identifiant unique
- `user_id` (UUID) - Propriétaire
- `name` (VARCHAR) - Nom de la stratégie
- `description` (TEXT) - Description
- `color` (VARCHAR) - Couleur d'affichage
- `groups` (JSONB) - Groupes de règles (format JSON)
- `created_at` (TIMESTAMP) - Date de création
- `updated_at` (TIMESTAMP) - Date de modification

### 2. `daily_discipline_tracking`
Suivi quotidien des règles de discipline

**Colonnes:**
- `id` (UUID) - Identifiant unique
- `user_id` (UUID) - Propriétaire
- `date` (TEXT) - Date au format YYYY-MM-DD
- `rule_id` (VARCHAR) - ID de la règle
- `completed` (BOOLEAN) - Si la règle est complétée
- `created_at` (TIMESTAMP) - Date de création
- `updated_at` (TIMESTAMP) - Date de modification

### 3. `daily_session_notes`
Notes de session après les trades

**Colonnes:**
- `id` (UUID) - Identifiant unique
- `user_id` (UUID) - Propriétaire
- `date` (TEXT) - Date au format YYYY-MM-DD
- `notes` (TEXT) - Contenu des notes
- `created_at` (TIMESTAMP) - Date de création
- `updated_at` (TIMESTAMP) - Date de modification

## 🔐 Sécurité

Toutes les tables ont des politiques RLS (Row Level Security) activées:
- Les utilisateurs ne peuvent voir QUE leurs propres données
- Les données des autres utilisateurs sont inaccessibles
- Les opérations sont limitées: SELECT, INSERT, UPDATE, DELETE

## ✅ Vérification

Après l'application des migrations, vous devriez pouvoir:

1. ✅ Créer et modifier des stratégies dans la page "Stratégies"
2. ✅ Ajouter des notes quotidiennes dans le journal
3. ✅ Suivre les règles de discipline dans la page "Discipline"
4. ✅ Voir les données synchronisées entre la web et l'app
5. ✅ Voir les données persister après rechargement

## 💾 Sauvegarde et Synchronisation

**IMPORTANT:** L'application utilise une stratégie hybride:
1. **Supabase** = Sauvegarde principale (base de données)
2. **localStorage** = Fallback si Supabase est indisponible

**Flux de données:**
- Données créées → Sauvegardées dans Supabase ET localStorage
- Si Supabase échoue → Données sauvegardées dans localStorage
- Au rechargement → Les données se sincronisent automatiquement

## 🐛 Dépannage

### "Could not find the table" error
- ➡️ Les migrations n'ont pas été appliquées
- ➡️ Appliquez les migrations SQL selon les étapes ci-dessus

### "policy already exists" error
- ➡️ Cela signifie que vous avez déjà des tables/politiques
- ➡️ **Solution:** Utilisez `supabase/migration_safe.sql` à la place
  - Ce fichier supprime les anciennes politiques avant les récréer
  - Sûr à exécuter même si les tables existent déjà

### "Permission denied" error
- ➡️ Vous n'avez pas les droits de création de table
- ➡️ Allez à "Authentication" → "Users" dans Supabase
- ➡️ Vérifiez que vous êtes connecté en tant qu'admin
- ➡️ Sinon, demandez à l'admin du projet d'exécuter le SQL

### Les données ne persistent pas
- ➡️ Vérifiez que vous êtes authentifié
- ➡️ Ouvrez la console (F12) et cherchez les erreurs
- ➡️ Vérifiez les permissions RLS dans Supabase

### Les données ne se synchronisent pas entre appareils
- ➡️ Attendez quelques secondes, la sync n'est pas instantanée
- ➡️ Rechargez la page pour forcer une synchronisation
- ➡️ Vérifiez votre connexion internet

## 📚 Fichiers de migration

Les fichiers SQL de migration sont dans le dossier `supabase/`:
- ✅ `schema.sql` - Schema complet (contient tout)
- ✅ `migration_add_strategies_table.sql` - Table strategies
- ✅ `migration_add_daily_discipline_tracking.sql` - Table discipline
- ✅ `migration_add_daily_session_notes.sql` - Table notes quotidiennes

## 🚨 IMPORTANT

**Après avoir créé les tables, redémarrez l'application:**
```bash
# Arrêtez le serveur (Ctrl+C)
# Videz le cache
rm -rf .next

# Redémarrez
npm run dev
```

Cela permettra aux hooks Supabase de détecter les tables et de fonctionner correctement.
