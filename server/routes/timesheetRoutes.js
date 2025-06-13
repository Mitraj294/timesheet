//home/digilab/timesheet/server/routes/timesheetRoutes.js

import express from "express";
import { protect, employerOnly } from "../middleware/authMiddleware.js";
import {
  createTimesheet,
  getTimesheets,
  getTimesheetById,
  checkTimesheet,
  getTimesheetsByProject,
  getTimesheetsByEmployee,
  getTimesheetsByClient,
  getIncompleteTimesheetsByEmployee,
  updateTimesheet,
  deleteTimesheet,
  downloadTimesheets,
  sendTimesheetEmail,
  downloadProjectTimesheets,
  sendProjectTimesheetEmail,
} from "../controllers/timesheetController.js";

const router = express.Router();

// Get all timesheets (filtered by user/role)
router.get("/", protect, getTimesheets);

// Create a new timesheet
router.post("/", protect, createTimesheet);

// Check if a timesheet exists for a date/employee
router.get("/check", protect, checkTimesheet);

// Get, update, or delete a timesheet by ID
router
  .route("/:id")
  .get(protect, getTimesheetById)
  .put(protect, updateTimesheet)
  .delete(protect, deleteTimesheet);

// Get timesheets by project, employee, or client
router.get("/project/:projectId", protect, getTimesheetsByProject);
router.get("/employee/:employeeId", protect, getTimesheetsByEmployee);
router.get(
  "/employee/:employeeId/incomplete",
  protect,
  getIncompleteTimesheetsByEmployee,
);
router.get("/client/:clientId", protect, getTimesheetsByClient);

// Download and email timesheet reports (employer only)
router.post("/download", protect, employerOnly, downloadTimesheets);
router.post("/send", protect, employerOnly, sendTimesheetEmail);

// Download and email project-specific timesheet reports (employer only)
router.post(
  "/download/project",
  protect,
  employerOnly,
  downloadProjectTimesheets,
);
router.post(
  "/send-email/project",
  protect,
  employerOnly,
  sendProjectTimesheetEmail,
);

export default router;
