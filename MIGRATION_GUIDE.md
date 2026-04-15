# 🔄 Guide de Migration: LocalStorage → Supabase

## Vue d'ensemble

Actuellement, vos données (stratégies, trades, notes, journal) sont stockées en **localStorage** (navigateur local). Nous les déplaçons vers **Supabase** pour les lier à votre compte utilisateur et les synchroniser sur tous les appareils.

## ✅ Étapes Complétées

### 1. **Schéma de Base de Données** ✅
Création de 4 nouvelles tables Supabase:
- `strategies` - Vos stratégies de trading
- `trading_journal` - Journal des sessions de trading
- `trading_rules` - Règles personnalisées de conformité
- `user_preferences` - Vos préférences (fuseau horaire, risque, etc.)

### 2. **Hooks React** ✅
Création de vos nouveaux hooks dans `lib/hooks/useUserData.ts`:
- `useStrategies()` - Gérer les stratégies
- `useTradingJournal()` - Gérer le journal
- `useTradingRules()` - Gérer les règles
- `useUserPreferences()` - Gérer les préférences

### 3. **Script de Migration** ✅
Fonction `migrateLocalStorageToSupabase()` qui:
- Préserve vos données existantes
- Les transfère vers Supabase
- Empêche les doublons
- Crée les préférences utilisateur si nécessaire

### 4. **Composant de Migration** ✅
Interface visuelle pour lancer la migration et voir le statut.

## 📋 Plan d'Implémentation Progressive

### PHASE 1: Migration des Données (MAINTENANT)

1. **Accéder au composant de migration**
   ```
   /dashboard/migration  (à créer)
   ```

2. **Lancer la migration**
   - Cliquer sur "🚀 Lancer la Migration"
   - Attendre la confirmation ✅

3. **Vérifier les données**
   - Aller dans Supabase Dashboard
   - Vérifier les tables: `strategies`, `trading_journal`, `trading_rules`

### PHASE 2: Remplacer DashboardNew.jsx (PROGRESSIF)

Remplacer les appels `localStorage` par les nouveaux hooks:

#### ❌ Ancien Code
```javascript
// Charger depuis localStorage
useEffect(() => {
  const saved = localStorage.getItem("apex_strategies");
  if (saved) {
    setStrategies(JSON.parse(saved));
  }
}, []);

// Sauvegarder dans localStorage
const handleSave = (updated) => {
  setStrategies(updated);
  localStorage.setItem("apex_strategies", JSON.stringify(updated));
};
```

#### ✅ Nouveau Code
```javascript
import { useStrategies } from "@/lib/hooks/useUserData";

// Récupérer automatiquement
const { strategies, addStrategy, updateStrategy, deleteStrategy } = useStrategies();

// Sauvegarder automatiquement
const handleSave = async (updated) => {
  await updateStrategy(strategy.id, updated);
};
```

### PHASE 3: Tests

1. **Tester chaque fonctionnalité**
   - Ajouter une nouvelle stratégie
   - Éditer une stratégie existante
   - Supprimer une stratégie
   - Vérifier dans la DB que les données changent

2. **Tester sur un autre appareil**
   - Se connecter depuis un autre navigateur/appareil
   - Vérifier que vous voyez les mêmes données

3. **Tester la synchronisation en temps réel** (bonus)
   - Ouvrir deux onglets
   - Ajouter une stratégie dans un onglet
   - Vérifier qu'elle apparaît dans l'autre 🔄

## 🔧 Intégration dans DashboardNew.jsx

### Exemple 1: Stratégies

**Avant (localStorage):**
```javascript
function StrategySection() {
  const [strategies, setStrategies] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("apex_strategies");
    setStrategies(saved ? JSON.parse(saved) : []);
  }, []);

  const handleDelete = (id) => {
    const updated = strategies.filter(s => s.id !== id);
    setStrategies(updated);
    localStorage.setItem("apex_strategies", JSON.stringify(updated));
  };
}
```

**Après (Supabase):**
```javascript
import { useStrategies } from "@/lib/hooks/useUserData";

function StrategySection() {
  const { strategies, loading, deleteStrategy } = useStrategies();

  const handleDelete = async (id) => {
    await deleteStrategy(id);
  };

  if (loading) return <div>Chargement...</div>;
  return (
    // ... votre UI
  );
}
```

### Exemple 2: Notes de Trades

**Avant (localStorage):**
```javascript
const saveTradeNote = (tradeId, note) => {
  const saved = localStorage.getItem("tr4de_trade_notes") || "{}";
  const notes = JSON.parse(saved);
  notes[tradeId] = note;
  localStorage.setItem("tr4de_trade_notes", JSON.stringify(notes));
};
```

**Après (Supabase):**
```javascript
import { useTradeDetails } from "@/lib/hooks/useTradeDetails";

const { addTradeDetail, updateTradeDetail } = useTradeDetails();

const saveTradeNote = async (tradeId, note) => {
  // Chercher si le détail existe déjà
  const existing = await getTradeDetail(tradeId);
  if (existing) {
    await updateTradeDetail(existing.id, { notes: note });
  } else {
    await addTradeDetail({ trade_id: tradeId, notes: note });
  }
};
```

## 📊 Mapping des Tables

| LocalStorage | Supabase Table | Hook | Notes |
|---|---|---|---|
| `apex_strategies` | `strategies` | `useStrategies()` | ✅ Prêt |
| `tr4de_trade_notes` | `trade_details` | [À créer] | Besoin de `useTradeDetails()` |
| `tr4de_checked_rules` | `trading_rules` | `useTradingRules()` | ✅ Prêt |
| Préférences locales | `user_preferences` | `useUserPreferences()` | ✅ Prêt |

## 🚀 Commandes Utiles

### Vérifier les données dans Supabase
```javascript
// Dans la console du navigateur
const { data } = await supabase.from('strategies').select('*');
console.log(data);
```

### Vider le localStorage (après vérification)
```javascript
// ⚠️ SEULEMENT APRÈS MIGRATION RÉUSSIE!
localStorage.removeItem('apex_strategies');
localStorage.removeItem('tr4de_trade_notes');
localStorage.removeItem('tr4de_checked_rules');
console.log('✅ LocalStorage vidé');
```

### Voir le statut de migration
```javascript
// Dans la console
import { getMigrationStatus } from '@/lib/migration/localStorageToSupabase';
const status = await getMigrationStatus(userId);
console.log(status);
```

## ⚠️ Points Importants

1. **Pas de suppression automatique** du localStorage
   - Les anciennes données restent pour la sécurité
   - Vous décidez quand les supprimer

2. **Compatibilité rétroactive**
   - L'ancien code continuera à fonctionner
   - Migration progressive possible

3. **Données utilisateur**
   - Toutes les données seront liées à `user_id`
   - Accès sécurisé via RLS (Row Level Security)

4. **Synchronisation multi-appareils**
   - Une fois migré, vos données se synchronisent en temps réel
   - Parfait pour trader depuis plusieurs écrans

## ✨ Avantages

✅ **Accès depuis n'importe quel appareil**
✅ **Sauvegarde cloud automatique**
✅ **Synchronisation en temps réel**
✅ **Meilleure sécurité des données**
✅ **Pas de limite de stockage** (localStorage: ~5MB)
✅ **Partage facile** avec d'autres utilisateurs (futur)

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifiez la console du navigateur (F12)
2. Vérifiez que vous êtes connecté à votre compte
3. Vérifiez les RLS policies dans Supabase
4. Relancez la page (F5)

---

**Statut**: ✅ Prêt pour la migration
**Prochaine étape**: Lancer la migration depuis `/dashboard/migration`
