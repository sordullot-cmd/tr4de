# 🧪 Test et Diagnostic - Discipline + Database

## 🎯 Objectif

Vérifier que les checkboxes Discipline se sauvegardent correctement.

---

## ✅ Test 1: localStorage Fonctionne

### Préalable
Vous êtes sur l'app, page **Discipline**

### Steps:

1. **Ouvrez la console** (F12)
2. **Cochez une règle**, ex: "Pre Market Routine" ✓
3. **Dans console**, tapez:
```javascript
localStorage.getItem("tr4de_checked_rules_" + new Date().toISOString().split('T')[0])
```
4. **Appuyez Enter**

### Résultat Attendu:
```json
{"premarket":true,"biais":false,"news":false,"followall":false,"journal":false}
```

✅ **Si vous voyez ça**: localStorage fonctionne!

---

## ✅ Test 2: Rechargement Persiste

### Steps:

1. **Cochez une règle** sur page Discipline
2. **Rechargez la page** (F5 ou Ctrl+Shift+R pour hard refresh)
3. **Vérifiez**: La règle est-elle toujours cochée?

✅ **Si OUI**: localStorage sauvegarde correctement!
❌ **Si NON**: Il y a un bug dans le code UI

---

## ✅ Test 3: Logs Console (Import!)

### Steps:

1. **Ouvrez console** (F12)
2. **Supprimez tous les anciens logs**: Cliquez icône poubelle ⎇
3. **Cochez une règle** Discipline
4. **Regardez les logs** qui apparaissent

### Logs Attendus:

**Meilleur cas (avec Supabase migrations):**
```
📍 Mise à jour rule premarket pour 2024-01-15: true
✅ Sauvegardé dans localStorage
✅ Sauvegardé dans Supabase
✅ Mise à jour sauvegardée
```

**Cas acceptable (sans migrations Supabase):**
```
📍 Mise à jour rule premarket pour 2024-01-15: true
✅ Sauvegardé dans localStorage
⚠️ Table daily_discipline_tracking n'existe pas encore - continue avec localStorage
✅ Mise à jour sauvegardée
```

**❌ Cas d'erreur à éviter:**
```
📍 Mise à jour rule premarket...
❌ Erreur mise à jour discipline: XXXX
```

---

## 🔍 Diagnostic Avancé

### Console Command 1: Vérifier la Date d'aujourd'hui

```javascript
new Date().toISOString().split('T')[0]
```

Résultat: `2024-01-15` (exemple)

→ Notez cette date pour les prochains tests!

---

### Console Command 2: Vérifier localStorage pour une date

```javascript
const today = new Date().toISOString().split('T')[0];
localStorage.getItem("tr4de_checked_rules_" + today)
```

Résultat: `{"premarket":true,...}` ou `null`

---

### Console Command 3: Vérifier Supabase Connection

```javascript
const { data, error } = await supabase
  .from("daily_discipline_tracking")
  .select("*")
  .limit(1);

if (error) {
  console.log("❌ Erreur Supabase:", error.message);
} else {
  console.log("✅ Supabase OK:", data);
}
```

**Résultats possibles:**
- `✅ Supabase OK: []` → Connexion OK, pas de données
- `✅ Supabase OK: [...]` → Connexion OK, données présentes
- `❌ Erreur: PGRST116...` → Table n'existe pas (migrations pas exécutées)
- `❌ Erreur: permission denied` → RLS policies problème

---

### Console Command 4: Vérifier l'Utilisateur Actuellement Logué

```javascript
const { data: userData, error } = await supabase.auth.getUser();
if (error) {
  console.log("❌ Pas connecté:", error.message);
} else {
  console.log("✅ Connecté:", userData.user.email);
  console.log("   User ID:", userData.user.id);
}
```

---

### Console Command 5: Tester INSERT Manuel dans Supabase

```javascript
const { data, error } = await supabase
  .from("daily_discipline_tracking")
  .insert([{
    user_id: "VOTRE_USER_ID_ICI",
    date: "2024-01-15",
    rule_id: "test_rule",
    completed: true
  }]);

if (error) {
  console.log("❌ Insert failed:", error.message);
} else {
  console.log("✅ Insert success!", data);
}
```

---

## 📊 Tableau de Diagnostic

| Symptôme | localStorage Test | Rechargement | Console Logs | Cause Probable |
|----------|-------------------|--------------|--------------|-----------------|
| Rien fonctionne | ❌ Null | N/A | ❌ Erreur au clic | Bug code ou pas auth |
| localStorage OK, Supabase fail | ✅ Data | ✅ Persiste | ⚠️ Table n'existe pas | Migrations pas exécutées |
| Tout fonctionne | ✅ Data | ✅ Persiste | ✅ Sauvegardé Supabase | **C'est bon!** ✨ |

---

## 🚀 Scenario Complet de Test

### Scenario 1: Test Local (localStorage seulement)

**Pas besoin de Supabase!**

1. ✓ Ouvrir Discipline
2. ✓ Cocher "Pre Market" 
3. ✓ F12 → localStorage check → Voir data ✅
4. ✓ Reload page
5. ✓ Règle toujours cochée ✅

**Résultat:** localStorage fonctionne 100%!

---

### Scenario 2: Test avec Supabase (Après Migrations)

**Supposons migrations exécutées**

1. ✓ Ouvrir Discipline
2. ✓ Cocher "Pre Market" 
3. ✓ F12 → Console → Voir logs ✅
4. ✓ Console Command 2 → Voir data localStorage ✅
5. ✓ Supabase Web > Table Editor > daily_discipline_tracking
6. ✓ Voir ligne avec data ✅
7. ✓ Reload page
8. ✓ Toujours cochée ✅

**Résultat:** Supabase fonctionne 100%!

---

## 🔧 Corrections Rapides

### Problem: Au clic, rien ne se passe

1. **Vérifiez auth**:
```javascript
const { data: user } = await supabase.auth.getUser();
console.log(user?.user?.email);
```

2. Si `null` → **Pas connecté!** Logez-vous d'abord

---

### Problem: localStorage vide après reload

1. **Vérifiez la date**:
```javascript
new Date().toISOString().split('T')[0]
```

2. **Vérifiez la clé**:
```javascript
localStorage.getItem("tr4de_checked_rules_2024-01-15")
// (remplacer 2024-01-15 par votre date d'aujourd'hui)
```

3. Si résultat `null` → Le localStorage n'a pas été rempli → Problème au clic

---

### Problem: Supabase dit "table not found"

1. **Les migrations n'ont pas été exécutées!**
2. Allez à [SUPABASE_MIGRATIONS_STEP_BY_STEP.md](SUPABASE_MIGRATIONS_STEP_BY_STEP.md)
3. Suivez les steps
4. Réessayez

---

## ✨ Checklist Finale

- [ ] localStorage fonctionne (Test 1)
- [ ] Rechargement persiste (Test 2)
- [ ] Console logs visibles (Test 3)
- [ ] User ID present (Console Command 4)
- [ ] Supabase OK ou table exists (Console Command 5)
- [ ] Discipline page: cochez une règle
- [ ] F5 reload
- [ ] Règle reste cochée **✅**

---

## 🎉 If All Green

Vous êtes **100% bon à go**! 

Les checkboxes:
✅ Se sauvegardent en localStorage
✅ Persistent après reload
✅ Vont dans Supabase (si migrations faites)
✅ Prêt pour multi-appareils sync
