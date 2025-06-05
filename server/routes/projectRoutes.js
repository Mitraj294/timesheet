import express from "express";
import {
  createProject,
  getProjectsByClientId,
  getProjectById,
  updateProject,
  deleteProject,
  getAllProjects,
  downloadProjectReport,
  sendProjectReportEmail
} from "../controllers/projectController.js";
import { protect, employerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/projects/client/:clientId - Create a new project for a specific client
router.post("/client/:clientId", createProject);

// GET /api/projects/client/:clientId - Get all projects for a specific client
router.get("/client/:clientId", getProjectsByClientId);  

// GET /api/projects/:projectId - Get a single project by its ID
router.get("/:projectId", getProjectById);

// PUT /api/projects/:projectId - Update a project by its ID
router.put("/:projectId", updateProject);

// DELETE /api/projects/:projectId - Delete a project by its ID
router.delete("/:projectId", deleteProject);

// GET /api/projects - Get all projects (e.g., for an admin overview)
router.get("/", getAllProjects);

// POST /api/projects/report/download - Download project timesheet report as Excel
router.post('/report/download', protect, employerOnly, downloadProjectReport);

// POST /api/projects/report/email - Send project timesheet report via email
router.post('/report/email', protect, employerOnly, sendProjectReportEmail);

export default router;
