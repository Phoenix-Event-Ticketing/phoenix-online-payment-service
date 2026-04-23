const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequests = new client.Counter({
  name: 'payment_http_requests_total',
  help: 'HTTP requests by method, route and status code.',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  res.on('finish', () => {
    httpRequests.inc({
      method: req.method,
      route: req.route?.path || req.path || 'unknown',
      status_code: String(res.statusCode),
    });
  });
  next();
}

async function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
};
