jest.mock('../../config/db', () => ({
  getDbHealth: jest.fn(),
}));

const { success } = require('../../common/utils/response');
jest.mock('../../common/utils/response', () => ({
  success: jest.fn((res, data) => res.status(200).json({ success: true, data })),
}));

const { getHealth, getReadiness } = require('../../modules/health/health.controller');
const { getDbHealth } = require('../../config/db');

describe('health.controller', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('getHealth', () => {
    it('returns ok status with uptime and timestamp', () => {
      const before = process.uptime();
      getHealth(req, res);
      const after = process.uptime();

      expect(success).toHaveBeenCalledWith(res, expect.objectContaining({
        status: 'ok',
        timestamp: expect.any(String),
      }));
      const payload = success.mock.calls[0][1];
      expect(payload.uptime).toBeGreaterThanOrEqual(before);
      expect(payload.uptime).toBeLessThanOrEqual(after + 1);
      expect(new Date(payload.timestamp).toISOString()).toBe(payload.timestamp);
    });
  });

  describe('getReadiness', () => {
    it('returns ready when DB is connected', () => {
      getDbHealth.mockReturnValue({ state: 1, isConnected: true });

      getReadiness(req, res);

      expect(getDbHealth).toHaveBeenCalled();
      expect(success).toHaveBeenCalledWith(res, expect.objectContaining({
        status: 'ready',
        checks: { db: { state: 1, isConnected: true } },
        timestamp: expect.any(String),
      }));
    });

    it('returns degraded when DB is not connected', () => {
      getDbHealth.mockReturnValue({ state: 0, isConnected: false });

      getReadiness(req, res);

      expect(success).toHaveBeenCalledWith(res, expect.objectContaining({
        status: 'degraded',
        checks: { db: { state: 0, isConnected: false } },
      }));
    });
  });
});
