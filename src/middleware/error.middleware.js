const { AppError } = require('../common/errors');
const { error: sendError } = require('../common/utils/response');
const { getLogger } = require('../config/logger');

// 404 handler for unmatched routes
function notFoundHandler(req, res, next) {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  next(err);
}

// Central error handler
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    err.message || (statusCode === 500 ? 'Internal server error' : 'Error');

  const logger = getLogger();
  logger.error('Request error', {
    message: err.message,
    code: err.code,
    statusCode,
    stack: err.stack,
  });

  return sendError(res, statusCode, message, code, err.details);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

