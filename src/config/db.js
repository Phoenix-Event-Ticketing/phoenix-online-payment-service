const mongoose = require('mongoose');
const env = require('./env');

async function connectDb(logger) {
  const mongoUri = env.mongoUri;

  // Do not log full URI (credentials). Log intent only.
  logger.info('Connecting to MongoDB');

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { err });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(mongoUri, {
    autoIndex: env.nodeEnv !== 'production',
  });
}

async function disconnectDb(logger) {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

function getDbHealth() {
  const state = mongoose.connection.readyState;
  // 1: connected, 2: connecting
  return {
    state,
    isConnected: state === 1,
  };
}

module.exports = {
  connectDb,
  disconnectDb,
  getDbHealth,
};

