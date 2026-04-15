# 🔧 Quick Diagnostic - Notes Quotidiennes

Exécutez ces commandes dans la Console du Navigateur (F12) pour diagnostiquer les problèmes:

## Test 1: Vérifier localStorage
```javascript
// Voir toutes les notes sauvegardées
console.log("Notes actuelles:", localStorage.getItem("tr4de_daily_notes"));

// Ajouter une note de test
localStorage.setItem("tr4de_daily_notes", JSON.stringify({
  "2024-01-15": "Test note"
}));
console.log("✅ Note de test ajoutée");

// Vérifier que c'est sauvé
console.log("Vérification:", localStorage.getItem("tr4de_daily_notes"));
```

## Test 2: Vérifier l'authentification
```javascript
// Voir si vous êtes authentifié
const token = localStorage.getItem('sb-aauth-token');
console.log("Token d'auth existe?", !!token);
if (token) {
  const tokenData = JSON.parse(token);
  console.log("User ID:", tokenData.user?.id);
}
```

## Test 3: Vérifier le hook
```javascript
// Mettre une note via le hook
// (La fonction updateDailyNote doit être disponible)
// updateDailyNote("2024-01-15", "Ma note test");

// Attendez 2 secondes et vérifiez localStorage
setTimeout(() => {
  console.log("Après 2s:", localStorage.getItem("tr4de_daily_notes"));
}, 2000);
```

## Test 4: Vérifier Supabase (si table existe)
```javascript
// Dans Supabase SQL Editor:
SELECT * FROM daily_session_notes 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔍 Signes de Succès

### ✅ localStorage fonctionne
```
localStorage.getItem("tr4de_daily_notes") retourne:
{"2024-01-15":"Votre note text"}
```

### ✅ Authentification ok
```
Token d'auth existe? true
User ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### ✅ Hook fonctionne
```
Console montre:
💾 Sauvegarde note journalière pour: 2024-01-15
✅ Sauvegardé dans localStorage
```

## ❌ Problèmes Courants

### Problem: localStorage vide
```javascript
localStorage.getItem("tr4de_daily_notes") === null
```
**Solution:** Écrivez une note d'abord, puis vérifiez

### Problem: Pas d'authentification
```
Token d'auth existe? false
```
**Solution:** Connectez-vous d'abord via la page de connexion

### Problem: Notes disparaissent au reload
1. Vérifiez que localStorage n'est pas vidé (Ctrl+Shift+Delete)
2. Vérifiez que le hook charge bien les notes au startup
3. Vérifiez que `dailyNotes[dateStr]` est bien utilisé dans le rendu

## 📋 Commandes Utiles

```javascript
// Vider toutes les notes (test)
localStorage.removeItem("tr4de_daily_notes");

// Ajouter une note directement
const notes = JSON.parse(localStorage.getItem("tr4de_daily_notes") || "{}");
notes["2024-01-15"] = "Ma note test";
localStorage.setItem("tr4de_daily_notes", JSON.stringify(notes));

// Voir toutes les clés localStorage
Object.keys(localStorage).filter(k => k.includes("tr4de"));
```
