const {
  createProduct,
  deleteProduct,
  getAdminProductById,
  getPublicProductBySlug,
  getRelatedProducts,
  listAdminProducts,
  listProductsByCategorySlug,
  listPublicProducts,
  updateProduct,
} = require("../services/productService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const ARRAY_FIELDS = new Set(["tags", "colors", "sizes", "variants"]);
const BOOLEAN_FIELDS = new Set(["featured", "newArrival", "bestSeller"]);
const NUMERIC_FIELDS = new Set(["price", "salePrice", "stock"]);

function normalizeFormBody(body) {
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "keepGallery" || key === "removedGalleryIds") continue;
    if (ARRAY_FIELDS.has(key)) {
      result[key] = Array.isArray(value) ? value : value ? [value] : [];
    } else if (BOOLEAN_FIELDS.has(key)) {
      result[key] = value === "true" || value === true || value === "1";
    } else if (NUMERIC_FIELDS.has(key)) {
      if (value === "" || value === undefined || value === null) {
        result[key] = undefined;
      } else {
        const num = Number(value);
        result[key] = isNaN(num) ? value : num;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

const getPublicProducts = asyncHandler(async (req, res) => {
  const result = await listPublicProducts(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getPublicProduct = asyncHandler(async (req, res) => {
  const product = await getPublicProductBySlug(req.params.slug);
  sendSuccess(res, product);
});

const getPublicRelatedProducts = asyncHandler(async (req, res) => {
  const items = await getRelatedProducts(req.params.slug);
  sendSuccess(res, items);
});

const getCategoryProducts = asyncHandler(async (req, res) => {
  const result = await listProductsByCategorySlug(
    req.params.slug,
    req.query,
  );
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminProducts = asyncHandler(async (req, res) => {
  const result = await listAdminProducts(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminProduct = asyncHandler(async (req, res) => {
  const product = await getAdminProductById(req.params.id);
  sendSuccess(res, product);
});

const createAdminProduct = asyncHandler(async (req, res) => {
  const files = req.files;
  const body = normalizeFormBody(req.body);
  const product = await createProduct(body, files);
  sendSuccess(res, product, 201);
});

const updateAdminProduct = asyncHandler(async (req, res) => {
  const files = req.files;
  const body = normalizeFormBody(req.body);

  let removedGalleryIds = [];
  const rawRemoved = req.body.removedGalleryIds;
  if (typeof rawRemoved === "string") {
    try {
      removedGalleryIds = JSON.parse(rawRemoved);
    } catch {
      removedGalleryIds = rawRemoved.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const product = await updateProduct(
    req.params.id,
    body,
    files,
    removedGalleryIds,
  );
  sendSuccess(res, product);
});

const deleteAdminProduct = asyncHandler(async (req, res) => {
  const result = await deleteProduct(req.params.id);
  sendSuccess(res, result);
});

const { sendProductRequestEmail } = require("../services/emailService");

const submitProductRequest = asyncHandler(async (req, res) => {
  const { customerName, customerEmail, productName, quantity, message } = req.body;

  await sendProductRequestEmail({
    customerName: customerName || "Anonymous",
    customerEmail,
    productName: productName || "Unknown Product",
    quantity,
    message,
  });

  sendSuccess(res, { message: "Product request submitted successfully." }, 200);
});

module.exports = {
  getPublicProducts,
  getPublicProduct,
  getPublicRelatedProducts,
  getCategoryProducts,
  getAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  submitProductRequest,
};
