const { randomUUID } = require('node:crypto');

/**
 * Correlates logs per request; accepts incoming X-Request-Id or generates one.
 */
function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

module.exports = requestIdMiddleware;
