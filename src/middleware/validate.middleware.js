const { ZodError } = require('zod');
const { badRequest } = require('../common/errors');

function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          badRequest('Validation failed', 'VALIDATION_ERROR', err.flatten()),
        );
      }
      return next(err);
    }
  };
}

module.exports = validate;

