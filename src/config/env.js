const dotenv = require('dotenv');

dotenv.config();

function parseServiceRegistry(raw) {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out = {};
      for (const [key, value] of Object.entries(parsed)) {
        out[key] = Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
      }
      return out;
    }
  } catch {
    // Ignore invalid JSON and fall back to empty registry.
  }
  return {};
}

const required = (name, value) => {
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT, 10) || 4002,
  mongoUri: required('MONGO_URI', process.env.MONGO_URI),
  jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),
  bookingServiceBaseUrl:
    process.env.BOOKING_SERVICE_BASE_URL || 'http://localhost:4001',
  userServiceBaseUrl:
    process.env.USER_SERVICE_BASE_URL || 'http://localhost:4000',
  serviceName: process.env.SERVICE_NAME || 'payment-service',
  jwtIssuer: process.env.JWT_ISSUER || 'phoenix-online-auth',
  internalServiceId: process.env.INTERNAL_SERVICE_ID || process.env.SERVICE_NAME || 'payment-service',
  internalServiceTokenTtlSeconds:
    Number.parseInt(process.env.INTERNAL_SERVICE_TOKEN_TTL_SECONDS, 10) || 300,
  serviceRegistry: parseServiceRegistry(process.env.SERVICE_REGISTRY),
  logLevel: process.env.LOG_LEVEL || 'info',
  /** Comma-separated origins, or * for all (dev only in production prefer explicit list) */
  corsOrigin: process.env.CORS_ORIGIN || '*',
  metricsEnabled:
    String(process.env.METRICS_ENABLED || 'true').toLowerCase() === 'true',
  jaegerEndpoint: process.env.JAEGER_ENDPOINT || '',
  otelServiceName: process.env.OTEL_SERVICE_NAME || 'payment-service',
};

module.exports = env;

