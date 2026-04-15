# 🚀 GUIDE D'INTÉGRATION - Système de Comptes de Trading

## Étape 1 : Migration Supabase ✅

**Fichier créé** : `supabase/migrations/001_create_trading_accounts.sql`

Exécute cette migration dans Supabase :
1. Va dans Supabase Dashboard
2. SQL Editor → Créer nouvelle requête
3. Copie le contenu du fichier migration
4. Exécute

**Résultat** : Table `trading_accounts` créée avec relation vers `trades`

---

## Étape 2 : Intégrer dans DashboardNew.jsx

Ouvre `components/DashboardNew.jsx` et applique ces modifications :

### 2.1 - Ajouter les imports (vers le haut du fichier)
```javascript
import TradingAccountsPage from "@/components/pages/TradingAccountsPage";
import { useTradingAccounts } from "@/lib/hooks/useTradingAccounts";
import AccountSelector from "@/components/AccountSelector";
```

### 2.2 - Ajouter le hook au composant (dans le useState)
```javascript
const { accounts, selectedAccountId, setSelectedAccountId } = useTradingAccounts(userId);
```

### 2.3 - Ajouter à la navigation NAV (chercher const NAV =)
Ajouter cette ligne dans le tableau NAV :
```javascript
{ icon: "💼", label: "Comptes de Trading", id: "accounts" },
```

**Exemple (position suggérée après "Ajouter des Trades") :**
```javascript
const NAV = [
  { icon: "⊕", label: "Ajouter des Trades", id: "add" },
  { icon: "💼", label: "Comptes de Trading", id: "accounts" },  // ← AJOUTER ICI
  { icon: "🏠", label: "Tableau de bord", id: "dashboard" },
  // ...
];
```

### 2.4 - Ajouter au rendu conditionnel (chercher où les pages s'affichent)
Ajouter cette condition :
```javascript
{page === "accounts" && <TradingAccountsPage userId={userId} />}
```

**Exemple (à placer avec les autres pages conditionnelles) :**
```javascript
{page === "add" && <AddTradePage ... />}
{page === "accounts" && <TradingAccountsPage userId={userId} />}  // ← AJOUTER ICI
{page === "dashboard" && <Dashboard ... />}
// ...
```

---

## Étape 3 : Modifier TradeForm.tsx

Ouvre `components/TradeForm.tsx` et fais ces changements :

### 3.1 - Ajouter les imports
```javascript
import AccountSelector from "@/components/AccountSelector";
```

### 3.2 - Ajouter l'état pour le compte sélectionné
```javascript
const [selectedAccountId, setSelectedAccountId] = useState(null);
```

### 3.3 - Ajouter le sélecteur avant les autres champs
```javascript
<AccountSelector 
  userId={userId}
  selectedAccountId={selectedAccountId}
  onAccountSelect={setSelectedAccountId}
/>
```

### 3.4 - Modifier la validation et l'ajout du trade
Trouver la fonction qui ajoute le trade et ajouter `account_id` :

**Avant :**
```javascript
const tradeData = {
  user_id: userId,
  entry_time: new Date(formData.entry_time),
  // ... autres champs
};
```

**Après :**
```javascript
// Validation
if (!selectedAccountId) {
  alert("Veuillez sélectionner un compte de trading");
  return;
}

const tradeData = {
  user_id: userId,
  account_id: selectedAccountId,  // ← AJOUTER CETTE LIGNE
  entry_time: new Date(formData.entry_time),
  // ... autres champs
};
```

---

## Étape 4 : Filtrer les trades par compte (Optionnel mais Recommandé)

Dans `components/TradesPage` ou le dashboard, lors de la récupération des trades :

**Avant :**
```javascript
const { data: trades } = await supabase
  .from("trades")
  .select("*")
  .eq("user_id", userId)
  .order("entry_time", { ascending: false });
```

**Après (avec filtre) :**
```javascript
let query = supabase
  .from("trades")
  .select("*")
  .eq("user_id", userId);

// Ajouter le filtre si un compte est sélectionné
if (selectedAccountId) {
  query = query.eq("account_id", selectedAccountId);
}

const { data: trades } = await query.order("entry_time", { ascending: false });
```

---

## 📋 Checklist de Vérification

- [ ] Migration exécutée dans Supabase
- [ ] Imports ajoutés dans DashboardNew.jsx
- [ ] Hook `useTradingAccounts` utilisé
- [ ] Ligne ajoutée dans NAV
- [ ] Rendu conditionnel ajouté pour TradingAccountsPage
- [ ] AccountSelector intégré dans TradeForm.tsx
- [ ] Validation `account_id` ajoutée avant soumission du trade
- [ ] Test : créer un compte
- [ ] Test : impossible d'ajouter un trade sans compte
- [ ] Test : trade relie au bon compte

---

## ✅ Résultat Final

Après intégration :
1. **Nouvelle section** "Comptes de Trading" dans la sidebar
2. **Cards visuelles** pour chaque compte (MT5 ou Tradovate)
3. **Sélecteur de compte** dans le formulaire d'ajout de trade
4. **Validation** : impossible d'ajouter un trade sans compte
5. **Persistance** : les trades sont liés au compte sélectionné
6. **Design** : interface sombre et épurée

---

## 🐛 Troubleshooting

**Erreur : "Cannot find module..."**
→ Vérifier les chemins d'import (chemins doivent être relatifs ou avec @/)

**Erreur : "account_id is not a valid column"**
→ La migration Supabase n'a pas été exécutée. Refaire étape 1.

**Comptes non affichés**
→ Vérifier que l'utilisateur est authentifié et que `userId` est passé

**Trades sans compte**
→ Les trades existants auront `account_id = null`. C'est normal et sans danger.

---

**Questions ?** Consulte `TRADING_ACCOUNTS_SYSTEM.md` pour plus de détails.
