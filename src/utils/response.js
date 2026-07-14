const { ApiError } = require("../utils/ApiError");

function sendSuccess(res, data, statusCode = 200, meta) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function sendError(res, statusCode, message, errors) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}

function handleError(err, res) {
  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.message, err.errors);
  }

  console.error(err);
  return sendError(res, 500, "Internal server error");
}

module.exports = { sendSuccess, sendError, handleError };
