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
        // eslint-disable-next-line no-console
        console.error(message, meta || '');
      }
    },
    warn(message, meta) {
      if (shouldLog('warn')) {
        // eslint-disable-next-line no-console
        console.warn(message, meta || '');
      }
    },
    info(message, meta) {
      if (shouldLog('info')) {
        // eslint-disable-next-line no-console
        console.log(message, meta || '');
      }
    },
    debug(message, meta) {
      if (shouldLog('debug')) {
        // eslint-disable-next-line no-console
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

