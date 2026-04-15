# 🔐 Configuration Google OAuth avec Supabase

## Étapes pour configurer la connexion Google

### 1️⃣ Créer une application Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un existant
3. Recherchez "OAuth 2.0" et cliquez sur "Consentement utilisateur OAuth"
4. Configurez l'écran de consentement:
   - Type: External
   - Remplissez les informations (App name, user support email, etc.)
5. Sauvegardez

### 2️⃣ Créer les identifiants OAuth

1. Allez dans **Identifiants** (Credentials)
2. Cliquez sur **Créer des identifiants** → **ID client OAuth**
3. Choisissez **Application Web**
4. Remplissez:
   - **Nom**: Apex Trader
   - **URI autorisés JavaScript**: 
     ```
     http://localhost:3000
     https://your-domain.com
     ```
   - **URI de redirection autorisées**:
     ```
     https://YOUR_PROJECT.supabase.co/auth/v1/callback?provider=google
     ```
5. Copiez le **Client ID** et le **Client Secret**

### 3️⃣ Configurer dans Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **Providers**
4. Cliquez sur **Google**
5. Activez le provider
6. Collez vos **Client ID** et **Client Secret**
7. Sauvegardez

### 4️⃣ Configuration locale (.env)

```bash
# Récupérez ces valeurs de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5️⃣ URL de redirection pour production

Une fois déployé, ajoutez l'URL de production dans Google Cloud Console et Supabase:

- Google Cloud: `https://your-domain.com`
- Supabase: `https://your-domain.supabase.co/auth/v1/callback?provider=google`

---

## 🚀 Utilisation

Après configuration, les utilisateurs peuvent se connecter simplement en cliquant sur "Se connecter avec Google" sur la page de login.

### Flux de connexion:

1. Utilisateur clique "Se connecter avec Google"
2. Redirection vers Google pour l'authentification
3. Retour à `/auth/callback` après confirmation
4. Création automatique du profil utilisateur
5. Redirection vers `/dashboard`

---

## 🔒 Sécurité

- Les sessions sont gérées par Supabase Auth
- Les tokens JWT sont stockés de façon sécurisée
- Row Level Security (RLS) protège les données par utilisateur
- Tous les appels API sont authentifiés

---

## 📝 Notes importantes

- **Localhost**: Google OAuth fonctionne sur `localhost` pour le développement
- **HTTPS obligatoire**: Pour la production, HTTPS est obligatoire
- **Confidentialité**: Les données des utilisateurs sont isolées avec RLS
