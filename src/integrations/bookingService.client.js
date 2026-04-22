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
  const res = await client.get(`/api/bookings/${safeBookingId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...contextHeaders,
    },
  });
  return res.data?.data || res.data;
}

async function markBookingAsPaid(bookingId, paymentId, token, contextHeaders = {}) {
  const safeBookingId = sanitizePathParam(bookingId, 'bookingId');
  const safePaymentId = sanitizePathParam(paymentId, 'paymentId');
  const res = await client.patch(
    `/api/bookings/${safeBookingId}/pay`,
    { paymentId: safePaymentId },
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...contextHeaders,
      },
    },
  );
  return res.data?.data || res.data;
}

module.exports = {
  getBookingById,
  markBookingAsPaid,
  sanitizePathParam,
};

