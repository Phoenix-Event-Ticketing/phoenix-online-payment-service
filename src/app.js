const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createHttpLogger } = require('./config/logger');
const { globalRateLimit } = require('./middleware/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Routes
const healthRoutes = require('./modules/health/health.routes');
const paymentRoutes = require('./modules/payment/payment.routes');
const refundRoutes = require('./modules/refund/refund.routes');

function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: '*', // can be restricted via env later
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // Logging
  app.use(createHttpLogger());

  // Body parsing
  app.use(express.json());

  // Global rate limit
  app.use(globalRateLimit);

  // Health routes (no auth)
  app.use('/', healthRoutes);

  // Domain routes
  app.use('/', paymentRoutes);
  app.use('/', refundRoutes);

  // 404 and error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;

