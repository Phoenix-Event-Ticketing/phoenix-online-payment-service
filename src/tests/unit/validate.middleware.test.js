const { z } = require('zod');
const validate = require('../../middleware/validate.middleware');

describe('validate.middleware', () => {
  it('parses body and calls next', () => {
    const schema = { body: z.object({ a: z.number() }) };
    const mw = validate(schema);
    const req = { body: { a: 1 }, params: {}, query: {} };
    const next = jest.fn();
    mw(req, {}, next);
    expect(req.body.a).toBe(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes ZodError to next', () => {
    const schema = { body: z.object({ a: z.number() }) };
    const mw = validate(schema);
    const req = { body: { a: 'x' }, params: {}, query: {} };
    const next = jest.fn();
    mw(req, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
