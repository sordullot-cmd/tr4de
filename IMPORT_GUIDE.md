# 📦 Guide des Imports Mise à Jour

## 🎯 Nouveaux chemins après refactoring

### Dashboard
```javascript
import Dashboard from '@/components/dashboard/Dashboard';
```

### Modals
```javascript
import TradeImportModal from '@/components/modals/TradeImportModal';
import BrokerLoginModal from '@/components/modals/BrokerLoginModal';
```

### Trade Components
```javascript
import TradeValidator from '@/components/trade/TradeValidator';
import TradeManagement from '@/components/trade/TradeManagement';
```

### UI Components
```javascript
import Navigation from '@/components/ui/Navigation';
import Calendar from '@/components/ui/Calendar';
import Strategies from '@/components/ui/Strategies';
```

### Agentia (IA)
```javascript
import Agentia from '@/components/Agentia';  // Toujours à la racine
```

---

## ✅ Fichiers mis à jour

- ✅ `app/page.tsx` - Import du Dashboard mis à jour
- ✅ `components/dashboard/Dashboard.jsx` - TradeValidator path updated

---

## ⚠️ À faire si des erreurs surviennent

Si vous rencontrez des imports cassés:

1. **Chercher les références**: 
   ```bash
   grep -r "from.*TradeImportModal" .
   grep -r "from.*BrokerLoginModal" .
   grep -r "from.*TradeValidator" .
   ```

2. **Mettre à jour les chemins** selon la nouvelle structure

3. **Vérifier les imports relatifs** dans les fichiers déplacés:
   - `components/modals/*.jsx`
   - `components/trade/*.jsx`
   - `components/ui/*.jsx`

---

## 🔗 Imports dans les Route Handlers

Si les fichiers API (`app/api/*/route.js`) utilisent des composants:

```javascript
// ❌ Avant
import TradeValidator from '@/components/TradeValidator';

// ✅ Après  
import TradeValidator from '@/components/trade/TradeValidator';
```

---

## 📝 Structure finale

```
e:\tr4de\
├── app/
│   ├── page.tsx              ← Homepage
│   └── api/                  ← API routes
├── components/
│   ├── dashboard/
│   │   └── Dashboard.jsx     ← Main page
│   ├── modals/
│   │   ├── TradeImportModal.jsx
│   │   └── BrokerLoginModal.jsx
│   ├── trade/
│   │   ├── TradeValidator.jsx
│   │   └── TradeManagement.jsx
│   ├── ui/
│   │   ├── Navigation.jsx
│   │   ├── Calendar.jsx
│   │   └── Strategies.jsx
│   └── Agentia.jsx          ← AI module
├── lib/                      ← Utilities
└── public/                   ← Assets
```

---

## 🎉 Résultat

✨ **Structure claire et organisée**  
✨ **Pas de doublons ou fichiers orphelins**  
✨ **Facile de naviguer et maintenir**  
✨ **Imports cohérents et prévisibles**
