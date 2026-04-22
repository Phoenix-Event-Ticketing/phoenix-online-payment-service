const { randomUUID } = require('node:crypto');

/**
 * Correlates logs per request; accepts incoming X-Request-Id or generates one.
 */
function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const incomingTrace = req.headers['x-trace-id'];
  const id =
    typeof incoming === 'string' && incoming.trim().length > 0
      ? incoming.trim().slice(0, 128)
      : randomUUID();
  const traceId =
    typeof incomingTrace === 'string' && incomingTrace.trim().length > 0
      ? incomingTrace.trim().slice(0, 128)
      : req.headers.traceparent || id;
  req.requestId = id;
  req.traceId = traceId;
  res.setHeader('X-Request-Id', id);
  res.setHeader('X-Trace-Id', traceId);
  next();
}

module.exports = requestIdMiddleware;
