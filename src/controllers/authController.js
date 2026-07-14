const { env } = require("../config/env");
const { User } = require("../models/User");
const { BadRequestError, UnauthorizedError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { signAdminToken, signCustomerToken } = require("../utils/jwt");
const { sendSuccess } = require("../utils/response");

const customerCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const adminCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 8 * 60 * 60 * 1000,
};

const healthCheck = asyncHandler(async (_req, res) => {
  sendSuccess(res, {
    status: "ok",
    service: "yuricart-api",
    timestamp: new Date().toISOString(),
  });
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);

  if (!user || user.role !== "admin" || user.status !== "active") {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = signAdminToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.cookie("admin_token", token, adminCookieOptions);

  sendSuccess(res, {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

const adminLogout = asyncHandler(async (_req, res) => {
  res.clearCookie("admin_token");
  sendSuccess(res, { message: "Logged out successfully" });
});

const getAdminMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub).select("-password");

  if (!user || user.role !== "admin") {
    throw new UnauthorizedError("Admin not found");
  }

  sendSuccess(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  });
});

const customerRegister = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new BadRequestError("Email already registered");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: "customer",
    status: "active",
  });

  const token = signCustomerToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.cookie("customer_token", token, customerCookieOptions);

  sendSuccess(
    res,
    {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    },
    201,
  );
});

const customerLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByEmail(email);

  if (!user || user.role !== "customer") {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.status === "blocked") {
    throw new UnauthorizedError("Account is blocked. Contact support.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = signCustomerToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  res.cookie("customer_token", token, customerCookieOptions);

  sendSuccess(res, {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
  });
});

const customerLogout = asyncHandler(async (_req, res) => {
  res.clearCookie("customer_token");
  sendSuccess(res, { message: "Logged out successfully" });
});

const getCustomerMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub).select("-password");

  if (!user || user.role !== "customer") {
    throw new UnauthorizedError("Customer not found");
  }

  sendSuccess(res, {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    status: user.status,
  });
});

module.exports = {
  healthCheck,
  adminLogin,
  adminLogout,
  getAdminMe,
  customerRegister,
  customerLogin,
  customerLogout,
  getCustomerMe,
};
