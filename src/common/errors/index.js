const AppError = require('./AppError');

const badRequest = (message, code, details) =>
  new AppError(message || 'Bad request', 400, code || 'BAD_REQUEST', details);

const unauthorized = (message, code) =>
  new AppError(message || 'Unauthorized', 401, code || 'UNAUTHORIZED');

const forbidden = (message, code) =>
  new AppError(message || 'Forbidden', 403, code || 'FORBIDDEN');

const notFound = (message, code) =>
  new AppError(message || 'Not found', 404, code || 'NOT_FOUND');

const conflict = (message, code) =>
  new AppError(message || 'Conflict', 409, code || 'CONFLICT');

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
};

