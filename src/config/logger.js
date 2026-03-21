const morgan = require('morgan');
const env = require('./env');

/** Numeric priority: lower = more severe */
const LEVEL_ORDER = { error: 0, warn: 1, info: 2, debug: 3 };

let rootLogger;

function thresholdOrder(overrideLevel) {
  const key = overrideLevel || env.logLevel || 'info';
  return LEVEL_ORDER[key] ?? LEVEL_ORDER.info;
}

function shouldEmit(level, minOrder) {
  if (level === 'error') return true;
  const lo = LEVEL_ORDER[level];
  if (lo === undefined) return true;
  return lo <= minOrder;
}

function writeStructured(level, message, meta) {
  const base = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    service: 'phoenix-payment-service',
    env: env.nodeEnv,
  };
  const payload =
    meta && typeof meta === 'object' && Object.keys(meta).length
      ? { ...base, ...meta }
      : base;
  const line = `${JSON.stringify(payload)}\n`;
  if (level === 'error') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

/**
 * Application logger: one JSON object per line (log aggregation friendly).
 * @param {string} [overrideLevel] optional min level for this instance
 */
function createLogger(overrideLevel) {
  const minOrder = thresholdOrder(overrideLevel);

  rootLogger = {
    error(message, meta) {
      writeStructured('error', message, meta);
    },
    warn(message, meta) {
      if (!shouldEmit('warn', minOrder)) return;
      writeStructured('warn', message, meta);
    },
    info(message, meta) {
      if (!shouldEmit('info', minOrder)) return;
      writeStructured('info', message, meta);
    },
    debug(message, meta) {
      if (!shouldEmit('debug', minOrder)) return;
      writeStructured('debug', message, meta);
    },
  };

  return rootLogger;
}

function getLogger() {
  if (!rootLogger) {
    return createLogger();
  }
  return rootLogger;
}

function createHttpLogger() {
  const logger = getLogger();
  return morgan('combined', {
    stream: {
      write: (line) => {
        logger.info(line.trim(), { type: 'http_access' });
      },
    },
  });
}

module.exports = {
  createLogger,
  getLogger,
  createHttpLogger,
};
