jest.mock('../../config/logger', () => ({
  getLogger: () => ({
    error: jest.fn(),
  }),
}));

const { notFoundHandler, errorHandler } = require('../../middleware/error.middleware');

describe('error.middleware', () => {
  it('notFoundHandler forwards AppError', () => {
    const next = jest.fn();
    notFoundHandler({ originalUrl: '/x' }, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('errorHandler sends JSON error', () => {
    const err = Object.assign(new Error('boom'), {
      statusCode: 400,
      code: 'TEST',
    });
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });
});
