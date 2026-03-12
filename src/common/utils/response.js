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
  return res.status(statusCode || 500).json({
    success: false,
    error: {
      message: message || 'Unexpected error',
      code: code || 'INTERNAL_ERROR',
      details: details || null,
    },
  });
}

module.exports = {
  success,
  created,
  noContent,
  error,
};

