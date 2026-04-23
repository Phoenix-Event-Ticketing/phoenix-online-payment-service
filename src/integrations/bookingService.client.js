const axios = require('axios');
const env = require('../config/env');
const {
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  AppError,
} = require('../common/errors');

const client = axios.create({
  baseURL: env.bookingServiceBaseUrl,
  timeout: 5000,
});

function sanitizePathParam(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  // Accept common id characters only; reject traversal/control characters.
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${fieldName} has invalid characters`);
  }

  return encodeURIComponent(value);
}

function handleAxiosError(error) {
  if (error.response) {
    const upstreamStatus = error.response.status;
    const upstreamMessage =
      error.response.data?.message || `Booking service error: ${error.message}`;

    // Return a clear upstream dependency error so clients know this came
    // from Booking service, not from Payment service auth middleware.
    if (upstreamStatus === 401 || upstreamStatus === 403) {
      throw new AppError(
        `Booking service rejected payment pre-check: ${upstreamMessage}`,
        502,
        'BOOKING_SERVICE_AUTH_REJECTED',
        {
          upstreamService: 'booking-service',
          upstreamStatus,
        },
      );
    }

    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    throw new AppError(
      upstreamMessage,
      upstreamStatus,
      error.response.data?.errorCode || 'BOOKING_SERVICE_ERROR',
      error.response.data?.details,
    );
  } else if (error.request) {
    // The request was made but no response was received
    throw new AppError(
      'Booking service request failed: No response received',
      503,
      'BOOKING_SERVICE_UNAVAILABLE',
    );
  } else {
    // Something happened in setting up the request
    throw new AppError(
      `Booking service error: ${error.message}`,
      500,
      'BOOKING_SERVICE_ERROR',
    );
  }
}

function buildHeaders(token, contextHeaders = {}) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...contextHeaders,
  };

  try {
    const res = await client.get(`/bookings/${safeBookingId}`, { headers });
    return res.data?.data || res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      // Backward-compatible fallback while environments are moved off /api-prefixed routes.
      try {
        const res = await client.get(`/api/bookings/${safeBookingId}`, { headers });
        return res.data?.data || res.data;
      } catch (fallbackErr) {
        throw mapBookingServiceError(fallbackErr, 'BOOKING_LOOKUP_FAILED');
      }
    }
    throw mapBookingServiceError(err, 'BOOKING_LOOKUP_FAILED');
  }
}

async function markBookingAsPaid(bookingId, paymentReferenceId, token, contextHeaders = {}) {
  const safeBookingId = sanitizePathParam(bookingId, 'bookingId');
  const safePaymentReferenceId = sanitizePathParam(paymentReferenceId, 'paymentReferenceId');
  const callbackPayload = {
    bookingId: safeBookingId,
    paymentReferenceId: safePaymentReferenceId,
    paymentStatus: 'SUCCESS',
    transactionId: safePaymentReferenceId,
  };
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...contextHeaders,
  };

  try {
    const res = await client.post(
      '/bookings/payment-callback',
      callbackPayload,
      { headers },
    );
    return res.data?.data || res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      // Backward-compatible fallback for deployments exposing /api prefix.
      try {
        const res = await client.post(
          '/api/bookings/payment-callback',
          callbackPayload,
          { headers },
        );
        return res.data?.data || res.data;
      } catch (fallbackErr) {
        throw mapBookingServiceError(fallbackErr, 'BOOKING_PAYMENT_CALLBACK_FAILED');
      }
    }
    throw mapBookingServiceError(err, 'BOOKING_PAYMENT_CALLBACK_FAILED');
  }
}

async function markBookingPaymentFailed(bookingId, paymentReferenceId, token, contextHeaders = {}) {
  const safeBookingId = sanitizePathParam(bookingId, 'bookingId');
  const safePaymentReferenceId = sanitizePathParam(paymentReferenceId, 'paymentReferenceId');
  const callbackPayload = {
    bookingId: safeBookingId,
    paymentReferenceId: safePaymentReferenceId,
    paymentStatus: 'FAILED',
    transactionId: safePaymentReferenceId,
  };
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...contextHeaders,
  };
  try {
    const res = await client.post(
      '/bookings/payment-callback',
      callbackPayload,
      { headers },
    );
    return res.data?.data || res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      try {
        const res = await client.post(
          '/api/bookings/payment-callback',
          callbackPayload,
          { headers },
        );
        return res.data?.data || res.data;
      } catch (fallbackErr) {
        throw mapBookingServiceError(fallbackErr, 'BOOKING_PAYMENT_CALLBACK_FAILED');
      }
    }
    throw mapBookingServiceError(err, 'BOOKING_PAYMENT_CALLBACK_FAILED');
  }
}

function mapBookingServiceError(err, defaultCode) {
  const upstreamStatus = err?.response?.status;
  const upstreamMessage =
    err?.response?.data?.message || err?.message || 'Booking service request failed';

  if (upstreamStatus === 400) {
    return badRequest(upstreamMessage, defaultCode);
  }
  if (upstreamStatus === 401) {
    return unauthorized('Booking service rejected authentication', defaultCode);
  }
  if (upstreamStatus === 403) {
    return forbidden('Booking service denied access', defaultCode);
  }
  if (upstreamStatus === 404) {
    return notFound('Booking not found', defaultCode);
  }

  return new AppError(
    'Booking service is unavailable',
    502,
    defaultCode,
    { upstreamStatus: upstreamStatus || null },
  );
}

module.exports = {
  getBookingById,
  markBookingAsPaid,
  markBookingPaymentFailed,
  sanitizePathParam,
};
