const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipelineController');

router.post('/', pipelineController.triggerPipeline);

module.exports = router;