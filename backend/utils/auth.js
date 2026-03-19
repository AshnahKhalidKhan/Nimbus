/**
 * OAuth helpers for Microsoft / Azure AD.
 * Uses authorization-code flow: user signs in once, token stored in server session.
 *
 * CONFIG (all from .env; see APP_REGISTRATION.md for where to get them):
 *   CLIENT_ID    - App registration → Overview → Application (client) ID
 *   CLIENT_SECRET - App registration → Certificates & secrets → client secret Value
 *   TENANT_ID    - App registration → Overview → Directory (tenant) ID
 *   REDIRECT_URI - Must match Authentication → Web → Redirect URIs (e.g. http://localhost:3000/auth/callback)
 */

const msal = require('@azure/msal-node');

// Azure DevOps resource scope (fixed; used for "Sign in and access Azure DevOps on behalf of user")
// See: Azure AD → API permissions → Azure DevOps → user_impersonation
const AZURE_DEVOPS_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/.default';

/**
 * Trim env and strip accidental wrapping quotes (common .env paste mistakes).
 * AADSTS7000215 often comes from Secret ID vs Value, trailing space, or "value" pasted with quotes.
 */
function cleanEnv(value) {
  if (value == null) return '';
  let s = String(value).trim().replace(/\r$/, '');
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function getAuthEnv() {
  return {
    clientId: cleanEnv(process.env.CLIENT_ID),
    tenantId: cleanEnv(process.env.TENANT_ID),
    clientSecret: cleanEnv(process.env.CLIENT_SECRET),
  };
}

let cca = null;

function getConfidentialClient() {
  const { clientId, tenantId, clientSecret } = getAuthEnv();
  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Missing OAuth config: CLIENT_ID, CLIENT_SECRET, TENANT_ID');
  }
  if (!cca) {
    cca = new msal.ConfidentialClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret,
      },
      system: {
        loggerOptions: { logLevel: 2 }, // Error only
      },
    });
  }
  return cca;
}

/**
 * Build the Microsoft login URL for authorization-code flow.
 * Frontend or backend can redirect the user here.
 * redirectUri: must match REDIRECT_URI in .env and in App registration → Authentication → Web.
 */
async function getAuthCodeUrl(redirectUri) {
  const client = getConfidentialClient();
  const uri = redirectUri || process.env.REDIRECT_URI;
  if (!uri) throw new Error('REDIRECT_URI is required');
  return client.getAuthCodeUrl({
    scopes: [AZURE_DEVOPS_SCOPE],
    redirectUri: uri,
    responseMode: msal.ResponseMode.QUERY,
  });
}

/**
 * Teams Tab SSO: exchange the token from `microsoftTeams.authentication.getAuthToken()`
 * for an Azure DevOps access token using On-Behalf-Of (OBO).
 * Requires Entra "Expose an API" + scope + authorized Teams clients — see TEAMS_SSO.md.
 */
async function acquireTokenOnBehalfOf(teamsSsoToken) {
  if (!teamsSsoToken || typeof teamsSsoToken !== 'string') {
    throw new Error('Teams SSO token is required');
  }
  const client = getConfidentialClient();
  const response = await client.acquireTokenOnBehalfOf({
    oboAssertion: teamsSsoToken.trim(),
    scopes: [AZURE_DEVOPS_SCOPE],
  });
  if (!response || !response.accessToken) {
    throw new Error('On-Behalf-Of token exchange failed');
  }
  return {
    accessToken: response.accessToken,
    expiresOn: response.expiresOn,
    account: response.account ? { username: response.account.username } : null,
  };
}

/**
 * Exchange authorization code for tokens. Store accessToken (and optional refresh) in session.
 * code: from query param after user signs in (Auth callback).
 * redirectUri: must be the same value used in the login request.
 */
async function acquireTokenByCode(code, redirectUri) {
  if (!code) throw new Error('Authorization code is required');
  const client = getConfidentialClient();
  const uri = redirectUri || process.env.REDIRECT_URI;
  const response = await client.acquireTokenByCode({
    code,
    scopes: [AZURE_DEVOPS_SCOPE],
    redirectUri: uri,
  });
  if (!response || !response.accessToken) {
    throw new Error('Failed to obtain access token');
  }
  return {
    accessToken: response.accessToken,
    expiresOn: response.expiresOn,
    account: response.account ? { username: response.account.username } : null,
  };
}

/**
 * Validate that a token exists and is non-empty. For production, add JWT decode/expiry check.
 */
function validateToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
    const err = new Error('Invalid or missing access token');
    err.statusCode = 401;
    throw err;
  }
  return true;
}

/**
 * Get the access token from the current request session (set by auth callback).
 */
function getSessionToken(req) {
  return req.session && req.session.accessToken ? req.session.accessToken : null;
}

module.exports = {
  getAuthCodeUrl,
  acquireTokenByCode,
  acquireTokenOnBehalfOf,
  validateToken,
  getSessionToken,
  AZURE_DEVOPS_SCOPE,
};
