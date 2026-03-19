/**
 * Auth routes: login redirect and OAuth callback.
 * Token is stored in server session; no token is sent to the client.
 *
 * REDIRECT_URI: Must match the value in .env and in App registration →
 *   Authentication → Web → Redirect URIs (e.g. http://localhost:3000/auth/callback).
 */

const express = require('express');
const router = express.Router();
const { getAuthCodeUrl, acquireTokenByCode, acquireTokenOnBehalfOf } = require('../utils/auth');

/** Only same-app paths; blocks open redirects like //evil.com */
function safeReturnTo(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  if (!s.startsWith('/') || s.startsWith('//')) return null;
  const pathOnly = s.split('?')[0].split('#')[0];
  return pathOnly === '' ? '/' : pathOnly;
}

/**
 * Teams Tab SSO: frontend sends JWT from getAuthToken(); we OBO to Azure DevOps and set session.
 * Body: { token: "<teams_sso_jwt>" }
 */
router.post('/teams-sso', async (req, res) => {
  try {
    const teamsToken = req.body && req.body.token;
    if (!teamsToken) {
      return res.status(400).json({ success: false, message: 'Missing token' });
    }
    const tokenResult = await acquireTokenOnBehalfOf(teamsToken);
    req.session.accessToken = tokenResult.accessToken;
    req.session.expiresOn = tokenResult.expiresOn ? tokenResult.expiresOn.getTime() : null;
    req.session.account = tokenResult.account || null;
    req.session.authMethod = 'teams-sso';
    res.json({ success: true, message: 'Signed in with Teams' });
  } catch (err) {
    console.error('Teams SSO error:', err.message);
    res.status(401).json({
      success: false,
      message: err.message || 'Teams SSO failed',
      hint: 'Check TEAMS_SSO.md: Expose an API, scope, authorized Teams clients, and manifest webApplicationInfo.',
    });
  }
});

// Redirect user to Microsoft sign-in (URL built in utils/auth.js using CLIENT_ID, TENANT_ID, REDIRECT_URI)
// Query ?returnTo=/ — after OAuth, /auth/callback redirects here (full-page sign-in; avoids popup cookie issues with ngrok).
router.get('/login', async (req, res) => {
  try {
    const returnTo = safeReturnTo(req.query.returnTo);
    if (returnTo) {
      req.session.oauthReturnTo = returnTo;
    } else {
      delete req.session.oauthReturnTo;
    }
    const redirectUri = req.query.redirect_uri || process.env.REDIRECT_URI;
    const url = await getAuthCodeUrl(redirectUri);
    res.redirect(url);
  } catch (err) {
    res.status(500).send(`Auth configuration error: ${err.message}`);
  }
});

// OAuth callback: exchange code for token and store in session
router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state;
    if (!code) {
      return res.status(400).send('Missing authorization code. Please try signing in again.');
    }

    const redirectUri = req.query.redirect_uri || process.env.REDIRECT_URI;
    const tokenResult = await acquireTokenByCode(code, redirectUri);

    req.session.accessToken = tokenResult.accessToken;
    req.session.expiresOn = tokenResult.expiresOn ? tokenResult.expiresOn.getTime() : null;
    req.session.account = tokenResult.account || null;
    req.session.authMethod = 'oauth-redirect';

    // Full-page sign-in: same tab returns to the app with session cookie (reliable with ngrok/HTTPS).
    const returnTo = req.session.oauthReturnTo;
    if (returnTo) {
      delete req.session.oauthReturnTo;
      return res.redirect(302, returnTo);
    }

    // Popup sign-in (no returnTo): close-window page for legacy / Teams popup flows
    const closePageHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Sign in successful</title></head>
<body>
  <p>You're signed in. This window can be closed.</p>
  <script>
    try {
      if (window.opener) {
        // Use '*' so the parent page receives the message even when it is on a different origin
        // than this callback (e.g. parent on http://localhost and OAuth on https://ngrok).
        // For sign-in to work, the parent should be opened on the SAME origin as REDIRECT_URI — see TESTING.md.
        window.opener.postMessage({ type: 'auth-success' }, '*');
      }
    } catch (e) {}
    setTimeout(function() { window.close(); }, 1500);
  </script>
</body>
</html>`;
    res.send(closePageHtml);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).send(`Sign-in failed: ${err.message}. Please try again.`);
  }
});

// Optional: return session status for frontend (no token in response)
router.get('/session', (req, res) => {
  const hasToken = !!(req.session && req.session.accessToken);
  res.json({
    authenticated: hasToken,
    user: hasToken && req.session.account ? req.session.account.username : null,
  });
});

// Sign out: destroy session
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: 'Signed out' });
  });
});

module.exports = router;
