const { success } = require('../../common/utils/response');
const { getDbHealth } = require('../../config/db');

function getHealth(req, res) {
  const payload = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  return success(res, payload);
}

function getReadiness(req, res) {
  const dbHealth = getDbHealth();

  const isReady = dbHealth.isConnected;

  const payload = {
    status: isReady ? 'ready' : 'degraded',
    checks: {
      db: dbHealth,
    },
    timestamp: new Date().toISOString(),
  };

  return success(res, payload);
}

module.exports = {
  getHealth,
  getReadiness,
};

