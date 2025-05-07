import express from "express";
import { updateUserProfile } from "../controllers/userController.js"; // Import the new controller function
import { protect } from '../middleware/authMiddleware.js'; // Import authentication middleware

const router = express.Router();

// --- Protected Routes ---

// PUT /api/users/profile - Update the logged-in user's profile (name, email, etc.) (protected)
router.put('/profile', protect, updateUserProfile);


export default router;