const axios = require('axios');

// This is a stub; replace OAuth token handling with real implementation
exports.triggerPipelineInAzure = async ({ startTime, endTime, taskType, environment, notes }) => {
  console.log('Triggering pipeline with data:', { startTime, endTime, taskType, environment, notes });

  // Example Azure DevOps REST API call (stub)
  // Replace ORG, PROJECT, PIPELINE_ID with .env variables or config
  // const url = `https://dev.azure.com/${process.env.ORG}/${process.env.PROJECT}/_apis/pipelines/${process.env.PIPELINE_ID}/runs?api-version=7.1-preview.1`;
  // const response = await axios.post(url, {
  //   templateParameters: { startTime, endTime, taskType, environment, notes }
  // }, {
  //   headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  // });
  // return response.data;

  return { message: 'Pipeline call stubbed (replace with real Azure DevOps call)' };
};

const axios = require('axios');

exports.triggerPipelineInAzure = async ({ startTime, endTime, taskType, environment, notes }, accessToken) => {
  const url = `https://dev.azure.com/${process.env.ORG}/${process.env.PROJECT}/_apis/pipelines/${process.env.PIPELINE_ID}/runs?api-version=7.1-preview.1`;

  const response = await axios.post(url, {
    templateParameters: { startTime, endTime, taskType, environment, notes }
  }, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
};