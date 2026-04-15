# 🔐 Système de Connexion Google OAuth - Guide d'Installation

## ✅ Qu'est-ce qui a été créé?

Vous avez maintenant un **système complet de connexion sécurisée** avec Google OAuth:

### 📁 Fichiers créés

```
app/
├── login/page.tsx                 # Page de connexion Google
├── auth/callback/page.tsx         # Callback OAuth
├── dashboard/
│   ├── layout.tsx                 # Layout protégé du dashboard
│   └── page.tsx                   # Page d'accueil dashboard
└── api/user/profile/route.ts      # API protégée exemple

lib/auth/
├── supabaseAuthProvider.tsx       # Provider d'authentification
├── ProtectedRoute.tsx             # Composant de protection de routes
├── apiAuth.ts                     # Middleware pour les routes API
└── hooks.ts                       # Hooks personnalisés

components/
└── NavbarAuth.tsx                 # Barre de navigation avec déconnexion

supabase/
└── migration_auth_setup.sql       # Migration pour les tables utilisateurs

Configuration:
└── GOOGLE_OAUTH_SETUP.md          # Guide setup Google OAuth
```

---

## 🚀 Étapes pour démarrer

### 1️⃣ Configuration Supabase

1. **Clonez vos variables d'environnement**:
   ```bash
   cp .env.example .env.local
   ```

2. **Récupérez vos clés Supabase**:
   - Allez sur [app.supabase.com](https://app.supabase.com)
   - Sélectionnez votre projet
   - Allez dans **Settings** → **API**
   - Copiez:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

3. **Mettez à jour `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
   SUPABASE_SERVICE_ROLE_KEY=eyJh...
   ```

### 2️⃣ Configuration Google OAuth

Consultez [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) pour les instructions détaillées.

**Résumé rapide**:
1. Créez une application sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez des identifiants OAuth (Client ID + Secret)
3. Configurez dans Supabase Dashboard
4. Ajouter les URLs de redirection

### 3️⃣ Exécuter les migrations

```bash
# Allez sur Supabase SQL Editor et exécutez:
supabase/migration_auth_setup.sql
```

Cela crée:
- Table `profiles` (profils utilisateur)
- Table `user_settings` (préférences utilisateur)  
- RLS Policies (sécurité au niveau des données)

### 4️⃣ Démarrer l'application

```bash
npm install
npm run dev
```

Accédez à `http://localhost:3000/login`

---

## 🔄 Flux de connexion

```
User clicks "Se connecter avec Google"
         ↓
/login/page.tsx calls supabase.auth.signInWithOAuth()
         ↓
Redirect to Google OAuth page
         ↓
User confirms login
         ↓
Google redirects to /auth/callback
         ↓
/auth/callback/page.tsx exchanges code for session
         ↓
User redirected to /dashboard
         ↓
Dashboard protected by ProtectedRoute & AuthProvider
```

---

## 🛡️ Sécurité implémentée

✅ **Authentification**
- Google OAuth 2.0 sécurisé
- Tokens JWT gérés par Supabase
- Sessions persistantes

✅ **Protection des routes**
- Routes `/dashboard` protégées par `ProtectedRoute`
- Routes API protégées par `requireAuth()` middleware
- Redirection automatique vers login si non authentifié

✅ **Confidentialité des données**
- Row Level Security (RLS) sur toutes les tables
- Les utilisateurs ne voient que leurs propres données
- Contraintes FOREIGN KEY sur user_id

---

## 📝 Utilisation dans vos composants

### Utiliser useAuth()

```tsx
"use client";
import { useAuth } from "@/lib/auth/supabaseAuthProvider";

export function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) return <p>Not logged in</p>;
  
  return (
    <div>
      <p>Welcome {user?.email}</p>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

### Protéger une route

```tsx
"use client";
import { ProtectedRoute } from "@/lib/auth/ProtectedRoute";

export default function SecretPage() {
  return (
    <ProtectedRoute>
      <h1>Only logged in users can see this</h1>
    </ProtectedRoute>
  );
}
```

### Créer une API protégée

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/apiAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.error) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const { user } = auth;
  // Votre logique ici
  return NextResponse.json({ user });
}
```

---

## 🧪 Tester le système

1. **Allez sur** `http://localhost:3000/login`
2. **Cliquez** "Se connecter avec Google"
3. **Complétez** l'authentification Google
4. **Vous serez redirigé** vers `/dashboard`
5. **Pour déconnexion**, cliquez sur le menu utilisateur en haut à droite

---

## 📊 Vue d'ensemble architecturale

```
┌─────────────────────┐
│   React Frontend    │
│  (Client-side)      │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼────┐   ┌───▼─────────┐
│ Browser│   │  Supabase   │
│Session │   │   Client    │
└────────┘   └───┬─────────┘
                 │
            ┌────▼──────┐
            │  Supabase │
            │   Auth    │
            │ w/ Google │
            └────┬──────┘
                 │
            ┌────▼──────────┐
            │  PostgreSQL   │
            │  - profiles   │
            │  - trades     │
            │  - settings   │
            └───────────────┘
```

---

## 🐛 Troubleshooting

### "Provider not found"
- Vérifiez que Google est activé dans Supabase Dashboard Auth → Providers

### "Redirect URL not registered"
- Ajoutez `http://localhost:3000/auth/callback` dans Google OAuth settings

### "CORS error"
- Assurez-vous que `NEXT_PUBLIC_SUPABASE_URL` pointe vers votre projet Supabase

### Session perdue après refresh
- Les sessions sont stockées dans les cookies Supabase automatiquement

---

## 📚 Ressources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎯 Prochaines étapes

1. **Synchronisation des données CSV**
2. **Gestion des fichiers utilisateur** 
3. **Dashboard avec statistiques**
4. **Notifications en temps réel**

Prêt à continuer? 🚀
