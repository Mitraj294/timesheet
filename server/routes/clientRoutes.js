import express from "express";
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  downloadClients,
  sendClientsReportEmail
} from "../controllers/clientController.js";
import { protect, employerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Download all client data as Excel (employer only)
router.get('/download', protect, employerOnly, downloadClients);

// Send client report via email (employer only)
router.post('/report/email', protect, employerOnly, sendClientsReportEmail);

// Create a new client (employer only)
router.post("/", protect, employerOnly, createClient);

// Get all clients (any authenticated user, controller handles access)
router.get("/", protect, getClients);

// Get a single client by ID (any authenticated user, controller handles access)
router.get("/:id", protect, getClientById);

// Update a client (employer only)
router.put("/:id", protect, employerOnly, updateClient);

// Delete a client (employer only)
router.delete("/:id", protect, employerOnly, deleteClient);

export default router;
