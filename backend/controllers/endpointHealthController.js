const endpointHealth = require('../services/endpointHealthService');

/**
 * Responds immediately with cached or placeholder rows; kicks off background refresh.
 */
exports.getStatus = function(req, res, next) {
  try {
    const snapshot = endpointHealth.getSnapshot();
    res.json({ success: true, ...snapshot });
    endpointHealth.maybeRefresh();
  } catch (err) {
    next(err);
  }
};
