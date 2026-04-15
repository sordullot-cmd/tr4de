# 🚀 Guide Pas à Pas - Exécuter les Migrations Supabase

## ⚠️ Avant de Continuer

Les checkboxes Discipline **NE FONCTIONNERONT PAS** sans exécuter cette migration!

L'appli fonctionne avec `localStorage` (fallback), mais pour sauvegarder dans la **base de données Supabase**, il faut créer les tables.

## 🎯 Résumé du Process

1. ✅ Ouvrir Supabase Project
2. ✅ Ouvrir SQL Editor
3. ✅ Copier le script de migration
4. ✅ Exécuter
5. ✅ Vérifier que les tables sont créées
6. ✅ Tester l'app

**Durée totale: 5 minutes**

---

## 📋 Step-by-Step Guide

### Step 1: Ouvrir Supabase Project

1. Allez à [app.supabase.com](https://app.supabase.com/)
2. Logez-vous avec votre compte
3. Sélectionnez votre projet `tr4de` (ou le nom que vous avez donné)

**Screenshot conceptuel:**
```
Supabase Dashboard > Projects > SELECT tr4de project
```

---

### Step 2: Ouvrir SQL Editor

Dans le projet Supabase:

1. Cliquez sur le menu de gauche **SQL Editor**
2. Cliquez sur **+ New Query** (bouton bleu)

**Location dans Supabase:**
```
[Left sidebar]
├─ Home
├─ Browser (Table Editor)
├─ SQL Editor  ← CLICK HERE
│  └─ New Query  ← CLICK HERE
└─ ...
```

---

### Step 3A: Copier le Script (Méthode 1 - Manuel)

**Dans votre éditeur VS Code:**

1. Ouvrez le fichier `supabase/migration_safe.sql`
2. **Sélectionnez TOUT** le contenu (Ctrl+A)
3. **Copiez** (Ctrl+C)

**Résultat:** Le script est copié dans le presse-papiers

---

### Step 3B: Le Script Exact à Copier

Si la méthode manuelle ne marche pas, voici le script exact (C+C):

```sql
-- Script de migration sécurisé
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#5F7FB4',
  groups JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_discipline_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  rule_id VARCHAR(100) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date, rule_id)
);

CREATE TABLE IF NOT EXISTS daily_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

ALTER TABLE IF EXISTS strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_discipline_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_session_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS strategies_select ON strategies;
DROP POLICY IF EXISTS strategies_insert ON strategies;
DROP POLICY IF EXISTS strategies_update ON strategies;
DROP POLICY IF EXISTS strategies_delete ON strategies;

CREATE POLICY strategies_select ON strategies
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY strategies_insert ON strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY strategies_update ON strategies
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY strategies_delete ON strategies
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_discipline_tracking_select ON daily_discipline_tracking;
DROP POLICY IF EXISTS daily_discipline_tracking_insert ON daily_discipline_tracking;
DROP POLICY IF EXISTS daily_discipline_tracking_update ON daily_discipline_tracking;
DROP POLICY IF EXISTS daily_discipline_tracking_delete ON daily_discipline_tracking;

CREATE POLICY daily_discipline_tracking_select ON daily_discipline_tracking
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY daily_discipline_tracking_insert ON daily_discipline_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY daily_discipline_tracking_update ON daily_discipline_tracking
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY daily_discipline_tracking_delete ON daily_discipline_tracking
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS daily_session_notes_select ON daily_session_notes;
DROP POLICY IF EXISTS daily_session_notes_insert ON daily_session_notes;
DROP POLICY IF EXISTS daily_session_notes_update ON daily_session_notes;
DROP POLICY IF EXISTS daily_session_notes_delete ON daily_session_notes;

CREATE POLICY daily_session_notes_select ON daily_session_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY daily_session_notes_insert ON daily_session_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY daily_session_notes_update ON daily_session_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY daily_session_notes_delete ON daily_session_notes
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_discipline_user_id ON daily_discipline_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_discipline_date ON daily_discipline_tracking(date);
CREATE INDEX IF NOT EXISTS idx_daily_discipline_user_date ON daily_discipline_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_session_notes_user_id ON daily_session_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_session_notes_date ON daily_session_notes(date);
CREATE INDEX IF NOT EXISTS idx_daily_session_notes_user_date ON daily_session_notes(user_id, date);

SELECT 'Migration complétée avec succès!' as status;
```

---

### Step 4: Coller dans Supabase SQL Editor

1. Dans l'onglet **SQL Editor** que vous venez de créer
2. **Cliquez** dans la zone de texte blanche
3. **Collez** le script (Ctrl+V)

**Résultat:** Tout le script SQL est maintenant dans l'éditeur

---

### Step 5: Exécuter le Script

1. Cherchez le bouton **▶ RUN** (noir, en haut à droite)
2. **Cliquez** sur RUN

**Attendez 5-10 secondes** - Supabase exécute le script

---

### Step 6: Vérifier le Succès

#### ✅ Si ça marche:

Vous devriez voir en bas:
```
✅ Execution result:
1 row

Migration complétée avec succès!
```

**ET aucune ligne rouge d'erreur!**

#### ❌ Si erreur:

Cherchez un message d'erreur en rouge comme:
```
ERROR: policy 'xxx_select' for table 'xxx' already exists
```

→ C'est normal, c'est juste parce que c'est une réexécution
→ **Les tables sont déjà créées et ça fonctionne quand même!**

---

### Step 7: Vérifier les Tables Créées

1. Dans le menu de gauche, cliquez **Browser** (ou **Table Editor**)
2. Regardez la liste des tables à gauche
3. Vous devriez voir 3 nouvelles tables:
   - ✅ `daily_discipline_tracking`
   - ✅ `daily_session_notes`
   - ✅ `strategies`

**Cliquez sur `daily_discipline_tracking`** pour voir la structure:
- Colonne `id` (UUID)
- Colonne `user_id` (UUID)
- Colonne `date` (TEXT)
- Colonne `rule_id` (VARCHAR)
- Colonne `completed` (BOOLEAN)
- etc.

---

## 🧪 Test Après Migration

### Test 1: Checkboxes Discipline Fonctionnent?

1. Allez à l'app `Discipline`
2. Cochez une règle, ex: ✓ Pre Market Routine
3. Ouvrez console (F12) et cherchez:
```
✅ Sauvegardé dans Supabase
```

4. Dans Supabase **Table Editor > daily_discipline_tracking**
5. Vous devriez voir une ligne avec:
   - `user_id`: [Votre ID]
   - `date`: 2024-01-15 (aujourd'hui)
   - `rule_id`: premarket
   - `completed`: true ✅

Si vous voyez ça → **Ça marche!** 🎉

---

### Test 2: Rechargement Persiste

1. Rechargez l'app (F5)
2. Allez à **Discipline**
3. **La checkbox doit rester cochée!** ✅

---

## 🔍 Dépannage

### Problem: "ERROR: syntax error"

**Cause:** Vous avez peut-être oublié de copier tout le script

**Solution:** 
1. Ouvrez `supabase/migration_safe.sql`
2. Ctrl+A (sélectionner tout)
3. Ctrl+C (copier)
4. Retour à Supabase SQL Editor
5. Ctrl+A (effacer ancien code)
6. Ctrl+V (coller complet)
7. Run

---

### Problem: "ERROR: policy already exists"

**Cause:** Normal, c'est une réexécution

**Solution:** C'est OK! Les tables sont déjà créées. Ça fonctionne quand même.

---

### Problem: "PGRST301: request has no claims"

**Cause:** Vous n'êtes pas authentifié

**Solution:**
1. Dans l'app tr4de, logez-vous d'abord
2. Puis retournez à **Discipline**
3. Cochez une règle
4. Ça devrait marcher

---

## ✨ Après la Migration

Une fois que vous avez exécuté le script:

✅ Les checkboxes **Discipline** se sauvegardent dans Supabase
✅ Les notes **Journal** se sauvegardent dans Supabase
✅ Les **Strategies** se sauvegardent dans Supabase
✅ **Multi-appareils**: Modifications visibles partout (après reload)
✅ **Backup**: Données en base de données, pas juste en localStorage

---

## 📞 Questions?

Si ça n'a pas marché:

1. Cochez encore une checkbox
2. Ouvrez console (F12)
3. Cherchez les logs:
   - `📍 Mise à jour rule...`
   - `✅ Sauvegardé dans localStorage`
   - `✅ Sauvegardé dans Supabase` ← Si c'est là, c'est bon!
   - Ou `⚠️ Table...n'existe pas encore` ← Migration pas exécutée

4. Si migration pas exécutée: Refaites Step 1-5 ci-dessus

---

## 🎉 Résumé

| Étape | Action | Résultat |
|-------|--------|---------|
| 1-5 | Copier + Exécuter script | Tables créées |
| 6 | Vérifier dans Table Editor | Voir les 3 tables |
| 7 | Tester Discipline | Cochez → Supabase |
| 8 | Console F12 | Voir logs ✅ |

**Tout ça = 5 minutes max!** ✨
