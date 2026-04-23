jest.mock('axios', () => {
  const mockGet = jest.fn();
  return {
    create: jest.fn(() => ({
      get: mockGet,
    })),
    _mockGet: mockGet,
  };
});

jest.mock('../../config/env', () => ({
  userServiceBaseUrl: 'http://user-service',
}));

const axios = require('axios');
const { getUserById } = require('../../integrations/userService.client');

function getClient() {
  return axios.create();
}

describe('userService.client', () => {
  let mockGet;

  beforeEach(() => {
    mockGet = getClient().get;
    mockGet.mockReset();
  });

  it('returns nested data payload on success', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: { id: 'u1' } } });

    const result = await getUserById('u1', 'tok');

    expect(mockGet).toHaveBeenCalledWith('/api/users/u1', {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(result).toEqual({ id: 'u1' });
  });

  it('returns raw data when nested data is absent', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 'u2' } });

    const result = await getUserById('u2', undefined, { 'x-request-id': 'r1' });

    expect(mockGet).toHaveBeenCalledWith('/api/users/u2', {
      headers: { 'x-request-id': 'r1' },
    });
    expect(result).toEqual({ id: 'u2' });
  });

  it('maps upstream response error to AppError with upstream status', async () => {
    mockGet.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { message: 'User not found', errorCode: 'USER_NOT_FOUND' },
      },
      message: 'Request failed',
    });

    await expect(getUserById('missing', 'tok')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    });
  });

  it('maps no-response error to service unavailable', async () => {
    mockGet.mockRejectedValueOnce({
      request: {},
      message: 'ECONNREFUSED',
    });

    await expect(getUserById('u1', 'tok')).rejects.toMatchObject({
      statusCode: 503,
      code: 'USER_SERVICE_UNAVAILABLE',
    });
  });

  it('maps setup error to generic user service error', async () => {
    mockGet.mockRejectedValueOnce(new Error('bad config'));

    await expect(getUserById('u1', 'tok')).rejects.toMatchObject({
      statusCode: 500,
      code: 'USER_SERVICE_ERROR',
      message: 'User service error: bad config',
    });
  });
});
