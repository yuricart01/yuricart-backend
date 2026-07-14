const { ForbiddenError, UnauthorizedError } = require("../utils/ApiError");
const { verifyToken } = require("../utils/jwt");

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieToken = req.cookies?.admin_token || req.cookies?.customer_token;
  return cookieToken || null;
}

function authenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    return next(new UnauthorizedError("Authentication required"));
  }

  req.user = verifyToken(token);
  next();
}

function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication required"));
  }

  if (req.user.role !== "admin") {
    return next(new ForbiddenError("Admin access required"));
  }

  next();
}

function requireCustomer(req, _res, next) {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication required"));
  }

  if (req.user.role !== "customer") {
    return next(new ForbiddenError("Customer access required"));
  }

  next();
}

function optionalAuthenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    req.user = verifyToken(token);
  } catch {
  }

  next();
}

module.exports = { authenticate, requireAdmin, requireCustomer, optionalAuthenticate };
