# 🚀 ApexTrader - Complete Setup Guide (Tradovate + Vantage MT5)

## Overview

Votre application supporte maintenant **2 brokers** :
- ✅ **Tradovate** (Futures) - via API Node.js
- ✅ **Vantage MT5** (Forex/CFD) - via API Python

```
Frontend (React)
    ↓
Backend Express (Node.js)
    ├→ Tradovate API
    └→ Python API
        └→ MetaTrader 5
```

---

## Quick Start (5 minutes)

### 1️⃣ Démarrer le backend Express + frontend
```bash
npm run dev
```

**Outputs:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

### 2️⃣ Si vous utilisez **Vantage MT5** : Lancer le serveur Python
Dans un **nouveau terminal** :

**Windows:**
```bash
double-click start-mt5-api.bat
```

**macOS/Linux:**
```bash
python3 mt5_api.py
```

**Important:** Gardez ce terminal ouvert !

### 3️⃣ Connecter votre broker

Ouvrez http://localhost:3000 et cliquez **"⚡ Connect Broker"**

---

## 📋 Setup détaillé

### **Option A: Tradovate Futures**

#### Prérequis
- Compte Tradovate actif
- API credentials générés

#### Configuration
1. Cliquez **"⚡ Connect Broker"** → **Tradovate**
2. Remplissez :
   - **API Key**: De votre compte Tradovate
   - **API Secret**: De votre compte Tradovate
   - **Account ID**: ID de votre compte
3. Cliquez **Connect**

✅ Vos trades Tradovate apparaîtront instantanément !

---

### **Option B: Vantage MT5 (Forex/CFD)**

#### Prérequis
1. **MetaTrader 5 installé** sur votre ordinateur
2. **Compte Vantage** connecté dans MT5
3. **Python 3.7+** installé

#### Step 1: Installer Python

Si Python n'est pas installé :
1. Téléchargez de https://www.python.org/downloads/
2. **✓ Check "Add Python to PATH"** pendant l'install
3. Vérifiez: `python --version`

#### Step 2: Installer les packages
```bash
pip install MetaTrader5 flask flask-cors
```

Ou laissez le `.bat` faire :
```bash
double-click start-mt5-api.bat
```

#### Step 3: Lancer le serveur Python
**Windows:**
```bash
start-mt5-api.bat
```

**Mac/Linux:**
```bash
python3 mt5_api.py
```

Vous devriez voir :
```
 * Running on http://localhost:5001
```

#### Step 4: Connecter depuis l'app
1. Cliquez **"⚡ Connect Broker"** → **Vantage MT5**
2. Cliquez **Connect** (pas de credentials nécessaires)

✅ Vos trades MT5 chargeront automatiquement !

---

## 🔄 Architecture Technique

### Frontend (React/Next.js)
- [components/BrokerLoginModal.jsx](components/BrokerLoginModal.jsx) - Modal de connexion bilingual (Tradovate/MT5)
- [app/components/Dashboard.jsx](app/components/Dashboard.jsx) - Affiche données réelles selon broker

### Backend (Express.js)
- [server.js](server.js) - Serveur principal
- [lib/auth.js](lib/auth.js) - Routes d'authentification
- [lib/brokers/tradovate.js](lib/brokers/tradovate.js) - Client Tradovate
- [lib/brokers/vantage.js](lib/brokers/vantage.js) - Client Vantage (appelle Python API)

### API Python (Flask)
- [mt5_api.py](mt5_api.py) - Serveur qui communique directement avec MT5
- Ports: Python=5001, Express=5000, Frontend=3000

---

## 🌐 API Endpoints

### Express Backend (Port 5000)

**Brokers:**
```
GET    /api/brokers                    ← Liste brokers support
POST   /api/brokers/tradovate/connect  ← Connecter Tradovate
GET    /api/brokers/tradovate/trades   ← Trades Tradovate
POST   /api/brokers/vantage/connect    ← Connecter Vantage
GET    /api/brokers/vantage/trades     ← Trades MT5
```

**Auth:**
```
POST   /api/auth/connect
POST   /api/auth/disconnect
GET    /api/auth/status
```

### Python API (Port 5001)

**MT5:**
```
GET    /api/health                     ← Health check
POST   /api/mt5/connect                ← Connecter MT5
GET    /api/mt5/account                ← Infos compte
GET    /api/mt5/trades                 ← Tous les trades
GET    /api/mt5/positions              ← Positions ouvertes
GET    /api/mt5/symbols                ← Symboles disponibles
GET    /api/mt5/stats                  ← Statistiques
```

---

## 🔒 Sécurité

| Aspect | ✅ Implémenté |
|--------|:---:|
| API Keys jamais dans le navigateur | ✅ |
| Stockage serveur seulement | ✅ |
| Sessions sécurisées (httpOnly) | ✅ |
| MT5 en communication locale | ✅ |
| `.env.local` dans .gitignore | ✅ |

---

## 🐛 Troubleshooting

### Problem: "Failed to connect to MetaTrader 5"
**Solutions:**
- ✅ MetaTrader 5 est ouvert ?
- ✅ Vous êtes connecté à votre compte Vantage ?
- ✅ Le serveur Python tourne ? (`start-mt5-api.bat`)

### Problem: "Cannot find module MetaTrader5"
```bash
pip install MetaTrader5 flask flask-cors
```

### Problem: Port déjà en utilisation
- **Express (5000):** Modifiez `package.json` → `"server": "SERVER_PORT=5001 node server.js"`
- **Python (5001):** Modifiez `mt5_api.py` dernière ligne → `.run(..., port=5002)`

### Problem: Python non trouvé
```bash
where python          # Windows
which python3         # Mac/Linux
```
Si absent, réinstallez Python + cochez "Add to PATH"

---

## 📁 Fichiers Guide

| File | Purpose |
|------|---------|
| [QUICK_START.md](QUICK_START.md) | Setup rapide Tradovate |
| [VANTAGE_MT5_SETUP.md](VANTAGE_MT5_SETUP.md) | Setup détaillé MT5 |
| [BROKER_SETUP.md](BROKER_SETUP.md) | Docs architecture |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Diagrammes techniques |

---

## ✨ Fonctionnalités

### Dashboard
- ✅ Affiche vrais trades (Tradovate ou MT5)
- ✅ Stats en temps réel (win rate, profit factor, etc.)
- ✅ Graphiques avec données réelles
- ✅ Historique des trades
- ✅ Positions ouvertes (MT5)

### Multi-broker
- ✅ Connecter un seul broker à la fois
- ✅ Switch facile entre brokers
- ✅ Disconnect/reconnect instantané

---

## 🚀 Roadmap Futur

- [ ] WebSocket pour updates temps réel
- [ ] Support Alpaca (Actions US)
- [ ] Support Interactive Brokers
- [ ] Mobile app (React Native)
- [ ] Export PDF des statements
- [ ] Alerts sur nouveaux trades
- [ ] Base de données pour historique

---

## ❓ FAQs

**Q: Puis-je utiliser les 2 brokers en même temps ?**  
A: Non, vous devez vous connecter à un seul à la fois (pour cette version)

**Q: Mon compte MT5 n'apparaît pas ?**  
A: Vérifiez que vous êtes connecté à votre compte Vantage dans MT5 et que le serveur Python tourne.

**Q: Puis-je migrer mes données ?**  
A: Oui, exportez depuis le dashboard (feature en cours)

**Q: Comment ajouter un autre broker ?**  
A: Créez `lib/brokers/[nom].js` et suivez le pattern de `vantage.js`

---

## 📖 Ressources

- [MetaTrader 5 Python API](https://www.mql5.com/en/docs/python_docs)
- [Tradovate API Documentation](https://tradovate.github.io/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Express.js Guide](https://expressjs.com/)

---

**Version: 1.0 - Full Stack Broker Integration**

---

**🎉 You're all set up! Start trading !**
