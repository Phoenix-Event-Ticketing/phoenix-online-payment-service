jest.mock('../../modules/payment/payment.service', () => ({
  createPayment: jest.fn(),
  getPaymentById: jest.fn(),
  getPayments: jest.fn(),
  updatePaymentStatus: jest.fn(),
  completePayment: jest.fn(),
  cancelPayment: jest.fn(),
}));

jest.mock('../../common/utils/response', () => ({
  created: jest.fn((res, data) => res.status(201).json({ success: true, data })),
  success: jest.fn((res, data) => res.status(200).json({ success: true, data })),
}));

const paymentService = require('../../modules/payment/payment.service');
const { created, success } = require('../../common/utils/response');
const {
  handleCreatePayment,
  handleCreateInternalPayment,
  handleGetPaymentById,
  handleGetPayments,
  handleUpdatePaymentStatus,
  handleCompletePayment,
  handleCancelPayment,
} = require('../../modules/payment/payment.controller');

describe('payment.controller', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { id: 'u1', role: 'USER' },
      body: {},
      params: {},
      query: {},
      headers: {},
    };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    next = jest.fn();
  });

  describe('handleCreatePayment', () => {
    it('passes token from Authorization header', async () => {
      req.body = { bookingId: 'b1', amount: 10, currency: 'USD', paymentMethod: 'CARD' };
      req.headers.authorization = 'Bearer token123';
      const payment = { paymentId: 'p1' };
      paymentService.createPayment.mockResolvedValue(payment);

      await handleCreatePayment(req, res, next);

      expect(paymentService.createPayment).toHaveBeenCalledWith(req.user, req.body, 'token123');
      expect(created).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ paymentId: 'p1', id: 'p1', paymentReferenceId: 'p1' }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('passes undefined token when no Authorization header', async () => {
      req.body = { bookingId: 'b1', amount: 10, currency: 'USD', paymentMethod: 'CARD' };
      const payment = { paymentId: 'p1' };
      paymentService.createPayment.mockResolvedValue(payment);

      await handleCreatePayment(req, res, next);

      expect(paymentService.createPayment).toHaveBeenCalledWith(req.user, req.body, undefined);
    });

    it('calls next on error', async () => {
      paymentService.createPayment.mockRejectedValue(new Error('Service error'));

      await handleCreatePayment(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('normalizes mongoose document via toObject', async () => {
      req.body = { bookingId: 'b1', amount: 10 };
      req.headers.authorization = 'Bearer t';
      const payment = {
        paymentId: 'p1',
        toObject: () => ({ paymentId: 'p1', fromDoc: true }),
      };
      paymentService.createPayment.mockResolvedValue(payment);

      await handleCreatePayment(req, res, next);

      expect(created).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ paymentId: 'p1', id: 'p1', paymentReferenceId: 'p1', fromDoc: true }),
      );
    });

    it('uses id and paymentReferenceId fallbacks when paymentId absent', async () => {
      req.body = { bookingId: 'b1', amount: 10 };
      const payment = {
        id: 'legacy-id',
        paymentReferenceId: 'ref-99',
        toObject() {
          return { id: 'legacy-id', paymentReferenceId: 'ref-99' };
        },
      };
      paymentService.createPayment.mockResolvedValue(payment);

      await handleCreatePayment(req, res, next);

      expect(created).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          id: 'legacy-id',
          paymentReferenceId: 'ref-99',
        }),
      );
    });
  });

  describe('handleCreateInternalPayment', () => {
    it('creates payment without forwarding bearer token', async () => {
      req.body = { bookingId: 'b1', userId: 'u1', amount: 10, currency: 'USD', paymentMethod: 'CARD' };
      req.headers.authorization = 'Bearer service-token';
      const payment = { paymentId: 'p1' };
      paymentService.createPayment.mockResolvedValue(payment);

      await handleCreateInternalPayment(req, res, next);

      expect(paymentService.createPayment).toHaveBeenCalledWith(req.user, req.body, undefined);
      expect(created).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ paymentId: 'p1', id: 'p1', paymentReferenceId: 'p1' }),
      );
    });

    it('calls next on error', async () => {
      const err = new Error('internal create failed');
      paymentService.createPayment.mockRejectedValue(err);

      await handleCreateInternalPayment(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });

    it('normalizes mongoose document via toObject', async () => {
      req.body = { bookingId: 'b1', userId: 'u1', amount: 10 };
      const payment = {
        paymentId: 'p1',
        toObject: () => ({ paymentId: 'p1', extra: 1 }),
      };
      paymentService.createPayment.mockResolvedValue(payment);

      await handleCreateInternalPayment(req, res, next);

      expect(created).toHaveBeenCalledWith(
        res,
        expect.objectContaining({ paymentId: 'p1', id: 'p1', paymentReferenceId: 'p1', extra: 1 }),
      );
    });

    it('uses id and paymentReferenceId fallbacks when paymentId absent', async () => {
      req.body = { bookingId: 'b1', userId: 'u1', amount: 10 };
      const payment = {
        id: 'legacy-id',
        paymentReferenceId: 'ref-99',
        toObject() {
          return { id: 'legacy-id', paymentReferenceId: 'ref-99' };
        },
      };
      paymentService.createPayment.mockResolvedValue(payment);

      await handleCreateInternalPayment(req, res, next);

      expect(created).toHaveBeenCalledWith(
        res,
        expect.objectContaining({
          id: 'legacy-id',
          paymentReferenceId: 'ref-99',
        }),
      );
    });
  });

  describe('handleGetPaymentById', () => {
    it('returns payment on success', async () => {
      req.params = { id: 'p1' };
      const payment = { paymentId: 'p1' };
      paymentService.getPaymentById.mockResolvedValue(payment);

      await handleGetPaymentById(req, res, next);

      expect(paymentService.getPaymentById).toHaveBeenCalledWith(req.user, 'p1');
      expect(success).toHaveBeenCalledWith(res, payment);
    });

    it('calls next on error', async () => {
      req.params = { id: 'p1' };
      const err = new Error('lookup failed');
      paymentService.getPaymentById.mockRejectedValue(err);

      await handleGetPaymentById(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('handleGetPayments', () => {
    it('passes all query from req.query.all', async () => {
      req.query = { all: 'true' };
      req.user = { id: 'a1', role: 'ADMIN' };
      const payments = [];
      paymentService.getPayments.mockResolvedValue(payments);

      await handleGetPayments(req, res, next);

      expect(paymentService.getPayments).toHaveBeenCalledWith(req.user, { all: 'true' });
      expect(success).toHaveBeenCalledWith(res, payments);
    });

    it('calls next on error', async () => {
      const err = new Error('list failed');
      paymentService.getPayments.mockRejectedValue(err);

      await handleGetPayments(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('handleUpdatePaymentStatus', () => {
    it('passes token and status', async () => {
      req.params = { id: 'p1' };
      req.body = { status: 'SUCCESS' };
      req.headers.authorization = 'Bearer tok';
      req.user = { id: 'a1', role: 'ADMIN' };
      const payment = { paymentId: 'p1', status: 'SUCCESS' };
      paymentService.updatePaymentStatus.mockResolvedValue(payment);

      await handleUpdatePaymentStatus(req, res, next);

      expect(paymentService.updatePaymentStatus).toHaveBeenCalledWith(
        req.user,
        'p1',
        'SUCCESS',
        'tok',
      );
      expect(success).toHaveBeenCalledWith(res, payment);
    });

    it('calls next on error', async () => {
      req.params = { id: 'p1' };
      req.body = { status: 'SUCCESS' };
      const err = new Error('update failed');
      paymentService.updatePaymentStatus.mockRejectedValue(err);

      await handleUpdatePaymentStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('handleCancelPayment', () => {
    it('returns cancelled payment on success', async () => {
      req.params = { id: 'p1' };
      const payment = { paymentId: 'p1', status: 'CANCELLED' };
      paymentService.cancelPayment.mockResolvedValue(payment);

      await handleCancelPayment(req, res, next);

      expect(paymentService.cancelPayment).toHaveBeenCalledWith(req.user, 'p1');
      expect(success).toHaveBeenCalledWith(res, payment);
    });

    it('calls next on error', async () => {
      req.params = { id: 'p1' };
      const err = new Error('cancel failed');
      paymentService.cancelPayment.mockRejectedValue(err);

      await handleCancelPayment(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('handleCompletePayment', () => {
    it('completes payment with bearer token', async () => {
      req.params = { id: 'p1' };
      req.body = { status: 'SUCCESS', paymentMethod: 'BANK_TRANSFER' };
      req.headers.authorization = 'Bearer tok';
      const payment = { paymentId: 'p1', status: 'SUCCESS' };
      paymentService.completePayment.mockResolvedValue(payment);

      await handleCompletePayment(req, res, next);

      expect(paymentService.completePayment).toHaveBeenCalledWith(
        req.user,
        'p1',
        'SUCCESS',
        'tok',
        'BANK_TRANSFER',
      );
      expect(success).toHaveBeenCalledWith(res, payment);
    });

    it('calls next on error', async () => {
      req.params = { id: 'p1' };
      req.body = { status: 'SUCCESS' };
      const err = new Error('complete failed');
      paymentService.completePayment.mockRejectedValue(err);

      await handleCompletePayment(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
