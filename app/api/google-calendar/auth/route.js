import { google } from 'googleapis';

const CLIENT_ID = '979650993052-b69lfgcem299usifs6le5m7ddt07mocr.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:3000/api/google-calendar/callback';

export async function GET(req) {
  const authUrl = google.auth.oauth2Client({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUrl: REDIRECT_URI,
  }).generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  return Response.redirect(authUrl);
}
