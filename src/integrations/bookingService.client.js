const axios = require('axios');
const env = require('../config/env');

const client = axios.create({
  baseURL: env.bookingServiceBaseUrl,
  timeout: 5000,
});

async function getBookingById(bookingId, token) {
  const res = await client.get(`/api/bookings/${bookingId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return res.data?.data || res.data;
}

async function markBookingAsPaid(bookingId, paymentId, token) {
  const res = await client.patch(
    `/api/bookings/${bookingId}/pay`,
    { paymentId },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return res.data?.data || res.data;
}

module.exports = {
  getBookingById,
  markBookingAsPaid,
};

