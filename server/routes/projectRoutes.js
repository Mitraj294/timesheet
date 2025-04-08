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


router.post("/:clientId/projects", createProject);

router.get("/client/:clientId", getProjectsByClientId);  

router.get("/:projectId", getProjectById);

router.put("/:projectId", updateProject);

router.delete("/:projectId", deleteProject);
// Get all projects
router.get("/", getAllProjects);  // ✅ New route


export default router;
