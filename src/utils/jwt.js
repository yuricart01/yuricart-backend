const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { UnauthorizedError } = require("./ApiError");

function signToken(payload, expiresIn = env.JWT_EXPIRES_IN) {
  const options = { expiresIn };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

function signAdminToken(payload) {
  return signToken(payload, env.ADMIN_JWT_EXPIRES_IN);
}

function signCustomerToken(payload) {
  return signToken(payload, env.JWT_EXPIRES_IN);
}

function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

module.exports = { signToken, signAdminToken, signCustomerToken, verifyToken };
