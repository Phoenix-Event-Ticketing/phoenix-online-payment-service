const axios = require('axios');
const env = require('../config/env');
const { AppError } = require('../common/errors');

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
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    throw new AppError(
      error.response.data?.message || `Booking service error: ${error.message}`,
      error.response.status,
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
}

function shouldFallbackToApiPrefix(error) {
  const status = error?.response?.status;
  return status === 404 || status === 405;
}

async function getBookingById(bookingId, token, contextHeaders = {}) {
  try {
    const safeBookingId = sanitizePathParam(bookingId, 'bookingId');
    let res;

    try {
      res = await client.get(`/bookings/${safeBookingId}`, {
        headers: buildHeaders(token, contextHeaders),
      });
    } catch (err) {
      if (!shouldFallbackToApiPrefix(err)) {
        throw err;
      }

      // Backward-compatible fallback for environments still exposing /api-prefixed routes.
      res = await client.get(`/api/bookings/${safeBookingId}`, {
        headers: buildHeaders(token, contextHeaders),
      });
    }

    return res.data?.data || res.data;
  } catch (err) {
    handleAxiosError(err);
  }
}

async function markBookingAsPaid(bookingId, paymentReferenceId, token, contextHeaders = {}) {
  try {
    const safeBookingId = sanitizePathParam(bookingId, 'bookingId');
    const safePaymentReferenceId = sanitizePathParam(
      paymentReferenceId,
      'paymentReferenceId',
    );
    const callbackPayload = {
      bookingId: safeBookingId,
      paymentReferenceId: safePaymentReferenceId,
      paymentStatus: 'SUCCESS',
      transactionId: safePaymentReferenceId,
    };
    let res;

    try {
      res = await client.post('/bookings/payment-callback', callbackPayload, {
        headers: buildHeaders(token, contextHeaders),
      });
    } catch (err) {
      if (!shouldFallbackToApiPrefix(err)) {
        throw err;
      }

      // Backward-compatible fallback for deployments exposing /api prefix.
      res = await client.post(
        '/api/bookings/payment-callback',
        callbackPayload,
        {
          headers: buildHeaders(token, contextHeaders),
        },
      );
    }

    return res.data?.data || res.data;
  } catch (err) {
    handleAxiosError(err);
  }
}

async function markBookingPaymentFailed(
  bookingId,
  paymentReferenceId,
  token,
  contextHeaders = {},
) {
  try {
    const safeBookingId = sanitizePathParam(bookingId, 'bookingId');
    const safePaymentReferenceId = sanitizePathParam(
      paymentReferenceId,
      'paymentReferenceId',
    );
    const callbackPayload = {
      bookingId: safeBookingId,
      paymentReferenceId: safePaymentReferenceId,
      paymentStatus: 'FAILED',
      transactionId: safePaymentReferenceId,
    };
    let res;

    try {
      res = await client.post('/bookings/payment-callback', callbackPayload, {
        headers: buildHeaders(token, contextHeaders),
      });
    } catch (err) {
      if (!shouldFallbackToApiPrefix(err)) {
        throw err;
      }

      res = await client.post(
        '/api/bookings/payment-callback',
        callbackPayload,
        {
          headers: buildHeaders(token, contextHeaders),
        },
      );
    }

    return res.data?.data || res.data;
  } catch (err) {
    handleAxiosError(err);
  }
}

module.exports = {
  getBookingById,
  markBookingAsPaid,
  markBookingPaymentFailed,
  sanitizePathParam,
};

