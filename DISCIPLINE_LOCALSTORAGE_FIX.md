# ✅ Fix Discipline Page - localStorage Harmonization

## 🔧 Problème Identifié

La page Discipline avait une **incohérence de localStorage keys**:

**DashboardNew.jsx** (composant):
- Sauvegarde: `localStorage.setItem("tr4de_checked_rules_2024-01-15", ...)`
- Charge: `localStorage.getItem("tr4de_checked_rules_2024-01-15")`

**useDisciplineTracking.ts** (hook):
- Sauvegarde: `localStorage.setItem("tr4de_discipline_data", ...)`
- Charge: `localStorage.getItem("tr4de_discipline_data")`

**Résultat**: Les deux composants ne lisaient/écrivaient pas aux mêmes localisations!

## ✅ Corrections Apportées

### 1. **Hook - Harmonisation des clés localStorage**

**Avant:**
```typescript
// Fallback: utilisait "tr4de_discipline_data"
localStorage.setItem("tr4de_discipline_data", JSON.stringify(allData));
```

**Après:**
```typescript
// Fallback: utilise la même clé que le composant
localStorage.setItem(`tr4de_checked_rules_${dateStr}`, JSON.stringify(allRules));
```

### 2. **Hook - Chargement initial corrigé**

**Avant:**
```typescript
const stored = localStorage.getItem("tr4de_discipline_data");
```

**Après:**
```typescript
const today = new Date().toISOString().split('T')[0];
const stored = localStorage.getItem(`tr4de_checked_rules_${today}`);
```

### 3. **Hook - Erreur générale aussi corrigée**

Quand Supabase échoue pour une raison autre que "table not found":
```typescript
// Aussi utilise maintenant la clé cohérente
localStorage.getItem(`tr4de_checked_rules_${today}`)
```

## 🧪 Résultat

**Architecture harmonisée:**
```
DashboardNew.jsx
      ↓
toggleRule(ruleId) 
      ↓
setRuleCompleted(today, ruleId, status)
      ↓
├→ State React updated
├→ localStorage: tr4de_checked_rules_${today} (✅ COHÉRENT)
└→ Supabase: daily_discipline_tracking (INSERT/UPDATE)
```

## ✨ Fonctionnement Attendu

### Test 1: localStorage uniquement

1. Allez à **Discipline**
2. Cochez une règle
3. Console (F12):
```javascript
localStorage.getItem("tr4de_checked_rules_2024-01-15")
// {"premarket":true,"biais":false,...}
```
4. Recharger la page
5. **✅ Règle reste cochée**

### Test 2: Supabase (après migrations)

1. Exécutez `migration_safe.sql` dans Supabase
2. Cochez une règle
3. Console montre:
```
📍 Mise à jour rule premarket pour 2024-01-15: true
✅ Mise à jour sauvegardée
```
4. Supabase > Table Editor > `daily_discipline_tracking`
5. **✅ Voir la ligne insérée**

## 📊 Schéma localStorage

**Avant (INCOHÉRENT):**
```
localStorage {
  "tr4de_checked_rules_2024-01-15": {"premarket":true, ...}  ← Composant
  "tr4de_discipline_data": {"2024-01-15": {...}}             ← Hook (AUTRE KEY!)
}
```

**Après (COHÉRENT):**
```
localStorage {
  "tr4de_checked_rules_2024-01-15": {"premarket":true, ...}  ← Composant
                                                              ← Hook (MÊME KEY!)
}
```

## 🎯 Flux complet maintenant

```
1. User coche "Pre Market" ✓
              ↓
2. toggleRule() appelé
              ↓
3. setCheckedRuleIds() met à jour state React (immédiat)
              ↓
4. localStorage.setItem("tr4de_checked_rules_2024-01-15", ...) (immédiat)
              ↓
5. setRuleCompleted() appelé (async)
              ↓
   Si Supabase OK: INSERT/UPDATE dans daily_discipline_tracking ✅
   Si Supabase erreur: setRuleCompleted fallback à 
                       localStorage.setItem("tr4de_checked_rules_2024-01-15", ...)
                       (même key, pas de duplication) ✅
```

## 📁 Fichiers Modifiés

- [lib/hooks/useDisciplineTracking.ts](lib/hooks/useDisciplineTracking.ts)
  - ✅ Fallback localStorage key harmonisée
  - ✅ Chargement initial utilise même key
  - ✅ Erreur générale aussi corrigée

## 🚀 Prochaines Étapes

1. **Local test** (5 min)
   ```
   1. Ouvrir Discipline
   2. Cocher une règle
   3. F5 reload
   4. Vérifier que règle reste cochée
   ```

2. **Appliquer migrations Supabase** (2 min)
   - Copier `migration_safe.sql` du workspace
   - Paster dans Supabase SQL Editor
   - Exécuter

3. **Test Supabase** (5 min)
   - Cocher une règle
   - Vérifier dans `daily_discipline_tracking` table

## ✅ Status

- ✅ Composant (DashboardNew.jsx) - toggleRule → setRuleCompleted
- ✅ Hook (useDisciplineTracking.ts) - localStorage keys harmonisées
- ✅ localStorage - Même key partout
- ⏳ Supabase - À activer via migrations
