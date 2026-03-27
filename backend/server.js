/**
 * Nimbus backend – Teams task board API and static frontend.
 *
 * ENV (see .env and SETUP.md):
 *   PORT          - Port this process listens on (e.g. 3000). For Teams HTTPS, use a reverse proxy on 443 that forwards here.
 *   BASE_URL      - Optional; public URL when not using forwarded headers (see utils/publicBaseUrl.js).
 *   TRUST_PROXY   - Set to 1 behind ngrok/IIS/nginx. With HTTPS forwards, /api/config and OAuth use the request host (avoids stale BASE_URL after ngrok URL changes).
 *   SESSION_SECRET - Secret for signing session cookies; set a strong value in production.
 */

// override: true so values in .env win over Windows/User environment variables (common REDIRECT_URI=localhost issue with ngrok)
require('dotenv').config({ override: true, quiet: true });

// When BASE_URL is HTTPS (e.g. ngrok), OAuth redirect MUST be that host — not localhost. Fixes duplicate/wrong REDIRECT_URI in .env or Windows env.
(function syncRedirectUriWithBaseUrl() {
  const base = (process.env.BASE_URL || '').trim().replace(/\/$/, '');
  if (!base || !/^https:\/\//i.test(base)) return;
  const derived = `${base}/auth/callback`;
  if (process.env.REDIRECT_URI !== derived) {
    console.warn('[Nimbus] Setting REDIRECT_URI from BASE_URL:', derived);
  }
  process.env.REDIRECT_URI = derived;
})();

const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const authRoute = require('./routes/auth');
const triggerPipelineRoute = require('./routes/triggerPipeline');
const reportRoute = require('./routes/report');
const endpointHealthRoute = require('./routes/endpointHealth');
const { errorHandler } = require('./middlewares/errorHandler');
const { getPublicBaseUrl } = require('./utils/publicBaseUrl');

const app = express();

// When behind HTTPS reverse proxy (e.g. ngrok, IIS), trust X-Forwarded-* so req.protocol is correct.
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// CORS: allow credentials so session cookie is sent (same-origin or configured FRONTEND_ORIGIN)
const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN || true,
  credentials: true,
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Session: stores OAuth access token server-side (see routes/auth.js callback).
// Teams loads the tab in an embedded WebView; SameSite=Lax cookies are often dropped → user looks "signed out" after OAuth.
// When BASE_URL is https (ngrok/production), use SameSite=None + Secure (required together) so the session works in Teams.
const sessionSecret = process.env.SESSION_SECRET || 'change-me-in-production';
const baseUrlForCookie = (process.env.BASE_URL || '').trim();
const sessionCookieHttps =
  /^https:\/\//i.test(baseUrlForCookie) ||
  process.env.SESSION_COOKIE_SAMESITE_NONE === '1' ||
  process.env.NODE_ENV === 'production';
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'nimbus.sid',
    cookie: {
      secure: sessionCookieHttps,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: sessionCookieHttps ? 'none' : 'lax',
    },
  })
);

// Auth routes (no auth required): /auth/login, /auth/callback, /auth/session, /auth/logout
app.use('/auth', authRoute);

// Frontend uses this to build login URL and API base (same origin when served from here)
app.get('/api/config', (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  res.json({
    baseUrl,
    authLoginUrl: `${baseUrl}/auth/login`,
    apiBase: `${baseUrl}/api`,
  });
});

// Task API routes (protected by requireAuth)
app.use('/api/triggerPipeline', triggerPipelineRoute);
app.use('/api/report', reportRoute);
app.use('/api/endpointHealth', endpointHealthRoute);

// Serve frontend (task board) so the app is same-origin and session cookies work
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

// Use http.createServer + listen instead of app.listen(). Express 5's app.listen() wires the
// same once-wrapped callback to server 'error' — on EADDRINUSE the callback still runs and
// prints "Backend running" even though bind failed, then Node exits (no listening handle).
const server = http.createServer(app);
server.on('error', function(err) {
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      `[Nimbus] Port ${PORT} is already in use. Another Nimbus (or app) is still running — stop it (Task Manager / Ctrl+C in that terminal) or set PORT=3001 in .env.`
    );
  } else {
    console.error('[Nimbus] HTTP server error:', err);
  }
  process.exit(1);
});
server.listen(PORT, function() {
  console.log(`Backend running on port ${PORT}`);
  const ri = process.env.REDIRECT_URI || '(not set)';
  console.log(`[Nimbus] OAuth REDIRECT_URI loaded: ${ri}`);
  console.log(
    `[Nimbus] Session cookie: sameSite=${sessionCookieHttps ? 'none' : 'lax'}, secure=${sessionCookieHttps} (set BASE_URL=https://... for Teams iframe)`
  );
  if (ri.includes('localhost') && process.env.BASE_URL && !String(process.env.BASE_URL).includes('localhost')) {
    console.warn(
      '[Nimbus] WARNING: REDIRECT_URI uses localhost but BASE_URL does not. If sign-in sends you to localhost, remove REDIRECT_URI from Windows Environment Variables or set REDIRECT_URI in .env to your HTTPS URL (see NGROK_AND_DEPLOY.md).'
    );
  }
});
