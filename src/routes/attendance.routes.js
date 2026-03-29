const express = require("express");
const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");
const asyncHandler = require("../middleware/asyncHandler");
const attendanceController = require("../controllers/attendanceController");

const router = express.Router();

router.use(auth);
router.post("/checkin", roleGuard("employee"), asyncHandler(attendanceController.checkIn));
router.get("/today", roleGuard("employee"), asyncHandler(attendanceController.myTodayStatus));
router.get("/history", roleGuard("employee"), asyncHandler(attendanceController.myHistory));

module.exports = router;
