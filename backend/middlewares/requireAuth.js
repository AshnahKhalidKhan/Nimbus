/**
 * Ensures the request has a valid session with an access token.
 * Use on any route that requires the user to be signed in with Microsoft.
 */

const { getSessionToken } = require('../utils/auth');

function requireAuth(req, res, next) {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated. Please sign in with Microsoft.',
      requiresAuth: true,
    });
  }
  req.accessToken = token;
  next();
}

module.exports = { requireAuth };
