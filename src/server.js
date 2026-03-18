const env = require('./config/env');
const { createLogger } = require('./config/logger');
const { connectDb, disconnectDb } = require('./config/db');
const createApp = require('./app');

const logger = createLogger(env.logLevel);

async function start() {
  try {
    await connectDb(logger);

    const app = createApp();

    const server = app.listen(env.port, () => {
      logger.info(`Payment service listening on port ${env.port}`);
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDb(logger);
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    logger.error('Failed to start payment service', { err });
    process.exit(1);
  }
}

// Top-level await requires ESM; this service is CommonJS. NOSONAR
start();

