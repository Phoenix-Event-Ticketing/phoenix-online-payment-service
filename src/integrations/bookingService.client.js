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

function buildHeaders(token, contextHeaders = {}) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...contextHeaders,
  };
}

async function getBookingById(bookingId, token, contextHeaders = {}) {
  const safeBookingId = sanitizePathParam(bookingId, 'bookingId');
  const headers = buildHeaders(token, contextHeaders);

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
  return postBookingPaymentCallback(
    bookingId,
    paymentReferenceId,
    'SUCCESS',
    token,
    contextHeaders,
  );
}

async function markBookingPaymentFailed(bookingId, paymentReferenceId, token, contextHeaders = {}) {
  return postBookingPaymentCallback(
    bookingId,
    paymentReferenceId,
    'FAILED',
    token,
    contextHeaders,
  );
}

async function postBookingPaymentCallback(
  bookingId,
  paymentReferenceId,
  paymentStatus,
  token,
  contextHeaders = {},
) {
  const safeBookingId = sanitizePathParam(bookingId, 'bookingId');
  const safePaymentReferenceId = sanitizePathParam(paymentReferenceId, 'paymentReferenceId');
  const callbackPayload = {
    bookingId: safeBookingId,
    paymentReferenceId: safePaymentReferenceId,
    paymentStatus,
    transactionId: safePaymentReferenceId,
  };
  const headers = buildHeaders(token, contextHeaders);

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
