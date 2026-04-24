jest.mock('../../modules/payment/payment.model', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../modules/refund/refund.model', () => {
  const REFUND_STATUS = {
    REQUESTED: 'REQUESTED',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    COMPLETED: 'COMPLETED',
  };
  return {
    Refund: { create: jest.fn(), findOne: jest.fn(), find: jest.fn() },
    REFUND_STATUS,
  };
});

jest.mock('../../modules/payment/paymentAudit.model', () => ({
  create: jest.fn(),
}));

const Payment = require('../../modules/payment/payment.model');
const { Refund, REFUND_STATUS } = require('../../modules/refund/refund.model');
const PaymentAuditLog = require('../../modules/payment/paymentAudit.model');
const { PAYMENT_STATUS } = require('../../common/constants/paymentStatus');
const refundService = require('../../modules/refund/refund.service');

describe('refund.service', () => {
  const user = { id: 'user-1', role: 'USER' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestRefund', () => {
    it('creates refund for successful payment owned by user', async () => {
      Payment.findOne.mockResolvedValue({
        paymentId: 'p1',
        userId: 'user-1',
        status: PAYMENT_STATUS.SUCCESS,
        amount: 100,
      });
      const refundDoc = { refundId: 'r1', refundAmount: 50 };
      Refund.create.mockResolvedValue(refundDoc);
      PaymentAuditLog.create.mockResolvedValue({});

      const r = await refundService.requestRefund(user, {
        paymentId: 'p1',
        refundAmount: 50,
        refundReason: 'test',
      });

      expect(r.refundId).toBe('r1');
      expect(Refund.create).toHaveBeenCalled();
    });

    it('rejects non-string paymentId', async () => {
      await expect(
        refundService.requestRefund(user, {
          paymentId: { $ne: '' },
          refundAmount: 1,
          refundReason: 'x',
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects when payment not successful', async () => {
      Payment.findOne.mockResolvedValue({
        paymentId: 'p1',
        userId: 'user-1',
        status: PAYMENT_STATUS.PENDING,
        amount: 100,
      });

      await expect(
        refundService.requestRefund(user, {
          paymentId: 'p1',
          refundAmount: 10,
          refundReason: 'x',
        }),
      ).rejects.toMatchObject({ code: 'REFUND_ONLY_SUCCESS' });
    });

    it('rejects when payment not found', async () => {
      Payment.findOne.mockResolvedValue(null);

      await expect(
        refundService.requestRefund(user, {
          paymentId: 'p1',
          refundAmount: 10,
          refundReason: 'x',
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects when refund amount exceeds payment', async () => {
      Payment.findOne.mockResolvedValue({
        paymentId: 'p1',
        userId: 'user-1',
        status: PAYMENT_STATUS.SUCCESS,
        amount: 100,
      });

      await expect(
        refundService.requestRefund(user, {
          paymentId: 'p1',
          refundAmount: 150,
          refundReason: 'x',
        }),
      ).rejects.toMatchObject({ code: 'REFUND_AMOUNT_EXCEEDS_PAYMENT' });
    });

    it('rejects when user does not own payment', async () => {
      Payment.findOne.mockResolvedValue({
        paymentId: 'p1',
        userId: 'other-user',
        status: PAYMENT_STATUS.SUCCESS,
        amount: 100,
      });

      await expect(
        refundService.requestRefund(user, {
          paymentId: 'p1',
          refundAmount: 10,
          refundReason: 'x',
        }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('processRefund', () => {
    it('rejects when refund not found', async () => {
      Refund.findOne.mockResolvedValue(null);

      await expect(
        refundService.processRefund(
          { id: 'admin', role: 'ADMIN' },
          'r1',
          REFUND_STATUS.COMPLETED,
        ),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects when non-admin processes', async () => {
      Refund.findOne.mockResolvedValue({
        refundId: 'r1',
        paymentId: 'p1',
        refundStatus: REFUND_STATUS.REQUESTED,
      });

      await expect(
        refundService.processRefund(user, 'r1', REFUND_STATUS.COMPLETED),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects invalid refund status', async () => {
      Refund.findOne.mockResolvedValue({
        refundId: 'r1',
        paymentId: 'p1',
        refundStatus: REFUND_STATUS.REQUESTED,
        save: jest.fn(),
      });

      await expect(
        refundService.processRefund(
          { id: 'admin', role: 'ADMIN' },
          'r1',
          'INVALID_STATUS',
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('marks payment REFUNDED when COMPLETED', async () => {
      const refund = {
        refundId: 'r1',
        paymentId: 'p1',
        refundStatus: REFUND_STATUS.REQUESTED,
        save: jest.fn().mockResolvedValue(true),
      };
      Refund.findOne.mockResolvedValue(refund);
      const payment = {
        paymentId: 'p1',
        status: PAYMENT_STATUS.SUCCESS,
        save: jest.fn().mockResolvedValue(true),
      };
      Payment.findOne.mockResolvedValue(payment);
      PaymentAuditLog.create.mockResolvedValue({});

      await refundService.processRefund(
        { id: 'admin', role: 'ADMIN' },
        'r1',
        REFUND_STATUS.COMPLETED,
      );

      expect(payment.status).toBe(PAYMENT_STATUS.REFUNDED);
      expect(payment.save).toHaveBeenCalled();
    });
  });

  describe('getRefundById', () => {
    it('returns refund for owner', async () => {
      const refund = { refundId: 'r1', userId: 'user-1' };
      Refund.findOne.mockResolvedValue(refund);

      const r = await refundService.getRefundById(user, 'r1');
      expect(r).toEqual(refund);
    });

    it('returns refund for admin', async () => {
      const refund = { refundId: 'r1', userId: 'other' };
      Refund.findOne.mockResolvedValue(refund);

      const r = await refundService.getRefundById(
        { id: 'admin', role: 'ADMIN' },
        'r1',
      );
      expect(r).toEqual(refund);
    });

    it('rejects when refund not found', async () => {
      Refund.findOne.mockResolvedValue(null);

      await expect(
        refundService.getRefundById(user, 'r1'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects when user does not own refund', async () => {
      Refund.findOne.mockResolvedValue({ refundId: 'r1', userId: 'other' });

      await expect(
        refundService.getRefundById(user, 'r1'),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('getRefundsForPayment', () => {
    it('returns refunds for user with userId filter', async () => {
      Refund.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ refundId: 'r1' }]),
      });

      const list = await refundService.getRefundsForPayment(user, 'p1');

      expect(Refund.find).toHaveBeenCalledWith({
        paymentId: 'p1',
        userId: 'user-1',
      });
      expect(list).toEqual([{ refundId: 'r1' }]);
    });

    it('admin gets all refunds for payment without userId filter', async () => {
      Refund.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ refundId: 'r1' }]),
      });

      await refundService.getRefundsForPayment(
        { id: 'admin', role: 'ADMIN' },
        'p1',
      );

      expect(Refund.find).toHaveBeenCalledWith({ paymentId: 'p1' });
    });
  });

  describe('getRefunds', () => {
    it('returns refunds for user with userId filter', async () => {
      Refund.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ refundId: 'r1' }]),
      });

      const list = await refundService.getRefunds(user, { all: false });

      expect(Refund.find).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(list).toEqual([{ refundId: 'r1' }]);
    });

    it('admin gets all refunds', async () => {
      Refund.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ refundId: 'r1' }]),
      });

      await refundService.getRefunds({ id: 'admin', role: 'ADMIN' }, { all: true });

      expect(Refund.find).toHaveBeenCalledWith();
    });
  });
});
