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


// Changed route to match frontend request: /projects/client/:clientId
router.post("/client/:clientId", createProject);

router.get("/client/:clientId", getProjectsByClientId);  

router.get("/:projectId", getProjectById);

router.put("/:projectId", updateProject);

router.delete("/:projectId", deleteProject);
// Get all projects
router.get("/", getAllProjects);


export default router;
