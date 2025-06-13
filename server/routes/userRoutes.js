import express from "express";
import { updateUserProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Update the logged-in user's profile (name, email, etc.)
router.put("/profile", protect, updateUserProfile);

export default router;
