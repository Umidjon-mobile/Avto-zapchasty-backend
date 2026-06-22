const ApiError = require('../utils/ApiError');

// validate(zodSchema, 'body' | 'query' | 'params')
module.exports = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return next(ApiError.badRequest('Validatsiya xatosi', details));
  }
  req[source] = result.data; // tozalangan/coerce qilingan qiymat
  next();
};
