# 🔐 Système d'Authentification et Comptes Utilisateurs

## 📋 Vue d'ensemble

Un **système complet de gestion de comptes utilisateurs** a été créé pour allow users to:
- ✅ Créer des comptes avec email/mot de passe
- ✅ Se connecter en sécurité
- ✅ Sauvegarder les trades dans leur compte
- ✅ Accéder aux trades de partout (persistance)
- ✅ Gérer leur profil et paramètres

## 🏗️ Architecture

### Backend (Express + SQLite)
```
Server Port: 5000

API Routes:
├── POST   /api/auth/register          → Créer compte
├── POST   /api/auth/login             → Se connecter
├── GET    /api/auth/me                → Info utilisateur
├── PUT    /api/auth/profile           → Modifier profil
├── POST   /api/auth/logout            → Se déconnecter
│
├── GET    /api/trades                 → Lister les trades
├── POST   /api/trades                 → Ajouter un trade
├── PUT    /api/trades/:id             → Modifier un trade
├── DELETE /api/trades/:id             → Supprimer un trade
├── POST   /api/trades/import          → Importer des trades
└── GET    /api/trades/stats/summary   → Statistiques
```

### Base de Données SQLite
```
data/
└── trades.db (créé automatiquement)

Tables:
├── users (id, email, username, password_hashedée)
├── trades (id, user_id, symbol, entry_price, exit_price, ...)
└── account_settings (id, user_id, broker, timezone, ...)
```

### Frontend (Next.js + React)
```
Components:
├── AuthModal.jsx           → Formulaire login/register
├── UserProfile.jsx         → Profil et paramètres
├── TradesManager.jsx       → CRUD trades + stats
└── DashboardNew.jsx        → Dashboard principal
```

## 🚀 Installation & Démarrage

### 1. Installer les dépendances
```bash
npm install
```

Nouvelles dépendances ajoutées:
- `bcryptjs` - Hash des mots de passe
- `jsonwebtoken` - JWT pour l'authentification
- `sqlite3` - Base de données locale

### 2. Configuration (.env)
```bash
# .env ou créé automatiquement
SERVER_PORT=5000
SESSION_SECRET=dev-secret-change-in-production
JWT_SECRET=your-jwt-secret-change-in-production
```

### 3. Démarrer l'application
```bash
npm run dev
```

Cela démarre:
- ✅ Next.js frontend sur http://localhost:3000
- ✅ Express backend sur http://localhost:5000

Après quelques secondes, vous verrez:
```
✅ Connected to SQLite database
✅ Users table ready
✅ Trades table ready
✅ Account settings table ready
🚀 Backend running on http://localhost:5000
```

## 📝 Flux d'Utilisation

### 1️⃣ Création de Compte
```
1. Page d'accueil → "Sign Up"
2. Remplir: Email, Username, Password, Confirm Password
3. Cliquer "Create Account"
4. Compte créé + automatiquement connecté
```

### 2️⃣ Connexion
```
1. Page d'accueil → "Login"
2. Entrer Email + Password
3. Accès au dashboard
```

### 3️⃣ Ajouter un Trade
```
1. Dashboard → "+ Add New Trade"
2. Remplir:
   - Symbol (ex: AAPL, ES)
   - Entry Price
   - Exit Price (optionnel)
   - Quantity
   - Entry Date
   - Exit Date (optionnel)
   - Trade Type (Long/Short)
   - Status (Open/Closed)
   - Notes
3. Cliquer "Save Trade"
4. Trade sauvegardé dans la BD
```

### 4️⃣ Voir les Trades
```
1. Dashboard affiche automatiquement:
   - Tous les trades de l'utilisateur
   - Statistiques (Total P&L, Win Rate, etc)
   - Filtrage par status/symbol
```

### 5️⃣ Modifier Profil
```
1. Cliquer sur profil (coin haut-droit)
2. "Edit Profile"
3. Modifier Username, Timezone, Broker
4. Cliquer "Save Changes"
```

## 🔒 Sécurité

### Authentification JWT
- Tokens générés à la connexion/création
- Durée: 7 jours
- Stockés dans localStorage (côté client)
- Envoyés dans Authorization header

### Hashage Mots de Passe
- Bcrypt avec 10 rounds de salt
- Jamais stockés en clair
- Vérification sécurisée à la connexion

### Isolation des Données
```javascript
// Les trades sont liés à l'utilisateur
SELECT * FROM trades WHERE user_id = ? AND id = ?
↑ Chaque utilisateur ne voit que ses trades
```

## 📊 Fichiers Créés/Modifiés

### Créés
```
lib/
├── database.js          → Connexion SQLite + helpers
└── authUtils.js         → Hash, JWT, tokens

api/
├── auth.js              → Routes authentification
└── trades.js            → Routes trades

components/
├── AuthModal.jsx        → Interface login/register
├── UserProfile.jsx      → Gestion profil
└── TradesManager.jsx    → Interface trades

.env.example             → Template variables d'env
```

### Modifiés
```
package.json             → Ajout dépendances
server.js               → Routes + DB initialization
app/page.tsx            → Integration auth
lib/useAuth.js          → Context React (nouveau)
```

## 💾 Structure Base de Données

### Table: users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,           -- bcrypt hashed
  created_at DATETIME,
  updated_at DATETIME
)
```

### Table: trades
```sql
CREATE TABLE trades (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,         -- Référence utilisateur
  symbol TEXT NOT NULL,
  entry_price REAL,
  exit_price REAL,
  quantity INTEGER,
  entry_date TEXT,
  exit_date TEXT,
  trade_type TEXT,                  -- 'long' or 'short'
  status TEXT,                       -- 'open', 'closed', 'cancelled'
  profit_loss REAL,
  notes TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### Table: account_settings
```sql
CREATE TABLE account_settings (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  broker TEXT,                       -- ex: 'Tradovate'
  account_number TEXT,
  timezone TEXT,
  notifications_enabled BOOLEAN,
  created_at DATETIME,
  updated_at DATETIME
)
```

## 🔄 Flux API Détaillé

### Création Compte
```
POST /api/auth/register
Body: { email, username, password, confirmPassword }
Response: { success, token, user }
```

### Connexion
```
POST /api/auth/login
Body: { email, password }
Response: { success, token, user }
```

### Récupérer Infos Utilisateur
```
GET /api/auth/me
Headers: { Authorization: "Bearer {token}" }
Response: { user, settings }
```

### Ajouter Trade
```
POST /api/trades
Headers: { Authorization: "Bearer {token}" }
Body: { symbol, entry_price, exit_price, quantity, entry_date, ... }
Response: { success, trade }
```

### Récupérer Tous les Trades
```
GET /api/trades?status=open&symbol=AAPL
Headers: { Authorization: "Bearer {token}" }
Response: { trades[], pagination }
```

### Importer Trades CSV
```
POST /api/trades/import
Headers: { Authorization: "Bearer {token}" }
Body: { trades: [{symbol, entry_price, ...}, ...] }
Response: { success, imported_count }
```

## 🎯 Cas d'Usage

### Trader A (Premier utilisateur)
```
1. Inscription: email@example.com / password123
2. Ajoute 5 trades AAPL, 3 trades ES
3. Ferme l'app et revient demain
4. Connexion: tous ses trades sont toujours là
5. Ajoute stats calculées automatiquement
```

### Trader B (Deuxième utilisateur)
```
1. Inscription: trader@example.com / password123
2. Voit son dashboard vide (ses données, pas celles de A)
3. Importe 10 trades depuis CSV
4. Peut les modifier/supprimer individuellement
5. Voit ses stats P&L, win rate, etc
```

## ⚙️ Fonctionnalités Avancées

### Filtrage
```javascript
GET /api/trades?status=closed&symbol=ES
→ Retourne seulement les trades fermés en ES
```

### Pagination
```javascript
GET /api/trades?page=2&limit=20
→ Page 2 avec 20 trades par page
```

### Statistiques
```javascript
GET /api/trades/stats/summary
Response: {
  total_trades: 15,
  closed_trades: 12,
  open_trades: 3,
  total_profit_loss: 1250.50,
  avg_profit_loss: 83.37,
  max_profit: 500,
  max_loss: -200
}
```

## 🐛 Débogage

### Vérifier la BD
```bash
# Voir les tables
sqlite3 data/trades.db ".tables"

# Voir les users
sqlite3 data/trades.db "SELECT * FROM users;"

# Voir les trades
sqlite3 data/trades.db "SELECT * FROM trades;"
```

### Logs côté Backend
```
✅ Connected to SQLite database
✅ Users table ready
❌ Register error: Email already exists
```

### Logs côté Frontend
```javascript
// Browser console
localStorage.getItem('authToken')     // Voir le token
localStorage.getItem('user')          // Voir les infos user
```

## 🚀 Prochaines Étapes (Optionnel)

1. **Import CSV**: Bouton pour importer trades depuis CSV
2. **Export**: Télécharger trades en CSV/Excel
3. **Graphiques**: Charts de performance
4. **Notifications**: Email alerts si P&L dépasse seuil
5. **Multi-broker**: Intégration API brokers réels
6. **Cloud Sync**: Sauvegarder dans le cloud (Firebase, etc)

## 📚 Ressources

- **SQLite Docs**: https://www.sqlite.org/
- **JWT**: https://jwt.io/
- **Bcrypt**: https://github.com/dcodeIO/bcrypt.js
- **Express Auth**: https://expressjs.com/

---

**Status**: ✅ Complètement fonctionnel
**Prêt pour**: Production (avec JWT_SECRET changé)
**Utilisateurs**: Illimité
**Trades par utilisateur**: Illimité
