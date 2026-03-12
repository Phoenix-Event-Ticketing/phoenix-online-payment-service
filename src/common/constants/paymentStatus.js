const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

// Allowed transitions for basic internal flow
const PAYMENT_STATUS_TRANSITIONS = {
  PENDING: new Set(['PROCESSING', 'CANCELLED']),
  PROCESSING: new Set(['SUCCESS', 'FAILED']),
  SUCCESS: new Set(['REFUNDED']),
  FAILED: new Set([]),
  CANCELLED: new Set([]),
  REFUNDED: new Set([]),
};

function canTransition(from, to) {
  const allowed = PAYMENT_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.has(to);
}

module.exports = {
  PAYMENT_STATUS,
  PAYMENT_STATUS_TRANSITIONS,
  canTransition,
};

