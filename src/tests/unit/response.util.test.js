const { success, created, noContent, error } = require('../../common/utils/response');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
  };
}

describe('common/utils/response', () => {
  it('builds success response with null meta by default', () => {
    const res = makeRes();
    const payload = { id: 'p1' };

    success(res, payload);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: payload,
      meta: null,
    });
  });

  it('builds created response and keeps custom meta', () => {
    const res = makeRes();
    created(res, { id: 'p2' }, { source: 'test' });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 'p2' },
      meta: { source: 'test' },
    });
  });

  it('builds no-content response', () => {
    const res = makeRes();
    noContent(res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledTimes(1);
  });

  it('builds error response with known status and tracing headers', () => {
    const res = makeRes();
    res.getHeader.mockImplementation((name) => {
      if (name === 'X-Request-Id') return 'req-1';
      if (name === 'X-Trace-Id') return 'trace-1';
      return undefined;
    });

    error(res, 403, 'Forbidden op', 'FORBIDDEN', { reason: 'role' });

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 403,
        error: 'Forbidden',
        errorCode: 'FORBIDDEN',
        message: 'Forbidden op',
        details: { reason: 'role' },
        requestId: 'req-1',
        traceId: 'trace-1',
      }),
    );
  });

  it('falls back to default status text and values', () => {
    const res = makeRes();
    error(res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 500,
        error: 'Internal Server Error',
        errorCode: 'INTERNAL_ERROR',
        message: 'Unexpected error',
      }),
    );
  });

  it('maps 502 to Bad Gateway', () => {
    const res = makeRes();
    error(res, 502, 'upstream');

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Bad Gateway',
      }),
    );
  });
});
