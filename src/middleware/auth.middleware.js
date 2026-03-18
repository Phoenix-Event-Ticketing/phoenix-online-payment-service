const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { unauthorized } = require('../common/errors');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Missing Authorization header'));
  }

  const token = header.substring('Bearer '.length);

  try {
    const decoded = jwt.verify(token, env.jwtSecret);

    // We expect User Service to put user id and role in the token.
    const userId = decoded.sub || decoded.userId || decoded.id;
    const role = decoded.role || 'USER';

    if (!userId) {
      return next(unauthorized('Token missing user identifier'));
    }

    req.user = {
      id: userId,
      role,
      tokenPayload: decoded,
    };

    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
}

module.exports = authMiddleware;

