jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-token'),
}));

jest.mock('../../config/env', () => ({
  jwtSecret: 'secret',
  jwtIssuer: 'phoenix-online-auth',
  internalServiceId: 'payment-service',
  serviceName: 'payment-service',
  internalServiceTokenTtlSeconds: 120,
}));

const jwt = require('jsonwebtoken');
const { createInternalServiceAuthorizationHeader } = require('../../services/internalServiceToken');

describe('internalServiceToken', () => {
  it('creates bearer token with service claims and permissions', () => {
    const header = createInternalServiceAuthorizationHeader(['VIEW_BOOKINGS']);

    expect(jwt.sign).toHaveBeenCalledWith(
      {
        sub: 'payment-service',
        typ: 'service',
        permissions: ['VIEW_BOOKINGS'],
      },
      'secret',
      expect.objectContaining({
        algorithm: 'HS256',
        issuer: 'phoenix-online-auth',
        expiresIn: 120,
      }),
    );
    expect(header).toBe('Bearer signed-token');
  });
});
