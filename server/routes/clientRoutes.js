import express from "express";
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  downloadClients
} from "../controllers/clientController.js";

const router = express.Router();

// Routes
router.get('/download', downloadClients);
router.post("/", createClient);           // Create a new client
router.get("/", getClients);              // Fetch all clients
router.get("/:id", getClientById);        // Fetch a single client by ID
router.put("/:id", updateClient);         // Update a client by ID
router.delete("/:id", deleteClient);      // Delete a client by ID

export default router;
