# 🧪 Test rapide - Notes Quotidiennes

Utilisez ce guide pour tester que les notes quotidiennes se sauvent correctement.

## ✅ Procédure de Test

### Étape 1: Ouvrir la Console
- Appuyez sur **F12** pour ouvrir les DevTools
- Allez à l'onglet **Console**

### Étape 2: Naviguer au Journal
- Allez à la page **"Journal"** du site
- Trouvez la section **"Notes du jour"**

### Étape 3: Écrire une Note
- Écrivez: `Test de sauvegarde - date actuelle`
- Attendez que la note se sauve (auto-save)

### Étape 4: Vérifier les Logs
Vous devriez voir dans la console:
```
💾 Sauvegarde note journalière pour: 2024-01-15 Texte: Test de sauvegarde...
✅ Sauvegardé dans localStorage
✅ Note journalière sauvegardée
```

### Étape 5: Vérifier localStorage
Dans la console, tapez:
```javascript
localStorage.getItem("tr4de_daily_notes")
```

Vous devriez voir:
```json
{"2024-01-15":"Test de sauvegarde - date actuelle"}
```

### Étape 6: Vérifier Supabase (si table existe)
1. Allez à https://app.supabase.com
2. Table Editor → `daily_session_notes`
3. Cherchez votre note avec la date du jour

### Étape 7: Recharger la Page
- Appuyez sur **F5** pour recharger
- Les notes doivent réapparaître immédiatement

## ❌ Si ça ne marche pas

### Symptôme: Note disparaît après reload
**Solution:**
1. Vérifiez localStorage avec:
```javascript
console.log("Notes sauvegardées:", localStorage.getItem("tr4de_daily_notes"));
```

2. Vérifiez que `useDailySessionNotes` charge les notes:
```javascript
// Console
JSON.parse(localStorage.getItem("tr4de_daily_notes") || "{}")
```

### Symptôme: "Cannot read property setNote"
**Solution:**
- Le hook a besoin d'un peu de temps pour se charger
- Attendez 1-2 secondes avant d'écrire

### Symptôme: Les notes ne persistent pas
**Solution:**
1. Vérifiez que vous êtes authentifié
2. Ouvrez la console et cherchez les erreurs rouge
3. Vérifiez que localStorage n'est pas vide:
```javascript
localStorage.getItem("tr4de_daily_notes")
```

## 📊 Vérification Complète

Si vous voyez tous ces logs, c'est bon! ✅

```
📔 Chargement notes journalières pour user: xxx-xxx-xxx
✅ Chargé 0 notes depuis localStorage
💾 Sauvegarde note journalière pour: 2024-01-15
✅ Sauvegardé dans localStorage
✅ Note journalière sauvegardée
```

## 🎉 Succès!

Les notes se sauvent quand vous voyez:
- ✅ Le texte reste dans la textarea après reload
- ✅ localStorage contient vos notes
- ✅ Pas d'erreurs rouges dans la console
