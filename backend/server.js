require('dotenv').config();
const express = require('express');
const cors = require('cors');
const triggerPipelineRoute = require('./routes/triggerPipeline');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/triggerPipeline', triggerPipelineRoute);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

const authRoute = require('./routes/auth');
app.use('/auth', authRoute);