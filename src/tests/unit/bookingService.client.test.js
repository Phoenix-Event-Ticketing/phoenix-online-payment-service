jest.mock('axios', () => {
  const mockGet = jest.fn();
  const mockPatch = jest.fn();
  return {
    create: jest.fn(() => ({
      get: mockGet,
      patch: mockPatch,
    })),
    _mockGet: mockGet,
    _mockPatch: mockPatch,
  };
});

jest.mock('../../config/env', () => ({
  bookingServiceBaseUrl: 'http://booking-service',
}));

const axios = require('axios');
const {
  getBookingById,
  markBookingAsPaid,
  sanitizePathParam,
} = require('../../integrations/bookingService.client');

function getClient() {
  return axios.create();
}

describe('bookingService.client', () => {
  let mockGet;
  let mockPatch;

  beforeEach(() => {
    const client = getClient();
    mockGet = client.get;
    mockPatch = client.patch;
    mockGet.mockReset();
    mockPatch.mockReset();
  });

  describe('getBookingById', () => {
    it('fetches booking and returns res.data.data or res.data', async () => {
      mockGet.mockResolvedValue({
        data: { data: { id: 'b1', status: 'PENDING' } },
      });

      const result = await getBookingById('b1', 'token');

      expect(mockGet).toHaveBeenCalledWith('/api/bookings/b1', {
        headers: { Authorization: 'Bearer token' },
      });
      expect(result).toEqual({ id: 'b1', status: 'PENDING' });
    });

    it('returns res.data when res.data.data is absent', async () => {
      mockGet.mockResolvedValue({ data: { id: 'b1' } });

      const result = await getBookingById('b1', null);

      expect(mockGet).toHaveBeenCalledWith('/api/bookings/b1', {
        headers: {},
      });
      expect(result).toEqual({ id: 'b1' });
    });

    it('does not pass Authorization when token is falsy', async () => {
      mockGet.mockResolvedValue({ data: {} });

      await getBookingById('b1', null);

      expect(mockGet).toHaveBeenCalledWith('/api/bookings/b1', {
        headers: {},
      });
    });

    it('sanitizes bookingId before request', async () => {
      mockGet.mockResolvedValue({ data: {} });

      await getBookingById('abc-123_xyz', 'tok');

      expect(mockGet).toHaveBeenCalledWith(
        '/api/bookings/abc-123_xyz',
        expect.any(Object),
      );
    });

    it('throws when bookingId invalid', async () => {
      await expect(getBookingById('../x', 'tok')).rejects.toThrow(
        'invalid characters',
      );
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('markBookingAsPaid', () => {
    it('patches booking with paymentId and returns data', async () => {
      mockPatch.mockResolvedValue({
        data: { data: { id: 'b1', paymentId: 'p1' } },
      });

      const result = await markBookingAsPaid('b1', 'p1', 'token');

      expect(mockPatch).toHaveBeenCalledWith(
        '/api/bookings/b1/pay',
        { paymentId: 'p1' },
        { headers: { Authorization: 'Bearer token' } },
      );
      expect(result).toEqual({ id: 'b1', paymentId: 'p1' });
    });

    it('returns res.data when res.data.data is absent', async () => {
      mockPatch.mockResolvedValue({ data: { id: 'b1' } });

      const result = await markBookingAsPaid('b1', 'p1', null);

      expect(result).toEqual({ id: 'b1' });
    });

    it('sanitizes both bookingId and paymentId', async () => {
      mockPatch.mockResolvedValue({ data: {} });

      await markBookingAsPaid('b1', 'pay-1', 'tok');

      expect(mockPatch).toHaveBeenCalledWith(
        '/api/bookings/b1/pay',
        { paymentId: 'pay-1' },
        expect.any(Object),
      );
    });

    it('throws when bookingId invalid', async () => {
      await expect(markBookingAsPaid('../x', 'p1', 'tok')).rejects.toThrow(
        'invalid characters',
      );
      expect(mockPatch).not.toHaveBeenCalled();
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
