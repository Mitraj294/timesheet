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

// GET /api/clients/download - Download all clients as an Excel file
router.get('/download', downloadClients); // Consider adding 'protect' middleware if sensitive

router.post("/", createClient);           // POST /api/clients - Create a new client
router.get("/", getClients);              // GET /api/clients - Fetch all clients
router.get("/:id", getClientById);        // GET /api/clients/:id - Fetch a single client by ID
router.put("/:id", updateClient);         // PUT /api/clients/:id - Update a client by ID
router.delete("/:id", deleteClient);      // DELETE /api/clients/:id - Delete a client by ID

export default router;
