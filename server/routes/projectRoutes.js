import express from "express";
import {
  createProject,
  getProjectsByClientId,
  getProjectById,
  updateProject,
  deleteProject,
  getAllProjects,
  downloadProjectReport,
  sendProjectReportEmail,
} from "../controllers/projectController.js";
import { protect, employerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create a new project for a client
router.post("/client/:clientId", createProject);

// Get all projects for a specific client
router.get("/client/:clientId", getProjectsByClientId);

// Get a single project by its ID
router.get("/:projectId", getProjectById);

// Update a project by its ID
router.put("/:projectId", updateProject);

// Delete a project by its ID
router.delete("/:projectId", deleteProject);

// Get all projects (admin or overview)
router.get("/", getAllProjects);

// Download project timesheet report as Excel (employer only)
router.post("/report/download", protect, employerOnly, downloadProjectReport);

// Send project timesheet report via email (employer only)
router.post("/report/email", protect, employerOnly, sendProjectReportEmail);

export default router;
