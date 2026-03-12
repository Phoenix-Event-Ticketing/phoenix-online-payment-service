const ROLES = require('../common/constants/roles');
const { forbidden } = require('../common/errors');

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(forbidden('Missing user role'));
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(forbidden('You do not have permission to perform this action'));
    }

    return next();
  };
}

module.exports = {
  authorize,
  ROLES,
};

