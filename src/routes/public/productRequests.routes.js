const { Router } = require("express");
const { z } = require("zod");
const { submitProductRequest } = require("../../controllers/productController");
const { validateBody } = require("../../middleware/validate");

const router = Router();

const productRequestSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.coerce.number().int().positive().optional(),
  message: z.string().optional(),
});

router.post("/", validateBody(productRequestSchema), submitProductRequest);

module.exports = router;
