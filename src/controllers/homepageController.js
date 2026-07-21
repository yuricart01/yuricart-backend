const {
  createHeroSlide,
  deleteHeroSlide,
  getAdminHomepage,
  getPublicHomepage,
  reorderHeroSlides,
  updateFeaturedSections,
  updateHeroSlide,
  upsertFixedSlot,
} = require("../services/homepageService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const NUMERIC_FIELDS = new Set(["sortOrder", "limit"]);

function normalizeFormBody(body) {
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    if (NUMERIC_FIELDS.has(key)) {
      if (value === "" || value === undefined || value === null) {
        result[key] = undefined;
      } else {
        const num = Number(value);
        result[key] = Number.isNaN(num) ? value : num;
      }
    } else if (key === "active") {
      if (value === "true" || value === "1" || value === true) result[key] = true;
      else if (value === "false" || value === "0" || value === false) result[key] = false;
      else result[key] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

const getPublicHomepageHandler = asyncHandler(async (_req, res) => {
  const data = await getPublicHomepage();
  sendSuccess(res, data);
});

const getAdminHomepageHandler = asyncHandler(async (_req, res) => {
  const data = await getAdminHomepage();
  sendSuccess(res, data);
});

const createHeroSlideHandler = asyncHandler(async (req, res) => {
  const body = normalizeFormBody(req.body);
  const slide = await createHeroSlide(body, req.file);
  sendSuccess(res, slide, 201);
});

const updateHeroSlideHandler = asyncHandler(async (req, res) => {
  const body = normalizeFormBody(req.body);
  const slide = await updateHeroSlide(req.params.id, body, req.file);
  sendSuccess(res, slide);
});

const deleteHeroSlideHandler = asyncHandler(async (req, res) => {
  const result = await deleteHeroSlide(req.params.id);
  sendSuccess(res, result);
});

const reorderHeroSlidesHandler = asyncHandler(async (req, res) => {
  const slides = await reorderHeroSlides(req.body.orderedIds);
  sendSuccess(res, slides);
});

const upsertSlotHandler = asyncHandler(async (req, res) => {
  const body = normalizeFormBody(req.body);
  const banner = await upsertFixedSlot(
    req.params.section,
    req.params.slot,
    body,
    req.file,
  );
  sendSuccess(res, banner);
});

const updateFeaturedSectionsHandler = asyncHandler(async (req, res) => {
  const sections = await updateFeaturedSections(req.body.featuredSections);
  sendSuccess(res, sections);
});

module.exports = {
  getPublicHomepageHandler,
  getAdminHomepageHandler,
  createHeroSlideHandler,
  updateHeroSlideHandler,
  deleteHeroSlideHandler,
  reorderHeroSlidesHandler,
  upsertSlotHandler,
  updateFeaturedSectionsHandler,
};
