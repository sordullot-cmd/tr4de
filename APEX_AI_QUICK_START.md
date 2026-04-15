# 🚀 APEX AI - Guide de Déploiement Complet

## ✅ Fichiers créés / modifiés

### 1. **Base de données (SQL)**
📁 `supabase/schema.sql` - Schéma complet Supabase
- ✅ 4 tables: trades, trade_details, trade_embeddings, agent_notifications
- ✅ pgvector activé pour embeddings
- ✅ Index IVFFlat pour recherche rapide
- ✅ Politiques RLS (Row Level Security)

### 2. **Librairies Supabase**
📁 `lib/supabase/server.ts` - Client serveur (SSR)
📁 `lib/supabase/client.ts` - Client navigateur

### 3. **Librairies IA**
📁 `lib/ai/embeddings.ts`
- `serializeTrade()` - Converte trade en texte pour IA
- `createAndStoreEmbedding()` - Crée vecteur + stocke
- `searchSimilarTrades()` - Recherche sémantique cosinus

📁 `lib/ai/context.ts`
- `getUserStats()` - Calcule stats utilisateur
- `buildSystemPrompt()` - Crée prompt système pour IA
- `buildContextBlock()` - Injecte trades contextes

📁 `lib/ai/agent.ts`
- 5 outils pour l'agent:
  - `analyzePatterns` - Patterns de trading
  - `monitorPsychology` - Détecte dérapages psycho
  - `checkRisk` - Vérifie limites risque
  - `getTrades` - Récupère trades avec filtres
  - `saveNotification` - Génère alertes

### 4. **Routes API**
📁 `app/api/ai/chat/route.ts` - Chat streaming avec GPT-4o
📁 `app/api/ai/analyze-trade/route.ts` - Analyse auto des trades

### 5. **Composants React**
📁 `components/ApexChat.tsx` - Interface chat
📁 `components/AgentNotifications.tsx` - Système notifications
📁 `components/TradeForm.tsx` - Formulaire avancé trades
📁 `components/Agentia.jsx` - **MODIFIÉ** - Page Agent IA complète

### 6. **Configuration**
📁 `.env.local.example` - Variables d'environnement
📁 `APEX_AI_SETUP.md` - Guide détaillé d'installation

---

## ⚙️ Prochaines étapes (checklist)

### Phase 1: Configuration Supabase

- [ ] **Créer projet Supabase** ou utiliser existant
- [ ] **Coper/exécuter schema.sql** dans SQL editor
- [ ] **Activer pgvector extension**
- [ ] **Créer bucket Storage** `trade_screenshots`
- [ ] **Créer fonction SQL** pour recherche sémantique (voir APEX_AI_SETUP.md)
- [ ] **Récupérer credentials:**
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY

### Phase 2: Configuration OpenAI

- [ ] **Créer compte OpenAI** (si pas déjà)
- [ ] **Générer OPENAI_API_KEY**
- [ ] **Vérifier accès à:**
  - [ ] `gpt-4o` (chat)
  - [ ] `text-embedding-3-small` (embeddings)

### Phase 3: Installation packages

```bash
npm install @supabase/supabase-js @supabase/ssr ai openai
```

### Phase 4: Variables d'environnement

1. Créer `.env.local` à la racine:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-proj-...
```

### Phase 5: Tests

- [ ] Aller sur page "Agent IA"
- [ ] Vérifier 3 onglets: Chat, Ajouter Trade, Notifications
- [ ] Ajouter un trade:
  - [ ] Remplir forme basique (symbole, prix, etc.)
  - [ ] Ajouter notes subjectives
  - [ ] Tagger émotions
  - [ ] Upload screenshot
  - [ ] Vérifier que trade est sauvegardé
- [ ] Vérifier que notification s'affiche (si alertes détectées)
- [ ] Discuter avec Apex AI:
  - [ ] Poser question sur trades
  - [ ] Vérifier que l'IA utilise des outils
  - [ ] Vérifier que réponse est en français

### Phase 6: Intégration avec existant

- [ ] Tester que le reste du site fonctionne
- [ ] **Les trades de DashboardNew ne sont pas automatiquement dans Supabase** - à intégrer manuellement ou via migration
- [ ] La page Agentia est maintenant le hub principal pour l'IA

---

## 📊 Architecture Apex AI

```
                    ┌─────────────────────┐
                    │    User Interface   │
                    │   (Agentia.jsx)     │
                    └──┬────────┬────────┬┘
                       │        │        │
        ┌──────────────┘        │        └──────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
   ┌─────────┐          ┌───────────┐          ┌──────────────┐
   │ApexChat │          │TradeForm  │          │Notifications │
   │(Chat)   │          │(Ajouter)  │          │(Alertes)     │
   └────┬────┘          └─────┬─────┘          └──────┬───────┘
        │                     │                       │
        └─────────────────┬───┴───────────────────────┘
                          │
              ┌───────────┴──────────────┐
              │   API Routes            │
              └───┬──────────┬──────────┬┘
                  │          │          │
            ┌─────▼─┐  ┌─────▼───┐  ┌──▼────────────┐
            │/chat  │  │/analyze │  │Supabase       │
            │       │  │-trade   │  │Client         │
            └─────┬─┘  └────┬────┘  └──┬────────────┘
                  │         │          │
        ┌─────────┴────┬────┴──────────┤
        │              │               │
        ▼              ▼               ▼
    ┌────────┐  ┌──────────┐  ┌──────────────┐
    │GPT-4o  │  │OpenAI    │  │Supabase DB   │
    │        │  │Embeddings│  │(PostgreSQL)  │
    └────────┘  └──────────┘  └──────────────┘
                                   │
                            ┌──────┴──────┐
                            │              │
                        ┌───▼──┐      ┌───▼────┐
                        │Trades│      │Vectors │
                        │      │      │(pgv)   │
                        └──────┘      └────────┘
```

---

## 🎯 Cas d'usage

### 1️⃣ Trader ajoute un trade
```
Trader remplit TradeForm
    ↓
Sauvegardé dans trades + trade_details
    ↓
/api/ai/analyze-trade est appelée
    ↓
Embedding créé (serializeTrade → OpenAI)
    ↓
monitorPsychology détecte problèmes
    ↓
Si alertes → GPT génère notification
    ↓
Notification s'affiche avec badge 🔔
```

### 2️⃣ Trader pose question à Apex AI
```
Trader: "Pourquoi j'ai perdu hier?"
    ↓
searchSimilarTrades cherche trades similaires
    ↓
getUserStats récupère stats globales
    ↓
buildSystemPrompt + buildContextBlock
    ↓
GPT-4o stream répond en français
    ↓
Apex AI peut utiliser les 5 outils pour creuser
```

### 3️⃣ Trader vérifier limitations
```
Via onglet "Notifications":
    ↓
Voir tous les alertes générées
    ↓
Clicker sur une alerte
    ↓
Voir détails + contexte
    ↓
Marquer comme lue
```

---

## 🔐 Sécurité

### Row Level Security (RLS)
- Chaque utilisateur ne voit que ses trades
- Les embeddings sont filtrés par user_id
- Les notifications sont personnelles

### Authentification
- Vérifié via `supabase.auth.getUser()` dans API routes
- Si pas authentifié → erreur 401

### Données sensibles
- Clés API ne sont pas exposées en frontend
- Service role key uniquement côté serveur
- Anon key pour utilisateurs authentifiés

---

## 📈 Scaling et Performance

### Pour + de données:
- Index IVFFlat optimisé pour 1000+ embeddings
- Recherche cosinus rapide même avec beaucoup de trades
- Polling intelligent (30sec) pour notifications

### Pour + d'utilisateurs:
- RLS garantit isolation
- Supabase auto-scale
- OpenAI SDK gère rate limits

---

## 🐛 Dépannage courant

### "Module not found: @supabase/supabase-js"
→ `npm install @supabase/supabase-js @supabase/ssr ai openai`

### "Embedding creation failed"
→ Vérifie OPENAI_API_KEY dans .env.local

### "No similar trades found"
→ Normal si c'est la première fois - attends que des trades soient ajoutés

### "RLS policy denies access"
→ Vérifie que les politiques SQL sont correctes dans schema.sql

### "userId is null"
→ Utilisateur pas authentifié - vérifie Supabase Auth

---

## 🎓 Comment ça marche en détail

### Embddings (Recherche sémantique)
```
Trade original:
  "Trade LONG sur NQ, pris en FOMO après une perte"
  
      ↓ serializeTrade()
      
Texte enrichi:
  "Trade LONG sur NQ à 20000. Entry 20050, Exit...
   Émotions: FOMO. Setup: Breakout. Notes: J'ai panique..."
   
      ↓ OpenAI text-embedding-3-small
      
Vecteur (1536 dimensions):
  [0.123, -0.456, 0.789, ..., 0.321]
      
      ↓ Stocké dans trade_embeddings
      
Requête utilisateur:
  "Pourquoi j'ai FOMO trade?"
  
      ↓ Vectorisée aussi
      
Similarité cosinus trouvée!
  → Récupère le trade original avec contexte
```

### Système Notifications
```
Trader ajoute trade avec revenge sizing
      ↓
monitorPsychology détecte:
  - Position 2x plus grande après perte
  
      ↓
checkRisk détecte:
  - Dépassement daily loss limit
  
      ↓
Alertes compilées + envoyées à GPT
  → "🛑 Revenge sizing DANGEREUX. Stop et respire."
  
      ↓
saveNotification insert en DB
  
      ↓
Badge 🔔 apparaît dans header
  
      ↓
Trader clique → Voit notification
```

---

## 📚 Documentation référence

- [Supabase Docs](https://supabase.com/docs)
- [pgvector Usage](https://github.com/pgvector/pgvector)
- [OpenAI API](https://platform.openai.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai)

---

## ✨ Prochaines améliorations possibles

- [ ] Backtest automatique des règles avec IA
- [ ] Export analyis en PDF
- [ ] Intégration broker en direct (MT5 API)
- [ ] Voix pour dictée notes
- [ ] Personnalisation des seuils d'alerte par utilisateur
- [ ] Dashboard analytics avancée
- [ ] Sharing de trades avec mentor
- [ ] Machine learning sur patterns détectés

---

## 🚀 Lancement!

Une fois setup complet:

1. Va sur sidebar → 🤖 Agent IA
2. Clique "Ajouter un Trade"
3. Remplis le formulaire
4. Apex AI analyse automatiquement
5. Regarde onglet "Chat" et pose des questions
6. Vérifi onglet "Notifications"

**L'IA apprend de tes vraies données en temps réel!**

Bonne chance! 🎯
