const {
  PAYMENT_STATUS,
  canTransition,
} = require('../../common/constants/paymentStatus');

describe('paymentStatus', () => {
  it('allows PENDING -> PROCESSING and CANCELLED', () => {
    expect(canTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.PROCESSING)).toBe(
      true,
    );
    expect(canTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.CANCELLED)).toBe(
      true,
    );
    expect(canTransition(PAYMENT_STATUS.PENDING, PAYMENT_STATUS.SUCCESS)).toBe(
      false,
    );
  });

  it('allows SUCCESS -> REFUNDED only', () => {
    expect(canTransition(PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.REFUNDED)).toBe(
      true,
    );
    expect(canTransition(PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.CANCELLED)).toBe(
      false,
    );
  });
});
