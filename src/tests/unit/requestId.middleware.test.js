const requestIdMiddleware = require('../../middleware/requestId.middleware');

describe('requestId.middleware', () => {
  it('generates X-Request-Id when missing', () => {
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();
    requestIdMiddleware(req, res, next);
    expect(req.requestId).toBeDefined();
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-Id', req.traceId);
    expect(next).toHaveBeenCalled();
  });

  it('reuses valid incoming X-Request-Id', () => {
    const req = { headers: { 'x-request-id': 'abc-123' } };
    const res = { setHeader: jest.fn() };
    requestIdMiddleware(req, res, jest.fn());
    expect(req.requestId).toBe('abc-123');
  });
});
