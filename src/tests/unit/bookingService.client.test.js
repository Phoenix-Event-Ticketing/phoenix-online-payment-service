const { sanitizePathParam } = require('../../integrations/bookingService.client');

describe('bookingService.client sanitizePathParam', () => {
  it('accepts alphanumeric ids and encodes', () => {
    expect(sanitizePathParam('abc123', 'id')).toBe('abc123');
    expect(sanitizePathParam('a_b-c', 'id')).toBe('a_b-c');
  });

  it('rejects empty and non-strings', () => {
    expect(() => sanitizePathParam('', 'id')).toThrow('non-empty string');
    expect(() => sanitizePathParam('  ', 'id')).toThrow('non-empty string');
    expect(() => sanitizePathParam(null, 'id')).toThrow('non-empty string');
    expect(() => sanitizePathParam({}, 'id')).toThrow('non-empty string');
  });

  it('rejects traversal-like values', () => {
    expect(() => sanitizePathParam('../x', 'id')).toThrow('invalid characters');
    expect(() => sanitizePathParam('a/b', 'id')).toThrow('invalid characters');
  });
});
