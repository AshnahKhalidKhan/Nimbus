const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/requireAuth');
const reportController = require('../controllers/reportController');

router.post('/run', requireAuth, reportController.runReport);

module.exports = router;
