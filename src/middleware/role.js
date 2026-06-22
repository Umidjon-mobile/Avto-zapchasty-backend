const ApiError = require('../utils/ApiError');

// requireRole('admin', 'superadmin')
module.exports = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};
