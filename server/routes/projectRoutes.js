import express from "express";
import {
  createProject,
  getProjectsByClientId,
  getProjectById,
  updateProject,
  deleteProject,
  getAllProjects
} from "../controllers/projectController.js";

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

export default router;
