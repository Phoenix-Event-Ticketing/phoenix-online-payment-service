const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { unauthorized, forbidden } = require('../common/errors');

const INTERNAL_SERVICE_ID_HEADER = 'x-internal-service-id';

function authorizeInternal(allowedPermissions = []) {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(unauthorized('Missing Authorization header'));
    }

    const token = header.substring('Bearer '.length);
    try {
      const decoded = jwt.verify(token, env.jwtSecret, {
        issuer: env.jwtIssuer || 'phoenix-online-auth',
      });

      if (decoded?.typ !== 'service') {
        return next(forbidden('Only internal service tokens are allowed'));
      }

      const serviceIdHeader = req.headers[INTERNAL_SERVICE_ID_HEADER];
      if (typeof serviceIdHeader !== 'string' || serviceIdHeader.trim().length === 0) {
        return next(unauthorized('Missing X-Internal-Service-Id header'));
      }

      const serviceId = serviceIdHeader.trim();
      if (!serviceId) {
        return next(unauthorized('Service token missing subject'));
      }
      if (decoded.sub !== serviceId) {
        return next(forbidden('Service identity mismatch'));
      }

      const servicePermissions = env.serviceRegistry?.[serviceId] || [];
      const hasPermission = allowedPermissions.length === 0
        || allowedPermissions.some((permission) => servicePermissions.includes(permission));

      if (!hasPermission) {
        return next(forbidden('Service is not allowed to access this endpoint'));
      }

      req.internalAuth = {
        serviceId,
        permissions: servicePermissions,
        tokenPayload: decoded,
      };
      req.user = {
        id: `svc:${serviceId}`,
        role: 'INTERNAL_SERVICE',
      };

      return next();
    } catch {
      return next(unauthorized('Invalid or expired token'));
    }
  };
}

module.exports = {
  authorizeInternal,
};
