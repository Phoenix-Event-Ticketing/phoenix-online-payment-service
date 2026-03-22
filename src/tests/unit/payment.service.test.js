jest.mock('../../integrations/bookingService.client', () => ({
  getBookingById: jest.fn(),
  markBookingAsPaid: jest.fn(),
}));

jest.mock('../../modules/payment/payment.model', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
}));

jest.mock('../../modules/payment/paymentAudit.model', () => ({
  create: jest.fn(),
}));

const { getBookingById, markBookingAsPaid } = require('../../integrations/bookingService.client');
const Payment = require('../../modules/payment/payment.model');
const PaymentAuditLog = require('../../modules/payment/paymentAudit.model');
const { PAYMENT_STATUS } = require('../../common/constants/paymentStatus');
const paymentService = require('../../modules/payment/payment.service');

describe('payment.service', () => {
  const user = { id: 'user-1', role: 'USER' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('creates payment when booking exists', async () => {
      getBookingById.mockResolvedValue({ id: 'b1' });
      const created = {
        paymentId: 'pay-1',
        bookingId: 'b1',
        userId: 'user-1',
        status: PAYMENT_STATUS.PENDING,
      };
      Payment.create.mockResolvedValue(created);
      PaymentAuditLog.create.mockResolvedValue({});

      const result = await paymentService.createPayment(
        user,
        {
          bookingId: 'b1',
          amount: 10,
          currency: 'USD',
          paymentMethod: 'CARD',
        },
        'tok',
      );

      expect(getBookingById).toHaveBeenCalledWith('b1', 'tok');
      expect(Payment.create).toHaveBeenCalled();
      expect(PaymentAuditLog.create).toHaveBeenCalled();
      expect(result.paymentId).toBe('pay-1');
    });

    it('rejects non-positive amount', async () => {
      await expect(
        paymentService.createPayment(
          user,
          { bookingId: 'b1', amount: 0, currency: 'USD', paymentMethod: 'CARD' },
          null,
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(getBookingById).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentById', () => {
    it('returns payment for owner', async () => {
      Payment.findOne.mockResolvedValue({ paymentId: 'p1', userId: 'user-1' });

      const p = await paymentService.getPaymentById(user, 'p1');
      expect(p.paymentId).toBe('p1');
    });

    it('returns payment for admin', async () => {
      Payment.findOne.mockResolvedValue({ paymentId: 'p1', userId: 'other' });

      const p = await paymentService.getPaymentById(
        { id: 'admin', role: 'ADMIN' },
        'p1',
      );
      expect(p.paymentId).toBe('p1');
    });

    it('rejects when payment not found', async () => {
      Payment.findOne.mockResolvedValue(null);

      await expect(
        paymentService.getPaymentById(user, 'p1'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('forbids other user', async () => {
      Payment.findOne.mockResolvedValue({ paymentId: 'p1', userId: 'other' });
      await expect(paymentService.getPaymentById(user, 'p1')).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('updatePaymentStatus', () => {
    it('updates status and calls booking on SUCCESS', async () => {
      const payment = {
        paymentId: 'p1',
        bookingId: 'b1',
        status: PAYMENT_STATUS.PROCESSING,
        save: jest.fn().mockResolvedValue(true),
      };
      Payment.findOne.mockResolvedValue(payment);
      PaymentAuditLog.create.mockResolvedValue({});
      markBookingAsPaid.mockResolvedValue({});

      const out = await paymentService.updatePaymentStatus(
        { id: 'admin', role: 'ADMIN' },
        'p1',
        PAYMENT_STATUS.SUCCESS,
        'tok',
      );

      expect(out.status).toBe(PAYMENT_STATUS.SUCCESS);
      expect(markBookingAsPaid).toHaveBeenCalledWith('b1', 'p1', 'tok');
    });

    it('rejects invalid transition', async () => {
      const payment = {
        paymentId: 'p1',
        status: PAYMENT_STATUS.PENDING,
        save: jest.fn(),
      };
      Payment.findOne.mockResolvedValue(payment);

      await expect(
        paymentService.updatePaymentStatus(
          { id: 'admin', role: 'ADMIN' },
          'p1',
          PAYMENT_STATUS.SUCCESS,
          null,
        ),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('records audit when markBookingAsPaid fails', async () => {
      const payment = {
        paymentId: 'p1',
        bookingId: 'b1',
        status: PAYMENT_STATUS.PROCESSING,
        save: jest.fn().mockResolvedValue(true),
      };
      Payment.findOne.mockResolvedValue(payment);
      PaymentAuditLog.create.mockResolvedValue({});
      markBookingAsPaid.mockRejectedValue(new Error('booking down'));

      await paymentService.updatePaymentStatus(
        { id: 'admin', role: 'ADMIN' },
        'p1',
        PAYMENT_STATUS.SUCCESS,
        'tok',
      );

      expect(PaymentAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'BOOKING_MARK_PAID_FAILED' }),
      );
    });
  });

  describe('cancelPayment', () => {
    it('rejects when payment not found', async () => {
      Payment.findOne.mockResolvedValue(null);

      await expect(
        paymentService.cancelPayment(user, 'p1'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects when user does not own payment', async () => {
      Payment.findOne.mockResolvedValue({
        paymentId: 'p1',
        userId: 'other',
        status: PAYMENT_STATUS.PENDING,
      });

      await expect(
        paymentService.cancelPayment(user, 'p1'),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects invalid cancel transition', async () => {
      const payment = {
        paymentId: 'p1',
        userId: 'user-1',
        status: PAYMENT_STATUS.SUCCESS,
      };
      Payment.findOne.mockResolvedValue(payment);

      await expect(
        paymentService.cancelPayment(user, 'p1'),
      ).rejects.toMatchObject({ code: 'INVALID_CANCEL_STATUS' });
    });

    it('cancels PENDING payment for owner', async () => {
      const payment = {
        paymentId: 'p1',
        userId: 'user-1',
        status: PAYMENT_STATUS.PENDING,
        save: jest.fn().mockResolvedValue(true),
      };
      Payment.findOne.mockResolvedValue(payment);
      PaymentAuditLog.create.mockResolvedValue({});

      const out = await paymentService.cancelPayment(user, 'p1');
      expect(out.status).toBe(PAYMENT_STATUS.CANCELLED);
    });
  });

  describe('getPayments', () => {
    it('lists for user', async () => {
      Payment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
      await paymentService.getPayments(user, { all: false });
      expect(Payment.find).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    it('admin all lists everything', async () => {
      Payment.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
      await paymentService.getPayments({ id: 'a', role: 'ADMIN' }, { all: true });
      expect(Payment.find).toHaveBeenCalledWith();
    });
  });
});
