import { getOAuthClient, CALENDAR_SCOPES } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

function notConfiguredPage() {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Google Agenda non configuré</title>
      <style>body{font-family:system-ui,sans-serif;max-width:560px;margin:64px auto;padding:0 24px;color:#0D0D0D;line-height:1.5}code{background:#F0F0F0;padding:2px 6px;border-radius:6px}a{color:#3B82F6}</style></head>
      <body>
        <h2>Google Agenda n'est pas encore configuré</h2>
        <p>Les variables d'environnement OAuth sont absentes ou contiennent encore des valeurs d'exemple.</p>
        <p>Renseigne <code>GOOGLE_CLIENT_ID</code> et <code>GOOGLE_CLIENT_SECRET</code> (dans <code>.env.local</code> en local, et dans les variables d'environnement Vercel en production), puis réessaie.</p>
        <p><a href="/#agenda">← Retour au calendrier</a></p>
      </body></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req) {
  const client = getOAuthClient(req);
  if (!client) return notConfiguredPage();

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force le renvoi d'un refresh_token
    scope: CALENDAR_SCOPES,
    include_granted_scopes: true,
  });

  return Response.redirect(url);
}
