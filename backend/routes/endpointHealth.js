const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireAuth');
const endpointHealthController = require('../controllers/endpointHealthController');

router.get('/', requireAuth, endpointHealthController.getStatus);

module.exports = router;
