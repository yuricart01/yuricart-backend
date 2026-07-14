const {
  createCategory,
  deleteCategory,
  getAdminCategoryById,
  getPublicCategoryBySlug,
  listAdminCategories,
  listPublicCategories,
  updateCategory,
} = require("../services/categoryService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getPublicCategories = asyncHandler(async (req, res) => {
  const result = await listPublicCategories(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getPublicCategory = asyncHandler(async (req, res) => {
  const category = await getPublicCategoryBySlug(req.params.slug);
  sendSuccess(res, category);
});

const getAdminCategories = asyncHandler(async (req, res) => {
  const result = await listAdminCategories(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminCategory = asyncHandler(async (req, res) => {
  const category = await getAdminCategoryById(req.params.id);
  sendSuccess(res, category);
});

const NUMERIC_FIELDS = new Set(["sortOrder"]);

function normalizeFormBody(body) {
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    if (NUMERIC_FIELDS.has(key)) {
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

const createAdminCategory = asyncHandler(async (req, res) => {
  const file = req.file;
  const body = normalizeFormBody(req.body);
  const category = await createCategory(body, file);
  sendSuccess(res, category, 201);
});

const updateAdminCategory = asyncHandler(async (req, res) => {
  const file = req.file;
  const body = normalizeFormBody(req.body);
  const category = await updateCategory(req.params.id, body, file);
  sendSuccess(res, category);
});

const deleteAdminCategory = asyncHandler(async (req, res) => {
  const result = await deleteCategory(req.params.id);
  sendSuccess(res, result);
});

module.exports = {
  getPublicCategories,
  getPublicCategory,
  getAdminCategories,
  getAdminCategory,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
};
