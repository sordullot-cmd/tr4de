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
    return json({ error: e?.message || "refresh_failed" }, 401);
  }
}
