const { ApiError } = require("../utils/ApiError");
const { handleError } = require("../utils/response");

function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(err, _req, res, _next) {
  return handleError(err, res);
}

module.exports = { notFoundHandler, errorHandler };
