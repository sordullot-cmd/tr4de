# 🔧 RLS Policy Error - Dépannage

## Erreur: "new row violates row-level security policy"

### Causes possibles:

1. **La migration n'a pas été exécutée** ⚠️ (Plus probable)
2. L'utilisateur n'est pas authentifié
3. Les politiques RLS ne sont pas correctes

---

## ✅ Solution Pas à Pas

### Étape 1: Vérifier la migration dans Supabase

1. Va dans [Supabase Dashboard](https://app.supabase.com)
2. Sélectionne ton projet tr4de
3. Clique sur **SQL Editor**
4. Clique sur **New Query**

### Étape 2: Exécute la migration (IMPORTANT ⚠️)

Copie-colle exactement:

```sql
-- TABLE: trading_accounts
CREATE TABLE IF NOT EXISTS trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  broker VARCHAR(50) NOT NULL CHECK (broker IN ('MetaTrader 5', 'Tradovate')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Ajouter la colonne account_id à trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS account_id UUID;

-- Ajouter la FK
ALTER TABLE trades ADD CONSTRAINT fk_trades_account 
  FOREIGN KEY (account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY trading_accounts_select ON trading_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY trading_accounts_insert ON trading_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY trading_accounts_update ON trading_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY trading_accounts_delete ON trading_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user ON trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
```

Clique **Run** ✅

### Étape 3: Si ça ne marche toujours pas

Exécute cette requête de correction:

```sql
-- Drop et recreate policies
DROP POLICY IF EXISTS trading_accounts_select ON trading_accounts;
DROP POLICY IF EXISTS trading_accounts_insert ON trading_accounts;
DROP POLICY IF EXISTS trading_accounts_update ON trading_accounts;
DROP POLICY IF EXISTS trading_accounts_delete ON trading_accounts;

-- Recreate
CREATE POLICY trading_accounts_select ON trading_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY trading_accounts_insert ON trading_accounts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY trading_accounts_update ON trading_accounts
  FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY trading_accounts_delete ON trading_accounts
  FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
```

### Étape 4: Vérifie l'authentification

1. Ouvre la console du navigateur (**F12**)
2. Onglet **Console**
3. Vérifie que tu vois un message d'authentification réussi (pas d'erreurs)

### Étape 5: Teste la création de compte

1. Rafraîchis la page (`F5`)
2. Clique sur **💼 Comptes de Trading**
3. Clique **+ Ajouter un compte**
4. Remplis le formulaire et clique **Créer**

---

## 🐛 Déboguer

### Vérifie dans Supabase que la table existe:

1. Va dans **Database** → **Tables**
2. Cherche `trading_accounts`
3. Si elle n'existe pas → refais l'étape 2

### Vérifie les Policies:

1. Va dans **Database** → **Policies**
2. Sélectionne `trading_accounts`
3. Tu dois voir 4 policies: SELECT, INSERT, UPDATE, DELETE

### Vérifie l'authentification utilisateur:

Console du navigateur:
```javascript
// Teste si tu es authentifié
const { data } = await supabase.auth.getUser();
console.log(data.user);
```

---

## 📞 Si ça ne marche toujours pas

- [ ] Migration exécutée dans Supabase ✅
- [ ] Table `trading_accounts` existe dans Supabase
- [ ] 4 Policies existent sur `trading_accounts`
- [ ] L'utilisateur est authentifié (console: `supabase.auth.getUser()`)
- [ ] RLS est **Enable** sur `trading_accounts`
- [ ] Zone du browser n'est pas en mode privé/incognito

---

## 💡 Solution sûre - Sans RLS strict

Si rien ne fonctionne, tu peux disabler le RLS sur `trading_accounts` temporairement:

```sql
ALTER TABLE trading_accounts DISABLE ROW LEVEL SECURITY;
```

⚠️ **À NE FAIRE QUE EN DEV** - Remets RLS après pour la sécurité.
