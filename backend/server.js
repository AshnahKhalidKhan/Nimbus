/**
 * Nimbus backend – Teams task board API and static frontend.
 *
 * ENV (see .env and SETUP.md):
 *   PORT          - Port this process listens on (e.g. 3000). For Teams HTTPS, use a reverse proxy on 443 that forwards here.
 *   BASE_URL      - Optional; public URL when behind proxy (e.g. https://nimbus.example.com) so /api/config is correct.
 *   TRUST_PROXY   - Set to 1 when behind IIS/nginx so req.protocol and req.get('host') reflect the public URL.
 *   SESSION_SECRET - Secret for signing session cookies; set a strong value in production.
 */

// override: true so values in .env win over Windows/User environment variables (common REDIRECT_URI=localhost issue with ngrok)
require('dotenv').config({ override: true });

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
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const authRoute = require('./routes/auth');
const triggerPipelineRoute = require('./routes/triggerPipeline');
const reportRoute = require('./routes/report');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// When behind HTTPS reverse proxy (e.g. ngrok, IIS), trust X-Forwarded-* so req.protocol is correct.
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

/**
 * Public URL users see in the browser (e.g. https://xyz.ngrok-free.app).
 * Without this, Express sees http://localhost from ngrok and /api/config would wrongly say http:// — triggers "Wrong URL" on https pages.
 */
function getPublicBaseUrl(req) {
  const fromEnv = (process.env.BASE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const xfProto = (req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const xfHost = (req.get('x-forwarded-host') || '').split(',')[0].trim();
  const proto = xfProto || req.protocol || 'http';
  const host = xfHost || req.get('host') || '';
  return `${proto}://${host}`;
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

// Serve frontend (task board) so the app is same-origin and session cookies work
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
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
