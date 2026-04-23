jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../../config/env', () => ({
  jwtSecret: 'secret',
  jwtIssuer: 'phoenix-online-auth',
  serviceRegistry: {
    'booking-service': ['CREATE_PAYMENT_INTERNAL'],
  },
}));

const jwt = require('jsonwebtoken');
const { authorizeInternal } = require('../../middleware/internalAuth.middleware');

describe('internalAuth.middleware', () => {
  let req;
  let next;

  beforeEach(() => {
    req = { headers: {} };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('authorizes internal caller with required permission', () => {
    const mw = authorizeInternal(['CREATE_PAYMENT_INTERNAL']);
    req.headers.authorization = 'Bearer abc';
    req.headers['x-internal-service-id'] = 'booking-service';
    jwt.verify.mockReturnValue({ sub: 'booking-service', typ: 'service' });

    mw(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.internalAuth.serviceId).toBe('booking-service');
  });

  it('rejects missing internal header', () => {
    const mw = authorizeInternal(['CREATE_PAYMENT_INTERNAL']);
    req.headers.authorization = 'Bearer abc';
    jwt.verify.mockReturnValue({ sub: 'booking-service', typ: 'service' });

    mw(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('rejects callers without permission', () => {
    const mw = authorizeInternal(['CREATE_PAYMENT_INTERNAL']);
    req.headers.authorization = 'Bearer abc';
    req.headers['x-internal-service-id'] = 'event-service';
    jwt.verify.mockReturnValue({ sub: 'event-service', typ: 'service' });

    mw(req, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
