
import express from "express";
import { makeInvoker } from "awilix-express";
import container from "../container.js";
import clientControllerFactory from "../controllers/clientController.js";
import { protect, employerOnly } from "../middleware/authMiddleware.js";

const api = makeInvoker(clientControllerFactory);
const router = express.Router();

// Download all client data as Excel (employer only)
router.get("/download", protect, employerOnly, api("downloadClients"));

// Send client report via email (employer only)
router.post("/report/email", protect, employerOnly, api("sendClientsReportEmail"));

// Create a new client (employer only)
router.post("/", protect, employerOnly, api("createClient"));

// Get all clients (any authenticated user, controller handles access)
router.get("/", protect, api("getClients"));

// Get a single client by ID (any authenticated user, controller handles access)
router.get("/:id", protect, api("getClientById"));

// Update a client (employer only)
router.put("/:id", protect, employerOnly, api("updateClient"));

// Delete a client (employer only)
router.delete("/:id", protect, employerOnly, api("deleteClient"));

export default router;
