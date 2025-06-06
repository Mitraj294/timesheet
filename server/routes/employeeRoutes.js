import express from "express";
import { protect, employerOnly } from "../middleware/authMiddleware.js";
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getMyEmployeeProfile,
  batchUpdateEmployeeNotificationPreferences
} from "../controllers/employeeController.js";

const router = express.Router();

// Get current logged-in employee's profile
router.get("/me", protect, getMyEmployeeProfile);

// Get all employees (employer sees all, employee sees own team)
router.get("/", protect, getEmployees);

// Add a new employee (employer only)
router.post("/", protect, employerOnly, addEmployee);

// Update an employee (employer only)
router.put("/:id", protect, employerOnly, updateEmployee);

// Batch update notification preferences for employees
router.patch("/batch-update-notifications", protect, batchUpdateEmployeeNotificationPreferences);

// Delete an employee (employer only)
router.delete("/:id", protect, employerOnly, deleteEmployee);

export default router;