import express from "express";
import { protect, employerOnly } from "../middleware/authMiddleware.js";
import { createTimesheet, getTimesheets, checkTimesheet, getTimesheetsByProject , getTimesheetsByEmployee , getTimesheetsByClient ,updateTimesheet, deleteTimesheet } from "../controllers/timesheetController.js";

const router = express.Router();

router.get("/", protect, getTimesheets);
router.post("/", protect, employerOnly, createTimesheet);
router.put("/:id", protect, employerOnly, updateTimesheet);
router.delete("/:id", protect, employerOnly, deleteTimesheet);

router.get("/check", checkTimesheet);

router.get("/project/:projectId", getTimesheetsByProject);
router.get("/employee/:employeeId", getTimesheetsByEmployee);
router.get("/client/:clientId",getTimesheetsByClient );

export default router;
