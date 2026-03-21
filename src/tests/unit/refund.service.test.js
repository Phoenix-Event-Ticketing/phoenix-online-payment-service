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
    Refund: { create: jest.fn(), findOne: jest.fn() },
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
  });

  describe('processRefund', () => {
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
});
