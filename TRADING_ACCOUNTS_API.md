# 📚 API Reference - Système de Comptes de Trading

## Hook : `useTradingAccounts`

### Import
```javascript
import { useTradingAccounts } from "@/lib/hooks/useTradingAccounts";
```

### Utilisation
```javascript
const {
  accounts,           // Array<TradingAccount> - Liste des comptes
  selectedAccountId,  // string - ID du compte sélectionné
  setSelectedAccountId, // function - Changer le compte sélectionné
  loading,            // boolean - En cours de chargement
  error,              // string | null - Message d'erreur
  createAccount,      // async function
  deleteAccount,      // async function
  updateAccount,      // async function
  fetchAccounts,      // async function - Rafraîchir la liste
} = useTradingAccounts(userId);
```

### Exemple Complet
```javascript
import { useTradingAccounts } from "@/lib/hooks/useTradingAccounts";

function MyComponent({ userId }) {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    createAccount,
  } = useTradingAccounts(userId);

  const handleCreateAccount = async () => {
    const newAccount = await createAccount("My Account", "MetaTrader 5");
    if (newAccount) {
      setSelectedAccountId(newAccount.id);
    }
  };

  return (
    <div>
      <h2>Comptes: {accounts.length}</h2>
      <button onClick={handleCreateAccount}>Créer un compte</button>
    </div>
  );
}
```

---

## Composant : `TradingAccountsManager`

### Import
```javascript
import TradingAccountsManager from "@/components/TradingAccountsManager";
```

### Props
```javascript
<TradingAccountsManager
  userId={userId}                // string (UUID) - ID de l'utilisateur
  onAccountSelect={(id) => {}}  // function - Callback quand on sélectionne un compte
/>
```

### Exemple
```javascript
import TradingAccountsManager from "@/components/TradingAccountsManager";

function AccountsPage({ userId }) {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <TradingAccountsManager 
      userId={userId}
      onAccountSelect={setSelectedId}
    />
  );
}
```

---

## Composant : `AccountSelector`

### Import
```javascript
import AccountSelector from "@/components/AccountSelector";
```

### Props
```javascript
<AccountSelector
  userId={userId}                          // string (UUID)
  selectedAccountId={selectedAccountId}    // string (UUID) | null
  onAccountSelect={(id) => {}}            // function
/>
```

### Exemple (dans TradeForm)
```javascript
import AccountSelector from "@/components/AccountSelector";

function TradeForm({ userId }) {
  const [accountId, setAccountId] = useState(null);

  return (
    <form>
      <AccountSelector 
        userId={userId}
        selectedAccountId={accountId}
        onAccountSelect={setAccountId}
      />
      {/* autres champs du form */}
    </form>
  );
}
```

---

## Requêtes Supabase Directes

### Créer un compte
```javascript
const { data, error } = await supabase
  .from("trading_accounts")
  .insert([
    {
      user_id: userId,
      name: "My Funded 50k",
      broker: "MetaTrader 5"
    }
  ])
  .select()
  .single();
```

### Récupérer les comptes d'un utilisateur
```javascript
const { data: accounts, error } = await supabase
  .from("trading_accounts")
  .select("*")
  .eq("user_id", userId)
  .order("created_at", { ascending: false });
```

### Supprimer un compte
```javascript
const { error } = await supabase
  .from("trading_accounts")
  .delete()
  .eq("id", accountId);
```

### Récupérer les trades d'un compte
```javascript
const { data: trades, error } = await supabase
  .from("trades")
  .select("*")
  .eq("account_id", accountId)
  .eq("user_id", userId) // Optionnel mais recommandé
  .order("entry_time", { ascending: false });
```

### Créer un trade avec un compte
```javascript
const { data, error } = await supabase
  .from("trades")
  .insert([
    {
      user_id: userId,
      account_id: accountId,  // ← IMPORTANT
      symbol: "ES",
      direction: "LONG",
      entry_price: 4500,
      exit_price: 4510,
      quantity: 1,
      entry_time: new Date(),
      exit_time: new Date(),
      pnl: 50,
      setup_name: "Breakout Strategy",
      broker: "MetaTrader 5"
      // ... autres champs
    }
  ])
  .select();
```

---

## Types de Données

### TradingAccount
```typescript
interface TradingAccount {
  id: UUID;
  user_id: UUID;
  name: string;           // "My Funded 50k"
  broker: string;         // "MetaTrader 5" | "Tradovate"
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### Trade (modifié)
```typescript
interface Trade {
  id: UUID;
  user_id: UUID;
  account_id: UUID | null;  // ← NOUVEAU (peut être null au départ)
  // ... autres champs existants
}
```

---

## Patterns Courants

### Pattern 1 : Afficher les stats par compte
```javascript
async function getAccountStats(userId, accountId) {
  const { data: trades } = await supabase
    .from("trades")
    .select("pnl", { count: "exact" })
    .eq("user_id", userId)
    .eq("account_id", accountId);

  const totalPnL = trades?.reduce((sum, t) => sum + t.pnl, 0) || 0;
  const tradeCount = trades?.length || 0;
  const winRate = // calculer...

  return { totalPnL, tradeCount, winRate };
}
```

### Pattern 2 : Filtrer les trades par compte dans un composant
```javascript
function TradesPage({ userId, selectedAccountId }) {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    let query = supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId);

    // Argument optionnel pour filtrer
    if (selectedAccountId) {
      query = query.eq("account_id", selectedAccountId);
    }

    query
      .order("entry_time", { ascending: false })
      .then(({ data }) => setTrades(data));
  }, [userId, selectedAccountId]);

  return <div>{/* afficher les trades */}</div>;
}
```

### Pattern 3 : Empêcher l'ajout d'un trade sans compte
```javascript
function TradeForm({ userId, accounts }) {
  const [accountId, setAccountId] = useState(null);

  const handleSubmit = async (tradeData) => {
    // Validation 1
    if (!accountId) {
      alert("Veuillez d'abord créer un compte de trading");
      return;
    }

    // Validation 2
    if (accounts.length === 0) {
      alert("Aucun compte disponible");
      return;
    }

    // Procéder à la création
    const newTrade = {
      ...tradeData,
      user_id: userId,
      account_id: accountId,
    };

    await supabase.from("trades").insert([newTrade]);
  };

  return (
    // form JSX
  );
}
```

---

## Erreurs Courantes & Solutions

### Erreur : "Cannot find column 'account_id'"
**Solution** : La migration Supabase n'a pas été exécutée. Vérifier Supabase Dashboard.

### Erreur : "No accounts available"
**Solution** : L'utilisateur doit d'abord créer un compte. Afficher AccsountSelector qui montre le message.

### Trades sans comptes (account_id = NULL)
**Solution** : C'est normal. Les trades existants avant la migration auront account_id = NULL.
Utiliser `.select("*")` sans filtreur account_id pour les voir.

### Compte pas sélectionné
**Solution** : Vérifier que `onAccountSelect` est appelé correctement après la création.

---

## Migration de Données (Optionnel)

Si tu veux assigner les trades existants à des comptes automatiquement :

```sql
-- Créer un compte par défaut pour chaque utilisateur
WITH user_accounts AS (
  INSERT INTO trading_accounts (user_id, name, broker)
  SELECT DISTINCT user_id, 'Default Account', 'MetaTrader 5'
  FROM trades
  WHERE account_id IS NULL
  RETURNING id, user_id
)
UPDATE trades t
SET account_id = ua.id
FROM user_accounts ua
WHERE t.user_id = ua.user_id AND t.account_id IS NULL;
```

---

## Performance

- **Index créé** : `idx_trading_accounts_user` pour les lookups rapides
- **Index créé** : `idx_trades_account` pour les requêtes filtrées par compte
- **RLS aktivé** : Les jointures sont optimisées par Supabase

---

## Support & Questions

Pour plus de détails sur :
1. **Architecture** → Voir `TRADING_ACCOUNTS_SYSTEM.md`
2. **Intégration** → Voir `INTEGRATION_GUIDE.md`
3. **Statut** → Voir `TRADING_ACCOUNTS_READY.md`
