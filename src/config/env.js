const dotenv = require('dotenv');

dotenv.config();

const required = (name, value) => {
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4002,
  mongoUri: required('MONGO_URI', process.env.MONGO_URI),
  jwtSecret: required('JWT_SECRET', process.env.JWT_SECRET),
  bookingServiceBaseUrl:
    process.env.BOOKING_SERVICE_BASE_URL || 'http://localhost:4001',
  userServiceBaseUrl:
    process.env.USER_SERVICE_BASE_URL || 'http://localhost:4000',
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = env;

