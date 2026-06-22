const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route topilmadi: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let status = err.statusCode || 500;
  let message = err.message || 'Server xatosi';

  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `Bunday ${field} allaqachon mavjud` : 'Takrorlanuvchi yozuv';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = 'Ma\'lumotlar validatsiyasi xato';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Yaroqsiz ID format';
  }

  const body = { error: message };
  if (err.details) body.details = err.details;
  if (env.isDev && status >= 500) body.stack = err.stack;
  if (status >= 500) console.error('🔥', err);

  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
