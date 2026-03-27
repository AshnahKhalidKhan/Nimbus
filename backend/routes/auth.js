/**
 * Auth routes: login redirect and OAuth callback.
 * Token is stored in server session; no token is sent to the client.
 *
 * OAuth redirect URI is `${getPublicBaseUrl(req)}/auth/callback` (see utils/publicBaseUrl.js).
 * Register that full URL in App registration → Authentication → Web → Redirect URIs for each public host (e.g. each ngrok URL).
 */

const express = require('express');
const router = express.Router();
const { getAuthCodeUrl, acquireTokenByCode, acquireTokenOnBehalfOf } = require('../utils/auth');
const { getPublicBaseUrl } = require('../utils/publicBaseUrl');

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

// Redirect user to Microsoft sign-in (redirect URI from getPublicBaseUrl + /auth/callback)
// ?returnTo=/ — where to send the user after OAuth (default: /). Always set so Teams / bookmarks without query still return to the app.
router.get('/login', async (req, res) => {
  try {
    const returnTo = safeReturnTo(req.query.returnTo) || '/';
    req.session.oauthReturnTo = returnTo;
    const redirectUri = `${getPublicBaseUrl(req)}/auth/callback`;
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

    const redirectUri = `${getPublicBaseUrl(req)}/auth/callback`;
    const tokenResult = await acquireTokenByCode(code, redirectUri);

    req.session.accessToken = tokenResult.accessToken;
    req.session.expiresOn = tokenResult.expiresOn ? tokenResult.expiresOn.getTime() : null;
    req.session.account = tokenResult.account || null;
    req.session.authMethod = 'oauth-redirect';

    // Always redirect to the app (default /). Teams often omits ?returnTo= or session can reset between login and callback.
    const returnTo = req.session.oauthReturnTo || '/';
    delete req.session.oauthReturnTo;
    return res.redirect(302, returnTo);
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
