const msal = require('@azure/msal-node');

const config = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET
  }
};

const cca = new msal.ConfidentialClientApplication(config);

// Get access token for Azure DevOps
exports.getAccessToken = async (userCode) => {
  // For Teams tab, you’ll exchange code for token
  const tokenResponse = await cca.acquireTokenByClientCredential({
    scopes: ["499b84ac-1321-427f-aa17-267ca6975798/.default"] // Azure DevOps scope
  });
  return tokenResponse.accessToken;
};

const express = require('express');
const router = express.Router();
const { getAccessToken } = require('../utils/auth');

router.get('/callback', async (req, res) => {
  try {
    // For Teams OAuth, code will be in query
    const code = req.query.code;
    const accessToken = await getAccessToken(code);

    // Save token in session or send to frontend
    res.send('OAuth successful! You can close this window.');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;