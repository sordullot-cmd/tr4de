# 🔍 Guide: Vérifier si les trades sont importés dans Supabase

## ✅ Corrections Appliquées

Le problème était un **mismatch de tables**:
- ❌ **Avant**: `handleImport` insérait dans `apex_trades`, mais `useTrades()` cherchait dans `trades`
- ✅ **Après**: `useTrades()` cherche maintenant dans `apex_trades` (la bonne table)

---

## 🛠️ Comment Vérifier les Trades

### Option 1: Via Console du Navigateur (Recommandé)

1. Ouvrir le site
2. Appuyer sur **F12** (DevTools)
3. Aller à l'onglet **Console**
4. Importer des trades
5. Regarder les logs:

```
📥 useTrades: Fetching trades for user: [YOUR_USER_ID]
✅ Trades chargés: 5 trades [Array de trades]
```

**Si vous voyez `0 trades`** → Les trades ne sont pas arrivés à la base de données.

---

### Option 2: Via Supabase Dashboard

1. Aller sur [https://supabase.com](https://supabase.com)
2. Ouvrir votre projet
3. Cliquer sur **SQL Editor** ou **Table Editor**
4. Chercher la table **`apex_trades`**
5. Vérifier:
   - ✅ Lignes présentes avec vos trades
   - ✅ Colonne `user_id` = votre ID utilisateur
   - ✅ Colonne `account_id` = votre ID compte

**Requête SQL pour vérifier:**

```sql
SELECT * FROM apex_trades 
WHERE user_id = '[YOUR_USER_ID]' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

### Option 3: Via le Code (Avancé)

Ouvrir la console et exécuter:

```javascript
// Vérifier les trades dans le hook
const testUser = 'YOUR_USER_ID_HERE';

fetch('https://YOUR_SUPABASE_URL/rest/v1/apex_trades?user_id=eq.' + testUser + '&order=created_at.desc&limit=10', {
  headers: {
    'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
    'apikey': 'YOUR_SUPABASE_ANON_KEY',
  }
})
.then(r => r.json())
.then(data => console.log('✅ Trades:', data))
.catch(e => console.error('❌ Erreur:', e));
```

---

## 🐛 Tracer les Erreurs

### Dans DashboardNew.jsx (handleImport)

Les logs affichent les étapes:
```
- ✅ userId et account_id obtenus
- ✅ Trades filtrés (|pnl| >= $50)
- ✅ Trades insérés dans apex_trades
- 📥 Rechargement des trades depuis Supabase
- Fetch result: { hasError: false, tradesCount: 5 }
```

### Si vous voyez une erreur:

```
❌ Error inserting trades: [MESSAGE D'ERREUR]
```

Cela peut être:
- **RLS policy error** → Impossible de modifier les données
- **Column mismatch** → Une colonne n'existe pas
- **Foreign key error** → account_id n'existe pas

---

## ✨ Après la Correction

Les trades doivent maintenant:
1. ✅ S'importer dans `apex_trades`
2. ✅ S'afficher immédiatement sur le site
3. ✅ Être liés à votre compte utilisateur authentifié
4. ✅ Persister quand vous fermez/ouvrez le site
5. ✅ Être visibles sur tous vos appareils (même compte)

---

## 🧪 Test Complet

1. **Se connecter** avec Google OAuth ou Email/Password
2. **Importer un CSV** avec des trades
3. **Vérifier la console**: Logs de succès
4. **Vérifier le site**: Trades affichés dans le tableau
5. **Vérifier Supabase**: Trades dans `apex_trades`
6. **Rafraîchir la page**: Trades toujours là
7. **Changer d'appareil**: Trades synchronisés

---

## 📋 Schema de apex_trades

```
id       | UUID (clé primaire)
user_id  | UUID (référence à auth.users)
account_id | UUID (référence à trading_accounts)
date     | TEXT
symbol   | TEXT
direction | TEXT
entry    | FLOAT
exit     | FLOAT
pnl      | FLOAT
created_at | TIMESTAMP
updated_at | TIMESTAMP
```

**Note**: Cette table est liée à:
- `trading_accounts` via `account_id`
- `auth.users` via `user_id`

---

## 🔑 Clés pour Déboguer

| Problème | Cause | Solution |
|----------|-------|----------|
| 0 trades affichés | Fetch retourne rien | Vérifier user_id, RLS policy |
| Erreur lors import | Supabase reject | Vérifier schema, colonnes, user_id |
| Trades disparaissent | Cache stale | Rafraîchir page (Ctrl+F5) |
| RLS policy error | Pas d'authentification | Vérifier useAuth() hook |

---

**Questions?** Voir les logs console 🖥️ → F12 → Console
