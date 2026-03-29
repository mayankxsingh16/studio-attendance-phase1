const express = require("express");
const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");
const asyncHandler = require("../middleware/asyncHandler");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/login", asyncHandler(authController.login));
router.get("/me", auth, asyncHandler(authController.me));
router.post("/register", auth, roleGuard("admin"), asyncHandler(authController.registerEmployee));

module.exports = router;
