# APEX AI - Setup et Intégration

## 1. Installation des packages

```bash
npm install @supabase/supabase-js @supabase/ssr ai openai dotenv
```

## 2. Configuration Supabase

### 2.1 Créer les tables SQL

1. Va dans ton projet Supabase
2. Ouvre l'SQL editor
3. Copie le contenu du fichier `supabase/schema.sql`
4. Exécute le script
5. Active pgvector: `CREATE EXTENSION IF NOT EXISTS vector;`

### 2.2 Créer un Storage Bucket

1. Va dans Storage
2. Crée un nouveau bucket nommé `trade_screenshots`
3. Rends-le public

### 2.3 Créer une fonction RLS pour la recherche sémantique

```sql
CREATE OR REPLACE FUNCTION search_trades_by_embedding(
  query_embedding VECTOR(1536),
  user_id_param UUID,
  match_count INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  trade_id UUID,
  user_id UUID,
  content TEXT,
  embedding VECTOR(1536),
  similarity FLOAT8,
  trades JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
    te.trade_id,
    te.user_id,
    te.content,
    te.embedding,
    1 - (te.embedding <=> query_embedding) as similarity,
    row_to_json(t.*) as trades
  FROM trade_embeddings te
  JOIN trades t ON te.trade_id = t.id
  WHERE te.user_id = user_id_param
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

## 3. Configuration des variables d'environnement

1. Copie le contenu de `.env.local.example` dans un nouveau fichier `.env.local`
2. Remplis les variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL de ton projet Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clé anonyme (publique)
   - `SUPABASE_SERVICE_ROLE_KEY`: Clé service role
   - `OPENAI_API_KEY`: Ta clé API OpenAI

## 4. Intégration dans Agentia

La page Agentia utilise maintenant:
- **ApexChat.tsx**: Interface de chat principal
- **AgentNotifications.tsx**: Système de notifications
- **TradeForm.tsx**: Formulaire avancé pour ajouter des trades

## 5. Utilisation

### Ajouter un trade avec analyse IA

1. Va sur la page "Ajouter des Trades"
2. Utilise le formulaire TradeForm pour:
   - Renseigner les détails du trade (prix, quantité, etc.)
   - Ajouter tes notes personnelles
   - Tracker tes émotions
   - Uploader une capture d'écran
   - Évaluer la qualité du trade
3. En soumettant:
   - Le trade est sauvegardé dans Supabase
   - Un vecteur d'embedding est créé pour recherche sémantique
   - L'IA analyse automatiquement pour détecter:
     - Revenge trading
     - Overtrading
     - Revenge sizing
     - Problèmes psychologiques
   - Une notification est générée si des alertes sont détectées

### Discuter avec Apex AI

1. Va sur la page "Agent IA"
2. Pose une question sur tes trades
3. L'IA:
   - Cherche les trades similaires
   - Récupère tes statistiques globales
   - Répond en français avec des conseils basés sur TES données réelles
   - Peut utiliser les outils pour analyser patterns, vérifier le risque, etc.

## 6. Outils disponibles pour l'IA

### analyzePatterns
Analyse les patterns dans tes trades historiques:
- Win rate par heure
- Performance par setup
- Séquences de pertes
- Corrélations émotions/P&L

### monitorPsychology
Détecte les dérapages psychologiques:
- Revenge trading
- Overtrading
- Revenge sizing
- Émotions stressantes

### checkRisk
Vérifie les limites de risque:
- P&L du jour vs limite
- Drawdown courant
- Taille des positions

### getTrades
Récupère les trades avec filtres:
- Par date
- Par symbole
- Par direction
- Par setup

### saveNotification
Sauvegarde les alertes de l'IA pour affichage dans l'interface

## 7. Structure des données

### Trades
- Symbole, direction, prix entry/exit
- Quantité, P&L calculé automatiquement
- Setup utilisé, type de sortie
- Durée du trade

### Trade Details (Subjectif)
- Notes écrites à la main
- Emotions taguées
- Score de qualité
- Screenshot du graphique

### Trade Embeddings (Vectorized)
- Texte sérialisé du trade
- Vecteur pgvector (1536 dimensions)
- Indexé pour recherche rapide

### Agent Notifications
- Type: INFO, WARNING, STOP, REPORT
- Timestamp et statut de lecture
- Liées aux trades pour contexte

## 8. Flux d'analyse complète

```
1. Utilisateur ajoute un trade
   ↓
2. TradeForm valide et envoie les données
   ↓
3. Supabase sauvegarde le trade + détails
   ↓
4. /api/ai/analyze-trade est appelée
   ↓
5. L'embedding est créé et stocké
   ↓
6. monitorPsychology et checkRisk sont lancés
   ↓
7. Si alertes détectées, GPT génère une notification
   ↓
8. Notification s'affiche avec badge dans AgentNotifications
   ↓
9. Utilisateur peut lire la notification et cliquer pour plus de détails
```

## 9. Personnalisation

### Ajouter plus de tags d'émotions
Modifie `emotionTags` dans `TradeForm.tsx`

### Changer les limites de risque
Modifie les seuils dans `lib/ai/agent.ts`:
- `dailyLimit` (défaut 500$)
- `OVERTRADING_THRESHOLD` (défaut 3 trades/heure)
- etc.

### Ajuster la sensibilité des alertes
Modifie les conditions dans `monitorPsychology`:
- Fenêtre de temps pour le revenge trading
- Multiplicateur pour revenge sizing
- etc.

## 10. Troubleshooting

### "Authentication required"
- Vérifie que tu es connecté via Supabase Auth
- Vérifie dans `supabase.auth.getUser()` qu'il y a un utilisateur

### "Embedding creation failed"
- Vérifie ta clé OpenAI
- Vérifie que le modèle `text-embedding-3-small` est accessible
- Vérifie la table `trade_embeddings` existe

### "No similar trades found"
- C'est normal si tu n'as pas d'embeddings encore
- Ajoute plusieurs trades et attends que les embeddings se créent
- La recherche s'améliore avec plus de données

### Les notifications ne s'affichent pas
- Vérifie que les politiques RLS sont correctes
- Vérifie que `agent_notifications` a les bonnes permissions pour l'utilisateur
- Regarde la console pour les erreurs

## 11. Démonstration

Flux complet exemple:
1. Ajoute un trade where tu as pris une position trop grande après une perte (revenge sizing)
2. Tague l'émotion "Revenge"
3. L'IA détecte le revenge sizing et te génère une alerte
4. Une notification 🛑 STOP s'affiche
5. Va au chat, demande "Pourquoi j'ai revenge trade?"
6. L'IA répond en français avec tes stats réelles et des conseils

Bonne chance! 🚀
