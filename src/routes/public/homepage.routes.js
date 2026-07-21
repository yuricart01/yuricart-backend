const { Router } = require("express");
const { getPublicHomepageHandler } = require("../../controllers/homepageController");

const router = Router();

router.get("/", getPublicHomepageHandler);

module.exports = router;
