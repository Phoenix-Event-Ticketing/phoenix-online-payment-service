// Jest bootstrap: env required before any module loads config/env.js
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/phoenix_payment_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'jest-jwt-secret-do-not-use-in-prod';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
