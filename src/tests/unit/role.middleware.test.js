const { authorize, ROLES } = require('../../middleware/role.middleware');

describe('role.middleware authorize', () => {
  it('allows matching role', () => {
    const mw = authorize([ROLES.USER]);
    const next = jest.fn();
    mw({ user: { role: 'USER' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks wrong role', () => {
    const mw = authorize([ROLES.ADMIN]);
    const next = jest.fn();
    mw({ user: { role: 'USER' } }, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
