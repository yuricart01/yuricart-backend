const {
  createBrand,
  deleteBrand,
  getAdminBrandById,
  getPublicBrandBySlug,
  listAdminBrands,
  listPublicBrands,
  updateBrand,
} = require("../services/brandService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getPublicBrands = asyncHandler(async (req, res) => {
  const result = await listPublicBrands(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getPublicBrand = asyncHandler(async (req, res) => {
  const brand = await getPublicBrandBySlug(req.params.slug);
  sendSuccess(res, brand);
});

const getAdminBrands = asyncHandler(async (req, res) => {
  const result = await listAdminBrands(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminBrand = asyncHandler(async (req, res) => {
  const brand = await getAdminBrandById(req.params.id);
  sendSuccess(res, brand);
});

const createAdminBrand = asyncHandler(async (req, res) => {
  const file = req.file;
  const body = req.body;
  const brand = await createBrand(body, file);
  sendSuccess(res, brand, 201);
});

const updateAdminBrand = asyncHandler(async (req, res) => {
  const file = req.file;
  const body = req.body;
  const brand = await updateBrand(req.params.id, body, file);
  sendSuccess(res, brand);
});

const deleteAdminBrand = asyncHandler(async (req, res) => {
  const result = await deleteBrand(req.params.id);
  sendSuccess(res, result);
});

module.exports = {
  getPublicBrands,
  getPublicBrand,
  getAdminBrands,
  getAdminBrand,
  createAdminBrand,
  updateAdminBrand,
  deleteAdminBrand,
};
