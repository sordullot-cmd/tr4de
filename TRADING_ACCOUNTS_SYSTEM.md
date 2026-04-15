# Système de Gestion des Comptes de Trading

## 📋 Vue d'ensemble

Ce système introduce une hiérarchie basée sur les **Comptes de Trading** qui permet à chaque utilisateur de gérer plusieurs comptes (MT5 et Tradovate) et leurs trades respectifs.

## 🗄️ Schéma de Données

### Table : `trading_accounts`
```
- id (UUID) - Clé primaire
- user_id (UUID) - Clé étrangère vers auth.users
- name (VARCHAR) - Nom personnalisé du compte
- broker (VARCHAR) - MetaTrader 5 | Tradovate
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Table : `trades` (modifiée)
```
- id (UUID)
- user_id (UUID)
- account_id (UUID) ← NOUVEAU - Clé étrangère vers trading_accounts
- [autres champs existants...]
```

## 📁 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `supabase/migrations/001_create_trading_accounts.sql` | Migration Supabase pour créer la table et les relations |
| `components/TradingAccountsManager.jsx` | Gestionnaire principal des comptes |
| `components/AccountSelector.jsx` | Sélecteur de compte pour les formulaires |
| `components/pages/TradingAccountsPage.jsx` | Page dédiée à la gestion des comptes |
| `lib/hooks/useTradingAccounts.js` | Hook React pour gérer les comptes |

## 🔄 Intégration dans DashboardNew.jsx

### 1. Importer les composants
```javascript
import TradingAccountsPage from "@/components/pages/TradingAccountsPage";
import { useTradingAccounts } from "@/lib/hooks/useTradingAccounts";
```

### 2. Ajouter à la structure NAV
```javascript
const NAV = [
  // ... comptes existants ...
  { icon: "💼", label: "Comptes de Trading", id: "accounts" },
];
```

### 3. Utiliser le hook
```javascript
const { accounts, selectedAccountId, setSelectedAccountId } = useTradingAccounts(userId);
```

### 4. Ajouter au rendu conditionnel
```javascript
{page === "accounts" && <TradingAccountsPage userId={userId} />}
```

### 5. Modifier TradeForm.tsx
Ajouter le sélecteur de compte :
```javascript
<AccountSelector 
  userId={userId}
  selectedAccountId={selectedAccountId}
  onAccountSelect={setSelectedAccountId}
/>
```

Et ajouter `account_id` au payload du trade :
```javascript
const tradeData = {
  // ... champs existants ...
  account_id: selectedAccountId,
  // ...
};
```

### 6. Filtrer les trades par compte
Dans TradesPage ou le dashboard :
```javascript
const query = supabase
  .from("trades")
  .select("*")
  .eq("user_id", userId);

// Filtrer par compte si sélectionné
if (selectedAccountId) {
  query = query.eq("account_id", selectedAccountId);
}
```

## ✅ Validation

1. **Empêcher l'ajout de trades sans compte**
   - Vérifier que `selectedAccountId` est défini avant de soumettre
   - Afficher un message d'avertissement si aucun compte existe

2. **Cohérence du broker**
   - Le champ `broker` du trade peut être automatiquement rempli à partir du compte

## 🎨 Design

- **Cards des comptes** : Fond sombre (#252525) avec bordure accentuée pour la sélection
- **Logo du broker** : Emoji (🔷 MT5, 📊 Tradovate)
- **Performance** : Afficher nombre de trades et statistiques du compte
- **Interactions** : Hover effect, sélection visuelle

## 🔐 Sécurité (RLS)

- Les utilisateurs ne voient que leurs propres comptes
- Les comptes sont liés par `user_id`
- Cascade delete : supprimer un compte supprime tous ses trades

## 📦 Compatibilité

- ✅ Comptes de trading isolés
- ✅ Trades existants non affectés (account_id nullable au départ)
- ✅ Autres fonctionnalités du dashboard intactes
- ✅ Migration non-destructive

## 🚀 Prochaines Étapes

1. Exécuter la migration Supabase
2. Importer les composants dans DashboardNew.jsx
3. Mettre à jour TradeForm pour utiliser AccountSelector
4. Tester la création de comptes et les trades
5. Ajouter les statistiques par compte dans le dashboard
