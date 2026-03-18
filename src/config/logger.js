const morgan = require('morgan');

const levels = ['error', 'warn', 'info', 'debug'];

function createLogger(level = 'info') {
  const idx = levels.indexOf(level);

  const shouldLog = (msgLevel) => {
    const msgIdx = levels.indexOf(msgLevel);
    return msgIdx <= idx;
  };

  return {
    error(message, meta) {
      if (shouldLog('error')) {
        console.error(message, meta || '');
      }
    },
    warn(message, meta) {
      if (shouldLog('warn')) {
        console.warn(message, meta || '');
      }
    },
    info(message, meta) {
      if (shouldLog('info')) {
        console.log(message, meta || '');
      }
    },
    debug(message, meta) {
      if (shouldLog('debug')) {
        console.debug(message, meta || '');
      }
    },
  };
}

function createHttpLogger() {
  return morgan('combined');
}

module.exports = {
  createLogger,
  createHttpLogger,
};

