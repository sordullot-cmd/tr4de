import type { BrokerAdapter, BrokerTokens } from "@/lib/brokers/types";
import type { ParsedTrade } from "@/lib/types/trade";
import { parseTradovateCSV } from "@/lib/csvParsers";

/**
 * Tradovate adapter.
 *
 * Modes:
 *  - File import (CSV) : opérationnel, branché sur parseTradovateCSV.
 *  - API sync (OAuth)  : skeleton — nécessite les variables d'environnement
 *                        TRADOVATE_CLIENT_ID, TRADOVATE_CLIENT_SECRET côté
 *                        serveur. Sans ces vars, buildAuthUrl renvoie null.
 *
 * Tradovate Live API base URL: https://live.tradovateapi.com/v1
 * Tradovate Demo API base URL: https://demo.tradovateapi.com/v1
 *
 * Voir: https://api.tradovate.com/
 */

const AUTH_URL = "https://trader.tradovate.com/oauth";
const TOKEN_URL = "https://live.tradovateapi.com/v1/auth/oauthtoken";

export const tradovate: BrokerAdapter = {
  meta: {
    id: "tradovate",
    name: "Tradovate",
    description: "Futures broker (NinjaTrader / Rithmic compatible). Sync via Performance > Orders export.",
    features: {
      fileImport: true,
      apiSync: true,
    },
    docsUrl: "https://api.tradovate.com/",
    color: "#1E40AF",
    initial: "T",
  },

  parseFile(content: string): ParsedTrade[] {
    return parseTradovateCSV(content);
  },

  buildAuthUrl(redirectUri: string, state: string): string | null {
    const clientId = process.env.NEXT_PUBLIC_TRADOVATE_CLIENT_ID;
    if (!clientId) return null;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: "trading", // Tradovate scopes: trading, marketData
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode(code: string, redirectUri: string): Promise<BrokerTokens> {
    const clientId = process.env.TRADOVATE_CLIENT_ID;
    const clientSecret = process.env.TRADOVATE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("TRADOVATE_CLIENT_ID / TRADOVATE_CLIENT_SECRET not configured");
    }
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Tradovate token exchange failed: ${res.status} ${txt}`);
    }
    const data = await res.json();
    return {
      accessToken: data.accessToken || data.access_token,
      refreshToken: data.refreshToken || data.refresh_token,
      expiresAt: data.expirationTime || null,
      raw: data,
    };
  },

  async syncTrades(tokens: BrokerTokens, since?: Date): Promise<ParsedTrade[]> {
    // Tradovate REST: GET /order/list (then map to ParsedTrade structure)
    // This is a SKELETON; the full mapping logic to convert Tradovate orders
    // into ParsedTrade with paired entry/exit is identical to what
    // parseTradovateCSV does. Wiring will require fetching orders + cycle
    // matching (same algo).
    const baseUrl = "https://live.tradovateapi.com/v1";
    const headers: HeadersInit = {
      Authorization: `Bearer ${tokens.accessToken}`,
      "Content-Type": "application/json",
    };
    const url = `${baseUrl}/order/list${since ? `?ts=${since.toISOString()}` : ""}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Tradovate sync failed: ${res.status} ${await res.text()}`);
    }
    // TODO: convertir les orders Tradovate en ParsedTrade en réutilisant la
    // logique de parseTradovateCSV (cycle matching position-tracking).
    return [];
  },
};
