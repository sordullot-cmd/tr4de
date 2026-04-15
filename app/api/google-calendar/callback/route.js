import { google } from 'googleapis';

export async function GET(req) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    if (error) {
      console.error('OAuth error:', error, error_description);
      return new Response(
        `<html><body>
          <h2>Erreur OAuth: ${error}</h2>
          <p>${error_description || 'Une erreur s\'est produite lors de l\'authentification.'}</p>
          <p>Vérifiez que:</p>
          <ul>
            <li>Vous avez ajouté <strong>cookoz.mail@gmail.com</strong> comme testeur dans Google Cloud Console</li>
            <li>L'URI de redirection <strong>http://localhost:3000/api/google-calendar/callback</strong> est configurée dans Google Cloud</li>
          </ul>
          <a href="/">Retour à l'accueil</a>
        </body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    if (!code) {
      return new Response('Code not found', { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/api/google-calendar/callback'
    );

    console.log('Exchanging code for tokens...');
    console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

    const { tokens } = await oauth2Client.getToken(code);
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    console.log('Token exchange successful');

    // Redirect back with token in sessionStorage
    return new Response(
      `<html><body>
        <script>
          sessionStorage.setItem('google_access_token', '${accessToken}');
          ${refreshToken ? `sessionStorage.setItem('google_refresh_token', '${refreshToken}');` : ''}
          localStorage.setItem('google_access_token', '${accessToken}');
          ${refreshToken ? `localStorage.setItem('google_refresh_token', '${refreshToken}');` : ''}
          window.location.href = '/#schedule';
        </script>
      </body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      `<html><body>
        <h2>Erreur: ${error.message}</h2>
        <p>Vérifiez que:</p>
        <ul>
          <li>Votre <strong>CLIENT_SECRET</strong> est correct</li>
          <li>L'URI de redirection <strong>http://localhost:3000/api/google-calendar/callback</strong> est ajoutée dans Google Cloud</li>
          <li>Vous êtes ajouté comme testeur dans Google Cloud Console (cookoz.mail@gmail.com)</li>
        </ul>
        <a href="/">Retour à l'accueil</a>
      </body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
