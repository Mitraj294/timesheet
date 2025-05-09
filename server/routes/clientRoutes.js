import express from "express";
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  downloadClients
} from "../controllers/clientController.js";
import { protect, employerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();
// GET /api/clients/download - Download client-related timesheet data as an Excel file
// This route should remain employerOnly if only employers can download all client data
router.get('/download', protect, employerOnly, downloadClients);

router.post("/", protect, employerOnly, createClient); // Creating clients is employer-only
router.get("/", protect, getClients); // Now accessible by authenticated users (employer/employee), controller handles scoping
router.get("/:id", protect, getClientById); // Now accessible by authenticated users (employer/employee), controller handles scoping
router.put("/:id", protect, employerOnly, updateClient); // Updating clients remains employer-only
router.delete("/:id", protect, employerOnly, deleteClient); // Deleting clients is employer-only

export default router;
