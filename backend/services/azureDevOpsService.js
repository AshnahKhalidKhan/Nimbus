/**
 * Azure DevOps pipeline trigger.
 *
 * ENV (see .env):
 *   ORG          - Azure DevOps organization (e.g. from https://dev.azure.com/astera → "astera")
 *   PROJECT      - Default project name (e.g. "Astera Cloud" or "Enterprise")
 *   PIPELINE_ID  - Default pipeline definition ID (e.g. from _build?definitionId=295 → 295)
 *
 * The request body can override the default pipeline (and project) so you can trigger
 * any pipeline in Astera Cloud or Enterprise without changing .env:
 *   pipelineId  - optional; if provided, used instead of env PIPELINE_ID
 *   project     - optional; if provided, used instead of env PROJECT (e.g. "Enterprise")
 */

const axios = require('axios');

/**
 * Trigger an Azure DevOps pipeline run.
 * @param {Object} params - { startTime, endTime, taskType, environment, notes, pipelineId?, project? }
 * @param {string} accessToken - OAuth access token (from session; see utils/auth.js)
 */
async function triggerPipelineInAzure(params, accessToken) {
  const { startTime, endTime, taskType, environment, notes, pipelineId, project } = params;

  // Use request body overrides or fall back to .env (see comments at top of file)
  const org = process.env.ORG;
  const proj = (project && String(project).trim()) || process.env.PROJECT;
  const pipeId = (pipelineId !== undefined && pipelineId !== null && String(pipelineId).trim() !== '') ? pipelineId : process.env.PIPELINE_ID;

  if (!org || !proj || !pipeId) {
    throw new Error('Azure DevOps config missing: ORG, PROJECT, PIPELINE_ID (or pass project/pipelineId in body)');
  }

  const url = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(proj)}/_apis/pipelines/${pipeId}/runs?api-version=7.1-preview.1`;

  const response = await axios.post(
    url,
    {
      templateParameters: {
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        taskType: taskType || undefined,
        environment: environment || undefined,
        notes: notes || undefined,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}

module.exports = { triggerPipelineInAzure };
