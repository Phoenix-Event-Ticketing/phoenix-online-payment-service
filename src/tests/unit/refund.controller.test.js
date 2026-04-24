jest.mock('../../modules/refund/refund.service', () => ({
  requestRefund: jest.fn(),
  processRefund: jest.fn(),
  getRefundById: jest.fn(),
  getRefunds: jest.fn(),
  getRefundsForPayment: jest.fn(),
}));

jest.mock('../../common/utils/response', () => ({
  created: jest.fn((res, data) => res.status(201).json({ success: true, data })),
  success: jest.fn((res, data) => res.status(200).json({ success: true, data })),
}));

const refundService = require('../../modules/refund/refund.service');
const { created, success } = require('../../common/utils/response');
const {
  handleCreateRefund,
  handleProcessRefund,
  handleGetRefundById,
  handleGetRefunds,
  handleGetRefundsForPayment,
} = require('../../modules/refund/refund.controller');

describe('refund.controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { id: 'u1', role: 'USER' }, body: {}, params: {}, headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  describe('handleCreateRefund', () => {
    it('returns created refund on success', async () => {
      const refund = { refundId: 'r1' };
      refundService.requestRefund.mockResolvedValue(refund);

      await handleCreateRefund(req, res, next);

      expect(refundService.requestRefund).toHaveBeenCalledWith(req.user, req.body);
      expect(created).toHaveBeenCalledWith(res, refund);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next on error', async () => {
      const err = new Error('Service error');
      refundService.requestRefund.mockRejectedValue(err);

      await handleCreateRefund(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('handleProcessRefund', () => {
    it('returns refund on success', async () => {
      req.params = { id: 'r1' };
      req.body = { status: 'COMPLETED' };
      req.user = { id: 'a1', role: 'ADMIN' };
      const refund = { refundId: 'r1', refundStatus: 'COMPLETED' };
      refundService.processRefund.mockResolvedValue(refund);

      await handleProcessRefund(req, res, next);

      expect(refundService.processRefund).toHaveBeenCalledWith(req.user, 'r1', 'COMPLETED');
      expect(success).toHaveBeenCalledWith(res, refund);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next on error', async () => {
      req.params = { id: 'r1' };
      req.body = { status: 'INVALID' };
      const err = new Error('Invalid status');
      refundService.processRefund.mockRejectedValue(err);

      await handleProcessRefund(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('handleGetRefundById', () => {
    it('returns refund on success', async () => {
      req.params = { id: 'r1' };
      const refund = { refundId: 'r1' };
      refundService.getRefundById.mockResolvedValue(refund);

      await handleGetRefundById(req, res, next);

      expect(refundService.getRefundById).toHaveBeenCalledWith(req.user, 'r1');
      expect(success).toHaveBeenCalledWith(res, refund);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next on error', async () => {
      req.params = { id: 'r1' };
      refundService.getRefundById.mockRejectedValue(new Error('Not found'));

      await handleGetRefundById(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('handleGetRefundsForPayment', () => {
    it('returns refunds on success', async () => {
      req.params = { paymentId: 'p1' };
      const refunds = [{ refundId: 'r1' }];
      refundService.getRefundsForPayment.mockResolvedValue(refunds);

      await handleGetRefundsForPayment(req, res, next);

      expect(refundService.getRefundsForPayment).toHaveBeenCalledWith(req.user, 'p1');
      expect(success).toHaveBeenCalledWith(res, refunds);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('handleGetRefunds', () => {
    it('returns refund list on success', async () => {
      req.query = { all: 'true' };
      const refunds = [{ refundId: 'r1' }];
      refundService.getRefunds.mockResolvedValue(refunds);

      await handleGetRefunds(req, res, next);

      expect(refundService.getRefunds).toHaveBeenCalledWith(req.user, { all: 'true' });
      expect(success).toHaveBeenCalledWith(res, refunds);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
