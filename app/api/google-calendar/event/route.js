import { google } from "googleapis";
import { getOAuthClient } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Crée / modifie / supprime un évènement de l'agenda principal.
 * Body : { action: "create" | "update" | "delete", accessToken, eventId?, event? }
 * `event` : { summary, description, location, allDay, start, end }
 *   - timed : start/end = ISO (UTC) ; all-day : start/end = "YYYY-MM-DD" (end exclusif).
 */
export async function POST(req) {
  try {
    const { action, accessToken, eventId, event } = await req.json();
    if (!accessToken) return json({ error: "no_access_token" }, 401);

    const client = getOAuthClient(req);
    if (!client) return json({ error: "not_configured" }, 503);
    client.setCredentials({ access_token: accessToken });
    const cal = google.calendar({ version: "v3", auth: client });

    if (action === "delete") {
      if (!eventId) return json({ error: "no_event_id" }, 400);
      await cal.events.delete({ calendarId: "primary", eventId });
      return json({ ok: true });
    }

    if (action === "create" || action === "update") {
      if (!event) return json({ error: "no_event" }, 400);
      const tz = event.timeZone || "UTC";
      const resource = {
        summary: event.summary || "(Sans titre)",
        description: event.description || undefined,
        location: event.location || undefined,
        colorId: event.colorId || undefined,
        start: event.allDay
          ? { date: event.start }
          : { dateTime: event.start, timeZone: tz },
        end: event.allDay
          ? { date: event.end }
          : { dateTime: event.end, timeZone: tz },
        attendees: Array.isArray(event.guests) && event.guests.length
          ? event.guests.map((email) => ({ email }))
          : undefined,
        // 'opaque' = Occupé · 'transparent' = Disponible
        transparency: event.transparency || undefined,
        visibility: event.visibility && event.visibility !== "default" ? event.visibility : undefined,
        reminders:
          event.reminder === "default"
            ? { useDefault: true }
            : event.reminder === "none"
              ? { useDefault: false, overrides: [] }
              : typeof event.reminder === "number"
                ? { useDefault: false, overrides: [{ method: "popup", minutes: event.reminder }] }
                : undefined,
      };

      // Visioconférence Google Meet (uniquement si demandée et pas déjà présente).
      let conferenceDataVersion = 0;
      if (event.addMeet && !event.hadMeet) {
        conferenceDataVersion = 1;
        resource.conferenceData = {
          createRequest: {
            requestId: `tr4de-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
      }

      const res =
        action === "create"
          ? await cal.events.insert({ calendarId: "primary", requestBody: resource, conferenceDataVersion, sendUpdates: "all" })
          : await cal.events.patch({ calendarId: "primary", eventId, requestBody: resource, conferenceDataVersion, sendUpdates: "all" });

      return json({ ok: true, event: res.data });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    const msg = e?.message || "unknown_error";
    if (/insufficient.*scope|scope|permission|forbidden/i.test(msg)) {
      return json({ error: "insufficient_scope", detail: msg }, 403);
    }
    const status = /invalid|expired|unauthor/i.test(msg) ? 401 : 500;
    return json({ error: msg }, status);
  }
}
