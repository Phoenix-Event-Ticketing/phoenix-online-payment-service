// Placeholder client for future use if the Payment service needs
// to call User Service over REST. Currently, authentication is
// handled purely by verifying JWT tokens issued by User Service.
const axios = require('axios');
const env = require('../config/env');
const { AppError } = require('../common/errors');

const client = axios.create({
  baseURL: env.userServiceBaseUrl,
  timeout: 5000,
});

function handleAxiosError(error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    throw new AppError(
      error.response.data?.message || `User service error: ${error.message}`,
      error.response.status,
      error.response.data?.errorCode || 'USER_SERVICE_ERROR',
      error.response.data?.details,
    );
  } else if (error.request) {
    // The request was made but no response was received
    throw new AppError(
      'User service request failed: No response received',
      503,
      'USER_SERVICE_UNAVAILABLE',
    );
  } else {
    // Something happened in setting up the request
    throw new AppError(
      `User service error: ${error.message}`,
      500,
      'USER_SERVICE_ERROR',
    );
  }
}

async function getUserById(userId, token) {
  try {
    const res = await client.get(`/api/users/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data?.data || res.data;
  } catch (err) {
    handleAxiosError(err);
  }
}

module.exports = {
  getUserById,
};

