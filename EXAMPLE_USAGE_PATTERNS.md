/**
 * EXEMPLE: Comment remplacer localStorage par Supabase
 * 
 * Ce fichier montre les patterns à appliquer dans votre code existant
 */

// ============================================================================
// 🔴 AVANT - Utilisation de localStorage
// ============================================================================

// ANCIEN - Ne pas utiliser
function StrategyPageOLD() {
  const [strategies, setStrategies] = require("react").useState([]);

  // Charger depuis localStorage
  require("react").useEffect(() => {
    const saved = localStorage.getItem("apex_strategies");
    if (saved) {
      setStrategies(JSON.parse(saved));
    }
  }, []);

  // Ajouter une stratégie
  const handleAddStrategy = (newStrategy) => {
    const updated = [...strategies, { ...newStrategy, id: Date.now() }];
    setStrategies(updated);
    localStorage.setItem("apex_strategies", JSON.stringify(updated)); // ❌ Manuel!
  };

  // Supprimer une stratégie
  const handleDeleteStrategy = (id) => {
    const updated = strategies.filter((s) => s.id !== id);
    setStrategies(updated);
    localStorage.setItem("apex_strategies", JSON.stringify(updated)); // ❌ Manuel!
  };

  return (
    <div>
      <h1>Stratégies ({strategies.length})</h1>
      {strategies.map((strategy) => (
        <div key={strategy.id}>
          <h2>{strategy.name}</h2>
          <button onClick={() => handleDeleteStrategy(strategy.id)}>Supprimer</button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 🟢 APRÈS - Utilisation de Supabase avec hooks
// ============================================================================

// NOUVEAU - À utiliser!
import { useStrategies } from "@/lib/hooks/useUserData";

function StrategyPageNEW() {
  const {
    strategies,        // ✅ Données chargées automatiquement
    loading,           // ✅ État de chargement
    error,             // ✅ Gestion d'erreur
    addStrategy,       // ✅ Fonction pour ajouter
    deleteStrategy,    // ✅ Fonction pour supprimer
    updateStrategy,    // ✅ Fonction pour mettre à jour
  } = useStrategies();

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  // Ajouter une stratégie - Automatiquement sauvegardée dans Supabase
  const handleAddStrategy = async (newStrategy) => {
    await addStrategy(newStrategy); // ✅ Automatique! Pas besoin de savegarder
  };

  // Supprimer une stratégie - Automatiquement supprimée de Supabase
  const handleDeleteStrategy = async (id) => {
    await deleteStrategy(id); // ✅ Automatique! Pas de localStorage
  };

  return (
    <div>
      <h1>Stratégies ({strategies.length})</h1>
      {strategies.map((strategy) => (
        <div key={strategy.id}>
          <h2>{strategy.name}</h2>
          <button onClick={() => handleDeleteStrategy(strategy.id)}>Supprimer</button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 📋 EXEMPLE 2: Notes de Trades
// ============================================================================

import { useTradeDetails } from "@/lib/hooks/useTradeData";

function TradeNotesNEW({ tradeId }) {
  const { getTradeDetail, addTradeDetail, updateTradeDetail } = useTradeDetails();
  const [notes, setNotes] = require("react").useState("");

  // Charger les notes existantes
  require("react").useEffect(() => {
    const detail = getTradeDetail(tradeId);
    if (detail) setNotes(detail.notes || "");
  }, [tradeId]);

  // Sauvegarder les notes
  const handleSaveNotes = async () => {
    const detail = getTradeDetail(tradeId);
    if (detail) {
      // Mettre à jour si existe
      await updateTradeDetail(detail.id, { notes });
    } else {
      // Créer si n'existe pas
      await addTradeDetail(tradeId, { notes });
    }
  };

  return (
    <div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes du trade..."
      />
      <button onClick={handleSaveNotes}>Sauvegarder</button>
    </div>
  );
}

// ============================================================================
// 📊 EXEMPLE 3: Multiple hooks ensemble
// ============================================================================

import { useUserPreferences } from "@/lib/hooks/useUserData";
import { useTrades } from "@/lib/hooks/useTradeData";

function DashboardNEW() {
  const { strategies } = useStrategies();
  const { trades, loading: tradesLoading } = useTrades();
  const { preferences } = useUserPreferences();

  if (tradesLoading) return <div>Chargement...</div>;

  return (
    <div>
      <h1>Tableau de Bord</h1>
      
      {/* Afficher les préférences */}
      <div>
        <p>Risque par trade: {preferences?.risk_percentage}%</p>
        <p>Fuseau horaire: {preferences?.timezone}</p>
      </div>

      {/* Afficher les statistiques */}
      <div>
        <p>Stratégies: {strategies.length}</p>
        <p>Trades: {trades.length}</p>
      </div>
    </div>
  );
}

// ============================================================================
// 🎯 PATTERN DE REMPLACEMENT RAPIDE
// ============================================================================

/*
LOCALISATION DANS VOTRE CODE:

1. Identifier les useState qui utilisent localStorage
   ❌ const [data, setData] = useState([]);
      localStorage.getItem("key")

2. Remplacer par le hook correspondant
   ✅ const { data, addData, deleteData } = useHook();

3. Remplacer les appels localStorage
   ❌ localStorage.setItem("key", JSON.stringify(data));
   ✅ await addData(newItem);  // Automatique!

4. Enlever les useEffect de chargement
   ❌ useEffect(() => { 
        const saved = localStorage.getItem("key");
        setData(JSON.parse(saved));
      }, []);
   ✅ // Plus besoin! Le hook gère tout

FICHIERS À METTRE À JOUR:
- components/DashboardNew.jsx - Utilise localStorage pour stratégies et trades
- components/dashboard/Dashboard.jsx - Utilise localStorage pour notes
- components/StrategyPage.jsx - Utilise localStorage
- lib/useAuth.js - Peut garder localStorage pour les tokens
*/

// ============================================================================
// 🔄 EXEMPLE 4: Migration step-by-step pour DashboardNew.jsx
// ============================================================================

/*
ÉTAPE 1: Ajouter le hook en haut du fichier
---
import { useStrategies } from "@/lib/hooks/useUserData";

ÉTAPE 2: Remplacer le state et useEffect
---
// ❌ ANCIEN
const [strategies, setStrategies] = useState([]);
useEffect(() => {
  const saved = localStorage.getItem("apex_strategies");
  setStrategies(saved ? JSON.parse(saved) : []);
}, []);

// ✅ NOUVEAU
const { strategies, loading, deleteStrategy, addStrategy } = useStrategies();

ÉTAPE 3: Remplacer les appels localStorage
---
// ❌ ANCIEN (dans les handlers)
const updated = strategies.filter(s => s.id !== id);
setStrategies(updated);
localStorage.setItem("apex_strategies", JSON.stringify(updated));

// ✅ NOUVEAU (dans les handlers)
await deleteStrategy(id);

ÉTAPE 4: Ajouter la gestion du loading
---
if (loading) return <div>Chargement...</div>;

ÉTAPE 5: Tester
---
1. Ajouter une stratégie
2. Vérifier qu'elle apparaît
3. Actualiser la page - elle doit rester
4. Ouvrir un autre onglet - elle doit apparaître
*/

// ============================================================================
// 💡 TIPS & TRICKS
// ============================================================================

/*
Q: Comment modifier une stratégie?
R: const { updateStrategy } = useStrategies();
   await updateStrategy(strategyId, { name: "Nouveau nom" });

Q: Comment gérer les erreurs?
R: const { strategies, error } = useStrategies();
   if (error) return <div>Erreur: {error}</div>;

Q: Peut-on utiliser plusieurs hooks?
R: Oui! Combinaison recommandée:
   const { strategies } = useStrategies();
   const { trades } = useTrades();

Q: Comment accéder au user avec les données?
R: import { useAuth } from "@/lib/auth/supabaseAuthProvider";
   const { user } = useAuth();
   Les données sont automatiquement filtrées par user_id

Q: Comment filtrer les données?
R: const allTrades = useTrades();
   const mySymbolTrades = allTrades.trades.filter(t => t.symbol === "ES");
   // Ou côté Supabase avec une query modifiée

Q: Comment rafraîchir les données?
R: Rechargez simplement le component - le hook ré-fetch automatiquement
   ou utilisez un bouton "Rafraîchir" qui re-trigger l'useEffect
*/

export {
  StrategyPageNEW,
  TradeNotesNEW,
  DashboardNEW,
};
