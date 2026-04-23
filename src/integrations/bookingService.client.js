const axios = require('axios');
const env = require('../config/env');

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

async function getBookingById(bookingId, token, contextHeaders = {}) {
  const safeBookingId = sanitizePathParam(bookingId, 'bookingId');
  let res;
  try {
    res = await client.get(`/bookings/${safeBookingId}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...contextHeaders,
      },
    });
  } catch {
    // Backward-compatible fallback while environments are moved off /api-prefixed routes.
    res = await client.get(`/api/bookings/${safeBookingId}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...contextHeaders,
      },
    });
  }
  return res.data?.data || res.data;
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
  let res;
  try {
    res = await client.post(
      '/bookings/payment-callback',
      callbackPayload,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...contextHeaders,
        },
      },
    );
  } catch {
    // Backward-compatible fallback for deployments exposing /api prefix.
    res = await client.post(
      '/api/bookings/payment-callback',
      callbackPayload,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...contextHeaders,
        },
      },
    );
  }
  return res.data?.data || res.data;
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
  let res;
  try {
    res = await client.post(
      '/bookings/payment-callback',
      callbackPayload,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...contextHeaders,
        },
      },
    );
  } catch {
    res = await client.post(
      '/api/bookings/payment-callback',
      callbackPayload,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...contextHeaders,
        },
      },
    );
  }
  return res.data?.data || res.data;
}

module.exports = {
  getBookingById,
  markBookingAsPaid,
  markBookingPaymentFailed,
  sanitizePathParam,
};

