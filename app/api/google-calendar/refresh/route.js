import { getOAuthClient } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) return json({ error: "no_refresh_token" }, 400);

    const client = getOAuthClient(req);
    if (!client) return json({ error: "not_configured" }, 503);

    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();

    return json({
      access_token: credentials.access_token || null,
      expiry_date: credentials.expiry_date || null,
    });
  } catch (e) {
    // On ne renvoie 401 (= « révoqué », qui déconnecte l'utilisateur côté client)
    // QUE lorsque Google confirme que le refresh_token est réellement invalide
    // (`invalid_grant` : révoqué, expiré, ou consentement retiré).
    // Toute autre erreur — panne réseau, timeout, cold-start, 5xx de Google —
    // est transitoire : on renvoie 503 pour que le client garde ses tokens et
    // réessaie plus tard, au lieu de déconnecter à tort.
    const googleError = e?.response?.data?.error;
    const isRevoked = googleError === "invalid_grant";
    return json(
      { error: googleError || e?.message || "refresh_failed" },
      isRevoked ? 401 : 503,
    );
  }
}
