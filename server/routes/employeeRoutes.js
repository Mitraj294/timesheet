import express from "express";
import { protect, employerOnly } from "../middleware/authMiddleware.js";
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getMyEmployeeProfile,
  batchUpdateEmployeeNotificationPreferences // Import the controller for batch updates
} from "../controllers/employeeController.js";

const router = express.Router();

// GET /api/employees/me - Fetch current logged-in employee's profile (protected)
// This route should be defined before /:id to avoid 'me' being treated as an ID
router.get("/me", protect, getMyEmployeeProfile);

// GET /api/employees - Fetch all employees (protected)
router.get("/", protect, getEmployees);

// POST /api/employees - Add a new employee (protected, employer only)
router.post("/", protect, employerOnly, addEmployee);

// PUT /api/employees/:id - Update an employee (protected, employer only)
router.put("/:id", protect, employerOnly, updateEmployee);

// PATCH /api/employees/batch-update-notifications - Batch update notification preferences for employees
router.patch("/batch-update-notifications", protect, batchUpdateEmployeeNotificationPreferences);

// DELETE /api/employees/:id - Delete an employee (protected, employer only)
router.delete("/:id", protect, employerOnly, deleteEmployee);

export default router;