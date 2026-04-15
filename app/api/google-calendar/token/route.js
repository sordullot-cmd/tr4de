import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/google-calendar/callback'
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: 'No code provided' }), { status: 400 });
    }

    const { tokens } = await oauth2Client.getToken(code);
    
    return new Response(JSON.stringify({ tokens }), { status: 200 });
  } catch (error) {
    console.error('Token exchange error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
