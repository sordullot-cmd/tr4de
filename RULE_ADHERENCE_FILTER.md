# 📋 Filtrage par Suivi des Règles

## 🎯 Fonctionnalité

Le système de filtrage des trades par suivi des règles vous permet maintenant de:

1. **Voir tous les trades d'une stratégie groupés par état des règles cochées**
2. **Comparer le winrate pour 3 catégories:**
   - ✓ **Toutes les règles cochées** (Perfect adherence)
   - ◐ **Partiellement cochées** (Partial adherence) 
   - ✗ **Aucune règle cochée** (No adherence)
3. **Analyser l'impact de chaque niveau d'adhésion aux règles**

---

## 💻 Implémentation

### Modifications apportées:

#### [components/StrategyDetailPage.jsx](components/StrategyDetailPage.jsx)

1. **Ajout du state `checkedRules`**
   ```javascript
   const [checkedRules, setCheckedRules] = useState({});
   ```
   - Charge les règles cochées depuis localStorage au montage

2. **Logique de groupement des trades**
   ```javascript
   // GROUP TRADES BY RULE ADHERENCE
   const tradesGroupedByRuleState = {
     allChecked: [],  // All rules are checked
     partial: [],     // Some rules are checked
     none: []         // No rules are checked
   };
   ```

3. **Calcul du statut pour chaque trade**
   - Pour chaque trade, on compte combien de règles de la stratégie sont cochées
   - Si **toutes** sont cochées → groupe "allChecked"
   - Si **aucune** n'est cochée → groupe "none"
   - Si **entre 1 et N-1** sont cochées → groupe "partial"

4. **Nouvelle section UI** (après le header de la stratégie)
   - Affiche 3 cartes côte à côte avec:
     - Taux de victoire (%)
     - Gains/Pertes (W/L count)
     - Nombre de trades
     - P&L total
     - P&L moyen par trade

---

## 📊 Comment utiliser

### Étape 1: Créer une stratégie
- Allez dans la section **Stratégies**
- Créez une stratégie avec des règles (ex: "FVG 5m", "Support retesté", etc.)

### Étape 2: Charger des trades
- Importez vos trades et associez-les à la stratégie

### Étape 3: Cocher les règles
- Dans la page d'un trade (onglet "Stratégies")
- Pour chaque règle de la stratégie, cochez celles que le trade a respectées
- Les cases cochées sont automatiquement sauvegardées dans localStorage

### Étape 4: Analyser les résultats
- Allez sur la page de détail de la stratégie
- La nouvelle section "Trades par Suivi des Règles" s'affiche
- Comparez les winrates des 3 groupes:
  - **Vert**: Trades où toutes les règles ont été respectées = meilleure performance?
  - **Ambre**: Trades partiellement conformes = performance modérée?
  - **Rouge**: Trades sans aucune règle respectée = pire performance?

---

## 📈 Scénarios d'utilisation

### Scénario 1: Valider l'efficacité d'une stratégie
```
Vous avez créé une stratégie avec 3 règles.
Résultat:
- Toutes cochées: 65% de winrate ✓
- Partiellement: 45% de winrate
- Aucune: 30% de winrate

✅ Conclusion: Respecter les 3 règles améliore significativement le winrate (+35%)
```

### Scénario 2: Identifier les règles clés
```
Si le groupe "partiellement cochées" a un meilleur winrate que 
le groupe "toutes cochées", c'est que certaines règles ne sont 
pas optimales ou contradictoires.
```

### Scénario 3: Affiner les règles
```
Si aucune règle cochée = mauvais résultat, c'est qu'une 
discipline stricte est nécessaire pour cette stratégie.
```

---

## 🔄 Flux de données

```
localStorage['tr4de_checked_rules']
    ↓
[date_symbol_strategyId_ruleId]: true/false
    ↓
StrategyDetailPage charge les données
    ↓
Pour chaque trade:
  - Count combien de règles sont checkées
  - Catégorise le trade
    ↓
Affiche les statistiques groupées:
  - All checked: ✓ Toutes cochées
  - Partial: ◐ Partiellement
  - None: ✗ Aucune
```

---

## 🎨 UI Styling

Les 3 groupes ont des couleurs distinctes:

| Groupe | Couleur | Hex | Signification |
|--------|---------|-----|---------------|
| Toutes cochées | Vert | `#DCFCE7` bg, `#93C5FD` border | ✓ Succès |
| Partiellement | Ambre | `#F5EAE0` bg, gris border | ◐ Neutre |
| Aucune | Rouge | `#F5E6E6` bg, `#E0BFBF` border | ✗ Risque |

---

## 📝 Données stockées

Clé: `tr4de_checked_rules`
Format: JSON object
```javascript
{
  "2026-04-10_NQ_1{strategyId}_1{ruleId}": true,
  "2026-04-10_NQ_1{strategyId}_2{ruleId}": false,
  "2026-04-10_NQ_1{strategyId}_3{ruleId}": true,
  // ...
}
```

**Note**: Les données sont persistantes dans localStorage et synchronisées automatiquement.

---

## 🚀 Prochaines améliorations possibles

1. **Export des données**: Exporter les statistiques en CSV/PDF
2. **Comparaison entre stratégies**: Voir quel groupe (all/partial/none) performe le mieux entre stratégies
3. **Dashboard temps réel**: Widget montrant les stats en direct
4. **Alertes**: Notifier quand une règle a un impact négatif
5. **ML prediction**: Prédire la performance basée sur le pattern des règles

---

## 🐛 Dépannage

### Les statistiques ne s'affichent pas
- Vérifiez que vous avez créé une stratégie avec des règles
- Vérifiez que des trades sont assignés à la stratégie
- Ouvrez la DevTools → Applications → localStorage et vérifiez qu'il y a des données

### Les checkboxes ne se sauvegardent pas
- Allez dans la page d'un trade
- Vérifiez l'onglet "Stratégies"
- Les checkboxes à cocher doivent être visibles

### Winrates semblent incorrects
- Chaque groupe doit avoir au temps 1+ trade pour calculer un winrate valide
- Les groupes vides affichent 0%
