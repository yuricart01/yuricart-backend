const {
  createBanner,
  deleteBanner,
  getAdminBannerById,
  getPublicBannerBySlug,
  listAdminBanners,
  listPublicBanners,
  updateBanner,
} = require("../services/bannerService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getPublicBanners = asyncHandler(async (req, res) => {
  const result = await listPublicBanners(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getPublicBanner = asyncHandler(async (req, res) => {
  const banner = await getPublicBannerBySlug(req.params.slug);
  sendSuccess(res, banner);
});

const getAdminBanners = asyncHandler(async (req, res) => {
  const result = await listAdminBanners(req.query);
  sendSuccess(res, result.items, 200, result.meta);
});

const getAdminBanner = asyncHandler(async (req, res) => {
  const banner = await getAdminBannerById(req.params.id);
  sendSuccess(res, banner);
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

const createAdminBanner = asyncHandler(async (req, res) => {
  const file = req.file;
  const body = normalizeFormBody(req.body);
  const banner = await createBanner(body, file);
  sendSuccess(res, banner, 201);
});

const updateAdminBanner = asyncHandler(async (req, res) => {
  const file = req.file;
  const body = normalizeFormBody(req.body);
  const banner = await updateBanner(req.params.id, body, file);
  sendSuccess(res, banner);
});

const deleteAdminBanner = asyncHandler(async (req, res) => {
  const result = await deleteBanner(req.params.id);
  sendSuccess(res, result);
});

module.exports = {
  getPublicBanners,
  getPublicBanner,
  getAdminBanners,
  getAdminBanner,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
};
