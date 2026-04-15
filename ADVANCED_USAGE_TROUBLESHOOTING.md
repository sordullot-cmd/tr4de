# 🚀 Guide Avancé & Troubleshooting

## 🔧 Cas d'Usage Avancés

### 1. **Filtrer les stratégies par symbole**

```javascript
import { useStrategies } from "@/lib/hooks/useUserData";

function StrategiesBySymbol({ symbol }) {
  const { strategies } = useStrategies();
  
  const filtered = strategies.filter(s => 
    s.symbols && s.symbols.includes(symbol)
  );
  
  return <div>{filtered.length} stratégies pour {symbol}</div>;
}
```

### 2. **Synchronisation en temps réel entre deux composants**

```javascript
// Composant A: Ajoute une stratégie
function AddStrategyForm() {
  const { addStrategy } = useStrategies();
  
  const handleSubmit = async (data) => {
    await addStrategy(data);
    // ✅ Le composant B verra les données immédiatement
  };
  return ...;
}

// Composant B: Affiche les stratégies
function StrategyList() {
  const { strategies } = useStrategies();
  
  // ✅ Se met à jour automatiquement grâce à Supabase
  return strategies.map(s => <div key={s.id}>{s.name}</div>);
}
```

### 3. **Combiner plusieurs critères de filtrage**

```javascript
function AdvancedTradeFilter() {
  const { trades } = useTrades();
  
  const filterTrades = (symbol, pnlMin, dateStart) => {
    return trades.filter(t => 
      t.symbol === symbol &&
      t.pnl >= pnlMin &&
      new Date(t.entry_time) >= new Date(dateStart)
    );
  };
  
  return ...;
}
```

### 4. **Statistiques en temps réel**

```javascript
import { useMemo } from "react";
import { useTrades } from "@/lib/hooks/useTradeData";

function TradeStats() {
  const { trades } = useTrades();
  
  const stats = useMemo(() => {
    const total = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl < 0).length;
    const winRate = trades.length ? (wins / trades.length * 100).toFixed(1) : 0;
    
    return { total, wins, losses, winRate };
  }, [trades]);
  
  return (
    <div>
      <p>P&L Total: ${stats.total}</p>
      <p>Taux de Gain: {stats.winRate}%</p>
    </div>
  );
}
```

### 5. **Batch operations (Opérations en masse)**

```javascript
async function deleteMultipleStrategies(strategyIds) {
  const { deleteStrategy } = useStrategies();
  
  // Supprimer tous les trades en parallèle
  await Promise.all(
    strategyIds.map(id => deleteStrategy(id))
  );
}
```

### 6. **Mettre en cache via localStorage (optionnel, hybride)**

```javascript
function useStrategiesCached() {
  const { strategies, loading } = useStrategies();
  
  // Mettre en cache le résultat localement
  useEffect(() => {
    if (strategies.length > 0) {
      localStorage.setItem('cached_strategies', JSON.stringify(strategies));
    }
  }, [strategies]);
  
  // Retourner les données mises en cache si pas encore chargées
  if (loading) {
    const cached = localStorage.getItem('cached_strategies');
    return cached ? JSON.parse(cached) : [];
  }
  
  return strategies;
}
```

---

## ❌ Troubleshooting Courant

### Problème 1: "Les données ne se chargent pas"

**Symptôme**: La page affiche un tableau vide même après la migration

**Solutions**:
```javascript
// 1. Vérifier que l'utilisateur est connecté
import { useAuth } from "@/lib/auth/supabaseAuthProvider";
const { user } = useAuth();
console.log("Utilisateur:", user?.id);

// 2. Vérifier les erreurs dans le hook
const { strategies, error, loading } = useStrategies();
console.log("Erreur:", error);
console.log("Chargement:", loading);

// 3. Vérifier dans Supabase que les données existent
// Supabase Dashboard → SQL Editor
// SELECT * FROM strategies WHERE user_id = 'YOUR_USER_ID';

// 4. Vérifier la RLS Policy
// Les policies doivent autoriser la lecture
// CREATE POLICY strategies_select ON strategies
//   FOR SELECT USING (auth.uid() = user_id);
```

### Problème 2: "Les modifications ne persistent pas"

**Symptôme**: J'ajoute une stratégie, mais elle disparaît après F5

**Solutions**:
```javascript
// ❌ MAUVAIS - Pas d'await
const { addStrategy } = useStrategies();
const handleAdd = (data) => {
  addStrategy(data); // ❌ Pas d'attente!
};

// ✅ BON - Avec await
const handleAdd = async (data) => {
  await addStrategy(data); // ✅ Attend Supabase
};

// ✅ Vérifier la console pour les erreurs
.catch(err => console.error("Erreur:", err));
```

### Problème 3: "RLS Policy error"

**Message d'erreur**: 
```
new row violates row-level security policy for table "strategies"
```

**Solutions**:
```sql
-- 1. Vérifier que la policy existe
SELECT * FROM pg_policies WHERE tablename = 'strategies';

-- 2. Recréer la policy si elle manque
CREATE POLICY strategies_select ON strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY strategies_insert ON strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY strategies_update ON strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY strategies_delete ON strategies
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Vérifier que RLS est activé
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
```

### Problème 4: "user_id est NULL dans la base"

**Symptôme**: J'ajoute des données mais user_id = NULL

**Solutions**:
```javascript
// ❌ MAUVAIS - user_id pas inclus
const { addStrategy } = useStrategies();
const handleAdd = (data) => {
  // Le hook devrait ajouter user_id automatiquement
};

// ✅ Le hook fait déjà cela
// Vérifier dans useUserData.ts:
// { ...strategyData, user_id: user.id } ✅

// Si c'est toujours NULL, vérifier:
// 1. const { user } = useAuth(); // user?.id doit exister
console.log("User ID:", user?.id);

// 2. Si user?.id est undefined, l'utilisateur n'est pas connecté
// Rediriger vers /login
```

### Problème 5: "Erreur: Cannot read property 'id' of undefined"

**Symptôme**: Erreur lors de l'ajout/modification

**Solutions**:
```javascript
// ❌ PROBLÈME: Pas de vérification
async function handleSave(data) {
  const { addStrategy } = useStrategies();
  addStrategy(data); // user.id n'existe peut-être pas dans le hook
}

// ✅ SOLUTION: Vérifier d'abord
import { useAuth } from "@/lib/auth/supabaseAuthProvider";

async function handleSave(data) {
  const { user } = useAuth();
  if (!user?.id) {
    console.error("Utilisateur non connecté");
    return;
  }
  const { addStrategy } = useStrategies();
  await addStrategy(data);
}
```

### Problème 6: "Les données sont en cache stale (obsolètes)"

**Symptôme**: Je modifie dans Supabase, mais l'app n'affiche pas le changement

**Solutions**:
```javascript
// Solution 1: Recharger la page
window.location.reload();

// Solution 2: Re-trigger le hook
import { useState } from "react";

function MyComponent() {
  const [refresh, setRefresh] = useState(0);
  const { strategies } = useStrategies(refresh);
  
  const handleRefresh = () => setRefresh(r => r + 1);
  
  return (
    <>
      <button onClick={handleRefresh}>🔄 Rafraîchir</button>
      {/* Afficher strategies */}
    </>
  );
}

// Solution 3: Utiliser Supabase subscriptions (avancé)
// À implémenter plus tard pour synchronisation temps réel
```

---

## 📞 Questions Fréquentes (FAQ)

### Q: Peut-on utiliser localStorage et Supabase ensemble?
**R**: Oui! Pattern hybride:
```javascript
// Supabase pour la source de vérité
const { strategies } = useStrategies();

// localStorage comme cache local
useEffect(() => {
  localStorage.setItem('strategy_cache', JSON.stringify(strategies));
}, [strategies]);
```

### Q: Comment sauvegarder en draft (brouillon)?
**R**: Utilisez un state local + save manuel:
```javascript
function StrategyEditor({ strategyId }) {
  const [formData, setFormData] = useState({ name: "", description: "" });
  const { updateStrategy } = useStrategies();
  
  const handleSaveDraft = () => {
    localStorage.setItem('draft_strategy', JSON.stringify(formData));
    console.log("Brouillon sauvegardé");
  };
  
  const handlePublish = async () => {
    await updateStrategy(strategyId, formData);
    localStorage.removeItem('draft_strategy');
  };
  
  return ...;
}
```

### Q: Comment exporter les données?
**R**: Télécharger en CSV/JSON:
```javascript
function ExportStrategies() {
  const { strategies } = useStrategies();
  
  const handleExport = () => {
    const csvContent = [
      ["ID", "Name", "Description"],
      ...strategies.map(s => [s.id, s.name, s.description])
    ].map(row => row.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strategies.csv";
    a.click();
  };
  
  return <button onClick={handleExport}>📥 Exporter</button>;
}
```

### Q: Comment faire une recherche?
**R**: Côté client ou côté serveur via edge functions:
```javascript
// Côté client (simple, pas optimisé)
function SearchStrategies({ query }) {
  const { strategies } = useStrategies();
  
  return strategies.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );
}

// Côté Supabase (optimisé pour gros volumes)
// À faire: Edge function avec full-text search
```

---

## 📊 Performance

### Conseils d'Optimisation

1. **Utilisez `useMemo` pour les calculs lourds**
```javascript
const stats = useMemo(() => {
  // Calculs complexes ici
  return computeStats(trades);
}, [trades]);
```

2. **Limitez les rendus inutiles**
```javascript
const Component = React.memo(({ data }) => {
  return <div>{data.name}</div>;
});
```

3. **Paginez pour les gros volumes**
```javascript
// À faire: Ajouter la pagination si trades > 1000
```

---

## 🔐 Sécurité

✅ Les RLS policies garantissent que:
- Utilisateur A ne peut voir que ses propres données
- Pas d'accès cross-user
- Les suppressions sont sécurisées

---

## 🎯 Prochaines Étapes

1. ✅ Migration des données
2. ✅ Tester avec `/dashboard/test-data`
3. Remplacer progressivement DashboardNew.jsx
4. Tester sur plusieurs appareils
5. (Bonus) Ajouter la synchronisation temps réel
