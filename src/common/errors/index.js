const AppError = require('./AppError');

const badRequest = (message, code = 'BAD_REQUEST', details) =>
  new AppError(message || 'Bad request', 400, code, details);

const unauthorized = (message, code = 'UNAUTHORIZED') =>
  new AppError(message || 'Unauthorized', 401, code);

const forbidden = (message, code = 'FORBIDDEN') =>
  new AppError(message || 'Forbidden', 403, code);

const notFound = (message, code = 'NOT_FOUND') =>
  new AppError(message || 'Not found', 404, code);

const conflict = (message, code = 'CONFLICT') =>
  new AppError(message || 'Conflict', 409, code);

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
};

