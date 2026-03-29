const express = require("express");
const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");
const asyncHandler = require("../middleware/asyncHandler");
const qrController = require("../controllers/qrController");

const router = express.Router();

router.use(auth);
router.post("/generate", roleGuard("admin"), asyncHandler(qrController.generate));
router.get("/active", roleGuard("admin"), asyncHandler(qrController.active));

module.exports = router;
