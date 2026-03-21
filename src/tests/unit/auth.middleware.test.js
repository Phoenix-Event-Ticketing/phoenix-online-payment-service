const jwt = require('jsonwebtoken');
const authMiddleware = require('../../middleware/auth.middleware');

describe('auth.middleware', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets req.user when Bearer token is valid', () => {
    const token = jwt.sign(
      { sub: 'u1', role: 'USER' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(
      expect.objectContaining({ id: 'u1', role: 'USER' }),
    );
  });

  it('calls next with error when header missing', () => {
    const req = { headers: {} };
    authMiddleware(req, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
