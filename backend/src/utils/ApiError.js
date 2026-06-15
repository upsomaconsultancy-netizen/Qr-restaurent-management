class ApiError extends Error {
  constructor(status, message, details = undefined, code = undefined) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;
  }
  static badRequest(msg, details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Unauthorized') { return new ApiError(401, msg); }
  static forbidden(msg = 'Forbidden', code = undefined) { return new ApiError(403, msg, undefined, code); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg) { return new ApiError(409, msg); }
}
module.exports = ApiError;
