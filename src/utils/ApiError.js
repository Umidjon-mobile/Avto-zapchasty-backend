class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
  static badRequest(m = "Noto'g'ri so'rov", d) { return new ApiError(400, m, d); }
  static unauthorized(m = 'Avtorizatsiya talab qilinadi') { return new ApiError(401, m); }
  static forbidden(m = "Ruxsat yo'q") { return new ApiError(403, m); }
  static notFound(m = 'Topilmadi') { return new ApiError(404, m); }
  static conflict(m = 'Konflikt') { return new ApiError(409, m); }
}
module.exports = ApiError;
