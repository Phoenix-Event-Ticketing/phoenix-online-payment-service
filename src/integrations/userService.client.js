// Placeholder client for future use if the Payment service needs
// to call User Service over REST. Currently, authentication is
// handled purely by verifying JWT tokens issued by User Service.
const axios = require('axios');
const env = require('../config/env');

const client = axios.create({
  baseURL: env.userServiceBaseUrl,
  timeout: 5000,
});

async function getUserById(userId, token) {
  const res = await client.get(`/api/users/${userId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return res.data?.data || res.data;
}

module.exports = {
  getUserById,
};

