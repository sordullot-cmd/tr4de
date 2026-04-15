# ✅ Guide de Vérification - Journal, Stratégies, Discipline

Ce guide vous aide à vérifier que le Journal, les Stratégies et la Discipline Tracking sont correctement sauvegardés dans Supabase.

## 🔍 Vérification en direct

### 1. Vérifier les Stratégies

**Créer une stratégie:**
1. Allez à la page "Stratégies"
2. Cliquez sur "Créer une nouvelle stratégie"
3. Remplissez:
   - Nom: "Test Strategy"
   - Description: "Première stratégie de test"
   - Ajoutez un groupe et une règle
4. Cliquez "Sauvegarder"

**Vérifier dans Supabase:**
1. Allez à https://app.supabase.com
2. Sélectionnez votre projet
3. Allez à "Table Editor"
4. Cherchez la table `strategies`
5. Vous devriez voir votre stratégie avec:
   - ✅ `name` = "Test Strategy"
   - ✅ `user_id` = votre ID utilisateur
   - ✅ `groups` contient le JSON de vos groupes

### 2. Vérifier le Journal et Notes Quotidiennes

**Ajouter une note quotidienne:**
1. Allez à la page "Journal"
2. Cliquez sur "Notes quotidiennes"
3. Écrivez une note: "Test note - [DATE du jour]"
4. Cliquez en dehors ou attendez l'auto-save

**Vérifier dans Supabase:**
1. Allez à Table Editor
2. Cherchez la table `daily_session_notes`
3. Vous devriez voir:
   - ✅ `date` = 2024-01-15 (ou la date du jour)
   - ✅ `notes` = "Test note - [DATE]"
   - ✅ `user_id` = votre ID utilisateur

### 3. Vérifier la Discipline Tracking

**Cocher une règle de discipline:**
1. Allez à la page "Discipline"
2. Cliquez sur une règle (ex: "Pre Market Routine") pour la cocher
3. La règle devrait être marquée comme complétée

**Vérifier dans Supabase:**
1. Allez à Table Editor
2. Cherchez la table `daily_discipline_tracking`
3. Vous devriez voir une entrée:
   - ✅ `date` = date du jour
   - ✅ `rule_id` = "premarket" (ou autre règle cochée)
   - ✅ `completed` = true
   - ✅ `user_id` = votre ID utilisateur

## 📱 Vérification via Console du Navigateur

Ouvrez la console (F12 ou Ctrl+Shift+I) et cherchez ces logs:

### Pour Stratégies:
```
✅ Stratégie créée
💾 Sync strategies to localStorage: 1
✅ Stratégie sauvegardée
```

### Pour Notes Quotidiennes:
```
💾 Sauvegarde note journalière pour: 2024-01-15
✅ Note journalière sauvegardée
```

### Pour Discipline:
```
📍 Mise à jour rule premarket pour 2024-01-15: true
✅ Mise à jour sauvegardée
```

## 🐛 Dépannage

### Problème: "Could not find the table"
**Solution:**
1. Appliquez les migrations SQL depuis `SUPABASE_MIGRATIONS_GUIDE.md`
2. Redémarrez l'application
3. Videz le cache du navigateur (Ctrl+Shift+Delete)

### Problème: Les données ne se sauvegardent pas
**Vérifier:**

1. **Êtes-vous authentifié?**
   ```javascript
   // Console navigateur
   localStorage.getItem('sb-aauth-token')
   ```
   Devrait retourner un token

2. **Y a-t-il des erreurs réseau?**
   - Ouvrez Network tab en F12
   - Cherchez les requêtes qui commencent par "https://xxxx.supabase.co/rest"
   - Vérifiez qu'elles retournent 200/201 (succès)

3. **Vérifiez localStorage:**
   ```javascript
   // Console navigateur
   localStorage.getItem("tr4de_strategies")
   localStorage.getItem("tr4de_discipline_data")
   localStorage.getItem("tr4de_session_notes")
   ```

### Problème: Données non visibles dans Supabase
**Vérifier les politiques RLS:**
1. Allez à Supabase SQL Editor
2. Exécutez:
```sql
-- Vérifier les politiques
SELECT * FROM pg_policies WHERE tablename = 'strategies';
SELECT * FROM pg_policies WHERE tablename = 'daily_discipline_tracking';
SELECT * FROM pg_policies WHERE tablename = 'daily_session_notes';
```

Devrait retourner au minimum 4 politiques par table (SELECT, INSERT, UPDATE, DELETE).

## 🔄 Flux de Synchronisation

```
┌─────────────────┐
│  Utilisateur    │
│ Crée/Modifie    │
│ Données         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  État React (useState)      │
│  ✅ Mise à jour immédiate   │
└────────┬────────────────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  Supabase DB     │  │  localStorage    │
│  (Primaire)      │  │  (Fallback)      │
│  ✅ Asynchrone   │  │  ✅ Synchrone    │
└──────────────────┘  └──────────────────┘
```

## 📊 Requêtes SQL pour Inspection

Vous pouvez copier ces requêtes dans Supabase SQL Editor:

### Voir toutes les stratégies
```sql
SELECT id, user_id, name, color, created_at
FROM strategies
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

### Voir le score de discipline du jour
```sql
SELECT 
  rule_id,
  completed,
  COUNT(*) as count
FROM daily_discipline_tracking
WHERE user_id = auth.uid()
  AND date = CURRENT_DATE::text
GROUP BY rule_id, completed;
```

### Voir les notes du jour
```sql
SELECT date, notes
FROM daily_session_notes
WHERE user_id = auth.uid()
  AND date = CURRENT_DATE::text;
```

## ✨ Signes d'une Synchronisation Réussie

✅ Créer une stratégie → Apparaît dans StrategyPage
✅ Créer une stratégie → Apparaît dans DashboardNew
✅ Recartcharger la page → Les stratégies persistent
✅ Créer une note → Sauvegardée immédiatement
✅ Cocher une règle → Sauvegardée dans Supabase
✅ Voir les données dans Supabase Table Editor

Si tous ces points sont ✅, tout fonctionne correctement!

## 🚨 Avant de déployer

- ✅ Vérifiez que schema.sql a créé toutes les tables
- ✅ Vérifiez que les utilisateurs peuvent créer des stratégies
- ✅ Vérifiez que les notes persistent après reload
- ✅ Vérifiez les logs de la console (F12) pour erreurs
- ✅ Testez avec plusieurs utilisateurs
