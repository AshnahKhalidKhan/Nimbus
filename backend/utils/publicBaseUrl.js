/**
 * Public base URL for OAuth redirects and /api/config.
 *
 * When TRUST_PROXY=1 (ngrok, IIS, nginx), prefer the URL the client actually used
 * (X-Forwarded-*) so a stale BASE_URL in .env does not trigger the "Wrong URL" banner
 * or break sign-in after the tunnel hostname changes.
 */

function getPublicBaseUrl(req) {
  const fromEnv = (process.env.BASE_URL || '').trim().replace(/\/$/, '');
  const xfProto = (req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const xfHost = (req.get('x-forwarded-host') || '').split(',')[0].trim();
  const proto = xfProto || req.protocol || 'http';
  const host = xfHost || req.get('host') || '';
  const fromRequest = host ? `${proto}://${host}`.replace(/\/$/, '') : '';

  if (process.env.TRUST_PROXY === '1' && fromRequest && /^https:\/\//i.test(fromRequest)) {
    return fromRequest;
  }
  if (fromEnv) return fromEnv;
  if (fromRequest) return fromRequest;
  return 'http://localhost';
}

module.exports = { getPublicBaseUrl };
