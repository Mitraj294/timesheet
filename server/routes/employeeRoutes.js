import express from "express";
import { protect, employerOnly } from "../middleware/authMiddleware.js";
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from "../controllers/employeeController.js";

const router = express.Router();


router.get("/", protect, getEmployees);


router.post("/", protect, employerOnly, addEmployee);

router.put("/:id", protect, employerOnly, updateEmployee);

router.delete("/:id", protect, employerOnly, deleteEmployee);

export default router;
