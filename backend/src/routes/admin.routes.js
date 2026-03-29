const express = require("express");
const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");
const asyncHandler = require("../middleware/asyncHandler");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.use(auth, roleGuard("admin"));
router.get("/employees", asyncHandler(adminController.listEmployees));
router.get("/employees/:id/profile", asyncHandler(adminController.getEmployeeProfile));
router.patch("/employees/:id", asyncHandler(adminController.updateEmployee));
router.delete("/employees/:id", asyncHandler(adminController.deleteEmployee));
router.patch("/employees/:id/status", asyncHandler(adminController.updateEmployeeStatus));
router.post("/employees/:id/face-reference", asyncHandler(adminController.uploadEmployeeFaceReference));
router.get("/attendance/today", asyncHandler(adminController.todayAttendance));
router.get("/attendance/logs", asyncHandler(adminController.attendanceLogs));
router.get("/attendance/export", asyncHandler(adminController.exportAttendanceCsv));
router.get("/stats", asyncHandler(adminController.dashboardStats));
router.get("/office/location", asyncHandler(adminController.getOfficeLocation));
router.post("/office/location", asyncHandler(adminController.updateOfficeLocation));
router.delete("/devices/:userId", asyncHandler(adminController.resetDevice));

module.exports = router;
