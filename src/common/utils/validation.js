const { ZodError } = require('zod');
const { badRequest } = require('../errors');

function parseSchema(schema, data) {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      throw badRequest('Validation failed', 'VALIDATION_ERROR', err.flatten());
    }
    throw err;
  }
}

module.exports = {
  parseSchema,
};

