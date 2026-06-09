import { google } from "googleapis";
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
    const { accessToken, timeMin, timeMax } = await req.json();
    if (!accessToken) return json({ error: "no_access_token" }, 401);

    const client = getOAuthClient(req);
    if (!client) return json({ error: "not_configured" }, 503);
    client.setCredentials({ access_token: accessToken });

    const cal = google.calendar({ version: "v3", auth: client });

    const now = new Date();
    const min = timeMin || now.toISOString();
    const max =
      timeMax ||
      new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const res = await cal.events.list({
      calendarId: "primary",
      timeMin: min,
      timeMax: max,
      maxResults: 250,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = (res.data.items || []).map((ev) => ({
      id: ev.id,
      summary: ev.summary || "(Sans titre)",
      description: ev.description || "",
      location: ev.location || "",
      htmlLink: ev.htmlLink || "",
      colorId: ev.colorId || null,
      allDay: !!ev.start?.date,
      start: ev.start?.dateTime || ev.start?.date || null,
      end: ev.end?.dateTime || ev.end?.date || null,
      status: ev.status || "confirmed",
    }));

    return json({ events });
  } catch (e) {
    const msg = e?.message || "unknown_error";
    // 401 si le token est invalide/expiré → le client tentera un refresh.
    const status = /invalid|expired|unauthor/i.test(msg) ? 401 : 500;
    return json({ error: msg }, status);
  }
}
