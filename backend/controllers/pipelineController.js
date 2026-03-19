/**
 * Trigger Pipeline task. Reads token from session (set after "Sign in with Microsoft");
 * passes optional pipelineId/project from body so any pipeline in Astera Cloud or
 * Enterprise can be triggered (see azureDevOpsService.js and .env).
 */

const { validateToken, getSessionToken } = require('../utils/auth');
const { triggerPipelineInAzure } = require('../services/azureDevOpsService');

exports.triggerPipeline = async (req, res, next) => {
  try {
    const accessToken = getSessionToken(req);
    validateToken(accessToken);

    const { startTime, endTime, taskType, environment, notes, pipelineId, project } = req.body;

    const result = await triggerPipelineInAzure(
      { startTime, endTime, taskType, environment, notes, pipelineId, project },
      accessToken
    );

    res.json({ success: true, message: 'Pipeline triggered successfully', data: result });
  } catch (err) {
    next(err);
  }
};
