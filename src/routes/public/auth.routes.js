const { Router } = require("express");
const {
  customerLogin,
  customerLogout,
  customerRegister,
  getCustomerMe,
} = require("../../controllers/authController");
const { authenticate, requireCustomer } = require("../../middleware/auth");
const { validateBody } = require("../../middleware/validate");
const {
  customerLoginSchema,
  customerRegisterSchema,
} = require("../../validators/authValidator");

const router = Router();

router.post("/register", validateBody(customerRegisterSchema), customerRegister);
router.post("/login", validateBody(customerLoginSchema), customerLogin);
router.post("/logout", customerLogout);
router.get("/me", authenticate, requireCustomer, getCustomerMe);

module.exports = router;
