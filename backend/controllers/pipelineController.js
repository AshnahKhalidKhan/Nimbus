const { validateToken } = require('../utils/auth');
const { triggerPipelineInAzure } = require('../services/azureDevOpsService');

exports.triggerPipeline = async (req, res, next) => {
  try {
    const { accessToken, startTime, endTime, taskType, environment, notes } = req.body;

    // OAuth validation (placeholder)
    validateToken(accessToken);

    // Call Azure DevOps service
    const result = await triggerPipelineInAzure({ startTime, endTime, taskType, environment, notes });

    res.json({ success: true, message: 'Pipeline triggered successfully', data: result });
  } catch (err) {
    next(err);
  }
};