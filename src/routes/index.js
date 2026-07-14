const { Router } = require("express");

const { z } = require("zod");

const {
  adminLogin,
  adminLogout,
  getAdminMe,
  healthCheck,
} = require("../controllers/authController");

const { authenticate, requireAdmin } = require("../middleware/auth");

const { validateBody } = require("../middleware/validate");

const adminBannersRoutes = require("./admin/banners.routes");

const adminBrandsRoutes = require("./admin/brands.routes");

const adminCategoriesRoutes = require("./admin/categories.routes");

const adminCouponsRoutes = require("./admin/coupons.routes");

const adminCustomersRoutes = require("./admin/customers.routes");

const adminDashboardRoutes = require("./admin/dashboard.routes");

const adminOrdersRoutes = require("./admin/orders.routes");

const adminProductsRoutes = require("./admin/products.routes");

const adminSettingsRoutes = require("./admin/settings.routes");

const adminShippingRoutes = require("./admin/shipping.routes");

const publicAuthRoutes = require("./public/auth.routes");

const publicBannersRoutes = require("./public/banners.routes");

const publicBrandsRoutes = require("./public/brands.routes");

const publicCategoriesRoutes = require("./public/categories.routes");

const publicCouponsRoutes = require("./public/coupons.routes");

const publicOrdersRoutes = require("./public/orders.routes");

const publicProductsRoutes = require("./public/products.routes");
const publicProductRequestsRoutes = require("./public/productRequests.routes");

const { categoryProductsRouter } = require("./public/products.routes");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const router = Router();

router.get("/health", healthCheck);

router.post("/admin/auth/login", validateBody(loginSchema), adminLogin);

router.post("/admin/auth/logout", adminLogout);

router.get("/admin/auth/me", authenticate, requireAdmin, getAdminMe);

router.use("/auth", publicAuthRoutes);

router.use("/orders", publicOrdersRoutes);

router.use("/coupons", publicCouponsRoutes);

router.use("/products", publicProductsRoutes);
router.use("/product-requests", publicProductRequestsRoutes);

router.use("/categories", publicCategoriesRoutes);

router.use("/categories", categoryProductsRouter);

router.use("/brands", publicBrandsRoutes);

router.use("/banners", publicBannersRoutes);

router.use("/admin/dashboard", adminDashboardRoutes);

router.use("/admin/products", adminProductsRoutes);

router.use("/admin/categories", adminCategoriesRoutes);

router.use("/admin/brands", adminBrandsRoutes);

router.use("/admin/banners", adminBannersRoutes);

router.use("/admin/orders", adminOrdersRoutes);

router.use("/admin/coupons", adminCouponsRoutes);

router.use("/admin/settings", adminSettingsRoutes);

router.use("/admin/shipping", adminShippingRoutes);

router.use("/admin/customers", adminCustomersRoutes);

module.exports = router;
