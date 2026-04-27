import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton browser client. createBrowserClient doit être appelé une seule fois
// par onglet : sinon le listener onAuthStateChange et le rafraîchissement
// automatique des tokens se réinitialisent à chaque rendu, ce qui peut
// déconnecter l'utilisateur de manière intermittente.
let _client: SupabaseClient | null = null;

export function createClient() {
  if (typeof window === "undefined") {
    // Côté serveur (SSR/SSG) : on retourne toujours un nouveau client,
    // un singleton n'aurait pas de sens entre requêtes.
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
