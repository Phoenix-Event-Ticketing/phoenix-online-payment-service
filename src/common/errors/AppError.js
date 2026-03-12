class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode || 500;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

