const jwt = require('jsonwebtoken');
const env = require('../config/env');

function createInternalServiceAuthorizationHeader(permissions = []) {
  const ttlSeconds = Number.isFinite(env.internalServiceTokenTtlSeconds)
    ? Math.max(env.internalServiceTokenTtlSeconds, 60)
    : 300;

  const sanitizedPermissions = Array.isArray(permissions)
    ? permissions.filter((permission) => typeof permission === 'string' && permission.trim().length > 0)
    : [];

  const token = jwt.sign(
    {
      sub: env.internalServiceId || env.serviceName || 'payment-service',
      typ: 'service',
      permissions: sanitizedPermissions,
    },
    env.jwtSecret,
    {
      algorithm: 'HS256',
      issuer: env.jwtIssuer || 'phoenix-online-auth',
      expiresIn: ttlSeconds,
    },
  );

  return `Bearer ${token}`;
}

module.exports = {
  createInternalServiceAuthorizationHeader,
};
