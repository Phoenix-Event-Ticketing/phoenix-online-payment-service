import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const env = require('./config/env.js');
const { createLogger } = require('./config/logger.js');
const { connectDb, disconnectDb } = require('./config/db.js');
const { initTracing, shutdownTracing } = require('./observability/tracing.js');
const createApp = require('./app.js');

const logger = createLogger(env.logLevel);

try {
  await initTracing({
    serviceName: env.otelServiceName,
    jaegerEndpoint: env.jaegerEndpoint,
  });
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
      await shutdownTracing();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  logger.error('Failed to start payment service', { err });
  await shutdownTracing();
  process.exit(1);
}
