# 🚀 Vantage MT5 Integration Guide

## Architecture

Pour connecter **MetaTrader 5 (Vantage)** à votre site :

```
┌─────────────────┐       ┌──────────────────┐
│   Frontend      │       │  Node.js Backend │
│   React/Next    │◄─────►│  (Express)       │
└─────────────────┘       │  Port 5000       │
                          └──────────────────┘
                                  ▲
                                  │
                                  │ (HTTP)
                                  ▼
                          ┌──────────────────┐
                          │ Python API       │
                          │ (Flask)          │
                          │ Port 5001        │
                          └──────────────────┘
                                  │
                                  │
                                  ▼
                        ┌──────────────────────┐
                        │ MetaTrader 5         │
                        │ (Running on your PC) │
                        │ Vantage Account      │
                        └──────────────────────┘
```

## Installation

### Étape 1 : Installer Python (si pas déjà fait)

1. Téléchargez Python depuis https://www.python.org/downloads/
2. Assurez-vous de cocher **"Add Python to PATH"** pendant l'installation
3. Vérifiez :
   ```bash
   python --version
   pip --version
   ```

### Étape 2 : Installer les packages Python

```bash
pip install MetaTrader5 flask flask-cors
```

Ou simplement cliquez sur `start-mt5-api.bat` (Windows) qui les installe automatiquement.

### Étape 3 : Lancer le serveur MT5

#### Windows :
Double-cliquez sur **`start-mt5-api.bat`**

ou en ligne de commande :
```bash
python mt5_api.py
```

#### Mac/Linux :
```bash
python3 mt5_api.py
```

**Important** : Gardez ce terminal ouvert ! C'est votre serveur Python qui communique avec MT5.

### Étape 4 : Lancer le backend + frontend

Dans un autre terminal :
```bash
npm run dev
```

Cela lance :
- Frontend: http://localhost:3000
- Backend Express: http://localhost:5000

### Étape 5 : Connecter depuis le site

1. Ouvrez http://localhost:3000
2. Cliquez **"⚡ Connect Broker"**
3. Sélectionnez **"Vantage MT5 (Forex/CFD)"**
4. Cliquez **Connect**

✅ Une fois connecté, vos **vrais trades MT5** apparaîtront !

---

## Architecture en détail

### 1. **Frontend (React/Next.js)**
- `components/BrokerLoginModal.jsx` - Modal de connexion
- Supporte maintenant Tradovate ET Vantage MT5
- API calls vers le backend Express

### 2. **Backend (Express.js)**
- `server.js` - Serveur principal
- `lib/brokers/vantage.js` - Client Vantage qui appelle la Python API
- `lib/auth.js` - Routes d'authentification

### 3. **API Python (Flask)**
- `mt5_api.py` - Serveur qui communique directement avec MetaTrader 5
- Récupère les trades, positions, infos compte
- Même port 5001 par défaut

---

## API Endpoints

**Health Check:**
```
GET http://localhost:5001/api/health
```

**Vantage/MT5:**
```
POST   http://localhost:5001/api/mt5/connect       ← Connecter à MT5
POST   http://localhost:5001/api/mt5/disconnect    ← Déconnecter
GET    http://localhost:5001/api/mt5/account       ← Infos compte
GET    http://localhost:5001/api/mt5/trades        ← Vos trades ⭐
GET    http://localhost:5001/api/mt5/positions     ← Positions ouvertes
GET    http://localhost:5001/api/mt5/symbols       ← Symboles disponibles
GET    http://localhost:5001/api/mt5/stats         ← Statistics
```

---

## Troubleshooting

### "Connection failed - ensure MT5 is open"
- Vérifiez que **MetaTrader 5 est ouvert**
- Vérifiez que vous êtes **connecté à votre compte Vantage**
- Relancez le serveur Python (`start-mt5-api.bat`)

### "Cannot find module MetaTrader5"
```bash
pip install MetaTrader5
```

### Port 5001 déjà en utilisation
Modifiez dans `mt5_api.py` (dernière ligne) :
```python
app.run(host='localhost', port=5002, debug=False)  # Changez le port
```

### Python non trouvé
- Vérifiez que Python est installation dans PATH :
  ```bash
  where python       # Windows
  which python       # Mac/Linux
  ```
- Si absent, réinstallez Python avec "Add to PATH"

### Les données ne se mettent pas à jour
- C'est normal ! Actuarialisez manuellement via le bouton dans le dashboard
- Pour les updates en temps réel, il faudrait ajouter WebSocket (version future)

---

## Fichiers créés/modifiés

```
├── mt5_api.py                      ← Serveur Python Flask
├── start-mt5-api.bat               ← Lanceur facile (Windows)
├── lib/brokers/
│   ├── vantage.js                 ← Client Vantage (Express)
│   └── index.js                   ← Routes mises à jour
├── components/
│   └── BrokerLoginModal.jsx        ← Modal avec support MT5
└── app/components/
    └── Dashboard.jsx              ← Dashboard adapté
```

---

## Sécurité

✅ **MT5 ne communique que localement** - Pas d'exposition sur internet  
✅ **Données stockées en session** - Pas de persistance sur disque  
✅ **Architecture 3-tier** - Séparation des responsabilités

---

## Prochaines améliorations

- [ ] WebSocket pour updates temps réel
- [ ] Historique détaillé des trades
- [ ] Graphiques avec vraies données
- [ ] Alertes pour nouveaux trades
- [ ] Export CSV des données MT5
- [ ] Support Android/iOS via API

---

## Support brokers

| Broker | Statut | Type |
|--------|--------|------|
| Tradovate | ✅ | Futures |
| Vantage (MT5) | ✅ | Forex/CFD |
| Alpaca | ⏳ Planifié | Actions |
| Interactive Brokers | ⏳ Planifié | Stocks/Futures |

---

**🎉 Vous pouvez maintenant utiliser vos vrais trades MT5 !**

Besoin d'aide ? Consultez cet article : https://www.mql5.com/en/docs/python_docs
