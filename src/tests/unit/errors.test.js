const {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
} = require('../../common/errors/index');

describe('errors/index', () => {
  describe('AppError', () => {
    it('creates error with message, statusCode, code', () => {
      const err = new AppError('Test', 400, 'TEST_CODE');

      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('AppError');
      expect(err.message).toBe('Test');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('TEST_CODE');
      expect(err.details).toBeUndefined();
    });

    it('supports optional details', () => {
      const err = new AppError('Val', 422, 'VALIDATION', { field: 'email' });

      expect(err.details).toEqual({ field: 'email' });
    });
  });

  describe('badRequest', () => {
    it('returns AppError with defaults', () => {
      const err = badRequest();

      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.message).toBe('Bad request');
    });

    it('accepts custom message and code', () => {
      const err = badRequest('Invalid input', 'INVALID_INPUT');

      expect(err.message).toBe('Invalid input');
      expect(err.code).toBe('INVALID_INPUT');
    });

    it('accepts details', () => {
      const err = badRequest('Validation failed', 'VALIDATION', { errors: [] });

      expect(err.details).toEqual({ errors: [] });
    });
  });

  describe('unauthorized', () => {
    it('returns AppError with defaults', () => {
      const err = unauthorized();

      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.message).toBe('Unauthorized');
    });

    it('accepts custom message and code', () => {
      const err = unauthorized('Token expired', 'TOKEN_EXPIRED');

      expect(err.message).toBe('Token expired');
      expect(err.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('forbidden', () => {
    it('returns AppError with defaults', () => {
      const err = forbidden();

      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('Forbidden');
    });

    it('accepts custom message and code', () => {
      const err = forbidden('Access denied', 'ACCESS_DENIED');

      expect(err.message).toBe('Access denied');
      expect(err.code).toBe('ACCESS_DENIED');
    });
  });

  describe('notFound', () => {
    it('returns AppError with defaults', () => {
      const err = notFound();

      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Not found');
    });

    it('accepts custom message and code', () => {
      const err = notFound('Payment not found', 'PAYMENT_NOT_FOUND');

      expect(err.message).toBe('Payment not found');
      expect(err.code).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('conflict', () => {
    it('returns AppError with defaults', () => {
      const err = conflict();

      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
      expect(err.message).toBe('Conflict');
    });

    it('accepts custom message and code', () => {
      const err = conflict('Duplicate payment', 'DUPLICATE_PAYMENT');

      expect(err.message).toBe('Duplicate payment');
      expect(err.code).toBe('DUPLICATE_PAYMENT');
    });
  });
});
