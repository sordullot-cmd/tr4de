import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { tradovate } from "@/lib/brokers/tradovate";

/**
 * GET /api/brokers/tradovate/oauth?action=start
 *   → Redirige vers Tradovate OAuth (si client_id configuré)
 *
 * GET /api/brokers/tradovate/oauth?action=callback&code=...&state=...
 *   → Échange le code contre des tokens, les sauvegarde, redirige vers /dashboard
 *
 * Configuration requise (env vars):
 *   - NEXT_PUBLIC_TRADOVATE_CLIENT_ID  (utilisé pour build l'auth URL)
 *   - TRADOVATE_CLIENT_SECRET           (server-only, pour le token exchange)
 *
 * Stockage des tokens : Supabase user_broker_connections
 *   (table à créer; voir supabase/migrations/)
 *
 * Pour brancher d'autres brokers, dupliquer cette route.
 */

function redirectUriFor(req: NextRequest): string {
  const url = new URL(req.url);
  return `${url.origin}/api/brokers/tradovate/oauth?action=callback`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "start";

  if (action === "start") {
    const state = crypto.randomUUID();
    const authUrl = tradovate.buildAuthUrl?.(redirectUriFor(req), state);
    if (!authUrl) {
      return NextResponse.json(
        {
          error: "Tradovate OAuth non configuré",
          hint: "Définir NEXT_PUBLIC_TRADOVATE_CLIENT_ID dans les variables d'environnement.",
        },
        { status: 503 }
      );
    }
    // Stocker le state dans un cookie httpOnly pour le valider au callback
    const res = NextResponse.redirect(authUrl);
    res.cookies.set("tradovate_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
    });
    return res;
  }

  if (action === "callback") {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieState = req.cookies.get("tradovate_oauth_state")?.value;
    if (!code) {
      return NextResponse.json({ error: "Code manquant" }, { status: 400 });
    }
    if (!state || state !== cookieState) {
      return NextResponse.json({ error: "State invalide (CSRF)" }, { status: 400 });
    }
    try {
      const tokens = await tradovate.exchangeCode!(code, redirectUriFor(req));
      // TODO: persister les tokens dans Supabase user_broker_connections,
      //       associés à l'utilisateur courant. Pour l'instant on revient
      //       au dashboard avec un flag de succès dans l'URL.
      void tokens; // utilisé une fois la table Supabase prête
      const res = NextResponse.redirect(new URL("/dashboard?broker=tradovate&connected=1", req.url));
      res.cookies.delete("tradovate_oauth_state");
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.redirect(
        new URL(`/dashboard?broker=tradovate&error=${encodeURIComponent(msg)}`, req.url)
      );
    }
  }

  return NextResponse.json({ error: "action inconnue" }, { status: 400 });
}
