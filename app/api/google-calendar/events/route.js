import { google } from 'googleapis';

export async function POST(req) {
  try {
    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'No access token provided' }), { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/google-calendar/callback'
    );

    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: futureDate.toISOString(),
      maxResults: 50,
      orderBy: 'startTime',
      singleEvents: true,
    });

    const events = response.data.items || [];

    return new Response(JSON.stringify({ events }), { status: 200 });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
