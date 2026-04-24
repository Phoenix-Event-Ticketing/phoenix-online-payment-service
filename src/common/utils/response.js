function success(res, data, meta) {
  return res.status(200).json({
    success: true,
    data,
    meta: meta || null,
  });
}

function created(res, data, meta) {
  return res.status(201).json({
    success: true,
    data,
    meta: meta || null,
  });
}

function noContent(res) {
  return res.status(204).send();
}

function error(res, statusCode, message, code, details) {
  const status = statusCode || 500;
  return res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    error: statusText(status),
    errorCode: code || 'INTERNAL_ERROR',
    message: message || 'Unexpected error',
    details: details || null,
    requestId: res.getHeader ? res.getHeader('X-Request-Id') || null : null,
    traceId: res.getHeader ? res.getHeader('X-Trace-Id') || null : null,
  });
}

function statusText(status) {
  if (status === 400) return 'Bad Request';
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  if (status === 404) return 'Not Found';
  if (status === 409) return 'Conflict';
  if (status === 500) return 'Internal Server Error';
  if (status === 502) return 'Bad Gateway';
  return 'Error';
}

module.exports = {
  success,
  created,
  noContent,
  error,
};

