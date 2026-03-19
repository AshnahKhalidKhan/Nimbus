const { getSessionToken } = require('../utils/auth');
const { validateToken } = require('../utils/auth');
const { runReport } = require('../services/reportService');

/**
 * Run a report. Uses token from session (set by requireAuth).
 * Placeholder implementation; extend with real report logic.
 */
exports.runReport = async (req, res, next) => {
  try {
    const accessToken = getSessionToken(req);
    validateToken(accessToken);

    const { reportType, startDate, endDate, format, notes } = req.body;

    const result = await runReport(
      { reportType, startDate, endDate, format, notes },
      accessToken
    );

    res.json({ success: true, message: 'Report run successfully', data: result });
  } catch (err) {
    next(err);
  }
};
