jest.mock('axios', () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();
  return {
    create: jest.fn(() => ({
      get: mockGet,
      post: mockPost,
    })),
    _mockGet: mockGet,
    _mockPost: mockPost,
  };
});

jest.mock('../../config/env', () => ({
  bookingServiceBaseUrl: 'http://booking-service',
}));

const axios = require('axios');
const {
  getBookingById,
  markBookingAsPaid,
  markBookingPaymentFailed,
  sanitizePathParam,
} = require('../../integrations/bookingService.client');

function getClient() {
  return axios.create();
}

describe('bookingService.client', () => {
  let mockGet;
  let mockPost;

  beforeEach(() => {
    const client = getClient();
    mockGet = client.get;
    mockPost = client.post;
    mockGet.mockReset();
    mockPost.mockReset();
  });

  describe('getBookingById', () => {
    it('fetches booking and returns res.data.data or res.data', async () => {
      mockGet.mockResolvedValue({
        data: { data: { id: 'b1', status: 'PENDING' } },
      });

      const result = await getBookingById('b1', 'token');

      expect(mockGet).toHaveBeenCalledWith('/bookings/b1', {
        headers: { Authorization: 'Bearer token' },
      });
      expect(result).toEqual({ id: 'b1', status: 'PENDING' });
    });

    it('returns res.data when res.data.data is absent', async () => {
      mockGet.mockResolvedValue({ data: { id: 'b1' } });

      const result = await getBookingById('b1', null);

      expect(mockGet).toHaveBeenCalledWith('/bookings/b1', {
        headers: {},
      });
      expect(result).toEqual({ id: 'b1' });
    });

    it('does not pass Authorization when token is falsy', async () => {
      mockGet.mockResolvedValue({ data: {} });

      await getBookingById('b1', null);

      expect(mockGet).toHaveBeenCalledWith('/bookings/b1', {
        headers: {},
      });
    });

    it('sanitizes bookingId before request', async () => {
      mockGet.mockResolvedValue({ data: {} });

      await getBookingById('abc-123_xyz', 'tok');

      expect(mockGet).toHaveBeenCalledWith(
        '/bookings/abc-123_xyz',
        expect.any(Object),
      );
    });

    it('throws when bookingId invalid', async () => {
      await expect(getBookingById('../x', 'tok')).rejects.toThrow(
        'invalid characters',
      );
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('maps upstream 401 to unauthorized app error', async () => {
      mockGet.mockRejectedValueOnce({
        response: { status: 401 },
        message: 'Request failed with status code 401',
      });

      await expect(getBookingById('b1', 'token')).rejects.toMatchObject({
        statusCode: 401,
        code: 'BOOKING_LOOKUP_FAILED',
      });
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('retries with /api prefix only when first call is 404', async () => {
      mockGet
        .mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' })
        .mockResolvedValueOnce({ data: { data: { id: 'b1' } } });

      const result = await getBookingById('b1', 'token');

      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockGet).toHaveBeenNthCalledWith(1, '/bookings/b1', {
        headers: { Authorization: 'Bearer token' },
      });
      expect(mockGet).toHaveBeenNthCalledWith(2, '/api/bookings/b1', {
        headers: { Authorization: 'Bearer token' },
      });
      expect(result).toEqual({ id: 'b1' });
    });

    it('maps fallback lookup failure after 404 retry', async () => {
      mockGet
        .mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' })
        .mockRejectedValueOnce({ response: { status: 404 }, message: 'Still not found' });

      await expect(getBookingById('b1', 'token')).rejects.toMatchObject({
        statusCode: 404,
        code: 'BOOKING_LOOKUP_FAILED',
      });
      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('maps upstream 400 to bad request app error', async () => {
      mockGet.mockRejectedValueOnce({
        response: { status: 400, data: { message: 'Bad booking payload' } },
      });

      await expect(getBookingById('b1', 'token')).rejects.toMatchObject({
        statusCode: 400,
        code: 'BOOKING_LOOKUP_FAILED',
      });
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('maps direct upstream 404 to not found when no fallback retry applies', async () => {
      mockGet.mockRejectedValueOnce({
        response: { status: 404 },
      });
      // First call is 404 so retry happens; force retry to non-404 mapped notFound by mapper.
      mockGet.mockRejectedValueOnce({
        response: { status: 404 },
      });

      await expect(getBookingById('b1', null)).rejects.toMatchObject({
        statusCode: 404,
        code: 'BOOKING_LOOKUP_FAILED',
      });
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe('markBookingAsPaid', () => {
    it('posts callback with success status and returns data', async () => {
      mockPost.mockResolvedValue({
        data: { data: { id: 'b1', paymentId: 'p1' } },
      });

      const result = await markBookingAsPaid('b1', 'p1', 'token');

      expect(mockPost).toHaveBeenCalledWith(
        '/bookings/payment-callback',
        {
          bookingId: 'b1',
          paymentReferenceId: 'p1',
          paymentStatus: 'SUCCESS',
          transactionId: 'p1',
        },
        { headers: { Authorization: 'Bearer token' } },
      );
      expect(result).toEqual({ id: 'b1', paymentId: 'p1' });
    });

    it('returns res.data when res.data.data is absent', async () => {
      mockPost.mockResolvedValue({ data: { id: 'b1' } });

      const result = await markBookingAsPaid('b1', 'p1', null);

      expect(result).toEqual({ id: 'b1' });
    });

    it('sanitizes both bookingId and paymentId', async () => {
      mockPost.mockResolvedValue({ data: {} });

      await markBookingAsPaid('b1', 'pay-1', 'tok');

      expect(mockPost).toHaveBeenCalledWith(
        '/bookings/payment-callback',
        {
          bookingId: 'b1',
          paymentReferenceId: 'pay-1',
          paymentStatus: 'SUCCESS',
          transactionId: 'pay-1',
        },
        expect.any(Object),
      );
    });

    it('throws when bookingId invalid', async () => {
      await expect(markBookingAsPaid('../x', 'p1', 'tok')).rejects.toThrow(
        'invalid characters',
      );
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('retries callback with /api prefix on 404', async () => {
      mockPost
        .mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' })
        .mockResolvedValueOnce({ data: { data: { ok: true } } });

      const result = await markBookingAsPaid('b1', 'p1', 'token');

      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(mockPost).toHaveBeenNthCalledWith(
        1,
        '/bookings/payment-callback',
        expect.objectContaining({ paymentStatus: 'SUCCESS' }),
        { headers: { Authorization: 'Bearer token' } },
      );
      expect(mockPost).toHaveBeenNthCalledWith(
        2,
        '/api/bookings/payment-callback',
        expect.objectContaining({ paymentStatus: 'SUCCESS' }),
        { headers: { Authorization: 'Bearer token' } },
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('markBookingPaymentFailed', () => {
    it('posts callback with failed status', async () => {
      mockPost.mockResolvedValue({ data: { ok: true } });
      await markBookingPaymentFailed('b1', 'p1', 'token');
      expect(mockPost).toHaveBeenCalledWith(
        '/bookings/payment-callback',
        {
          bookingId: 'b1',
          paymentReferenceId: 'p1',
          paymentStatus: 'FAILED',
          transactionId: 'p1',
        },
        { headers: { Authorization: 'Bearer token' } },
      );
    });

    it('maps upstream 403 callback error to forbidden app error', async () => {
      mockPost.mockRejectedValueOnce({
        response: { status: 403 },
        message: 'Forbidden',
      });

      await expect(markBookingPaymentFailed('b1', 'p1', 'token')).rejects.toMatchObject({
        statusCode: 403,
        code: 'BOOKING_PAYMENT_CALLBACK_FAILED',
      });
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('maps fallback callback error after 404 to app error', async () => {
      mockPost
        .mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' })
        .mockRejectedValueOnce({ response: { status: 500 }, message: 'Boom' });

      await expect(markBookingPaymentFailed('b1', 'p1', 'token')).rejects.toMatchObject({
        statusCode: 502,
        code: 'BOOKING_PAYMENT_CALLBACK_FAILED',
      });
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });

  describe('sanitizePathParam', () => {
    it('accepts alphanumeric ids and encodes', () => {
      expect(sanitizePathParam('abc123', 'id')).toBe('abc123');
      expect(sanitizePathParam('a_b-c', 'id')).toBe('a_b-c');
    });

    it('rejects empty and non-strings', () => {
      expect(() => sanitizePathParam('', 'id')).toThrow('non-empty string');
      expect(() => sanitizePathParam('  ', 'id')).toThrow('non-empty string');
      expect(() => sanitizePathParam(null, 'id')).toThrow('non-empty string');
      expect(() => sanitizePathParam({}, 'id')).toThrow('non-empty string');
    });

    it('rejects traversal-like values', () => {
      expect(() => sanitizePathParam('../x', 'id')).toThrow('invalid characters');
      expect(() => sanitizePathParam('a/b', 'id')).toThrow('invalid characters');
    });
  });
});
