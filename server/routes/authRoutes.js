// /home/digilab/timesheet/server/routes/authRoutes.js
import express from "express";
import {
    registerUser,
    loginUser,
    changePassword,
    deleteAccount,
    forgotPassword, // Import new controller
    resetPassword   // Import new controller
} from "../controllers/authController.js";
import User from "../models/User.js";
// Import the authentication middleware
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Public Routes ---

// POST /api/auth/register - Handles user registration
router.post("/register", registerUser);

// POST /api/auth/login - Handles user login
router.post("/login", loginUser);

// POST /api/auth/forgot-password - Initiates password reset
router.post("/forgot-password", forgotPassword);

// PUT /api/auth/reset-password/:token - Resets password using token
router.put("/reset-password/:token", resetPassword);

// POST /api/auth/check-user - Checks if a user exists by email (Public)
router.post("/check-user", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email });

    // Return only whether the user exists for better security
    return res.json({ exists: !!user });
  } catch (error) {
    console.error("Error checking user:", error);
    return res.status(500).json({ message: "Server error checking user." });
  }
});

// PUT /api/auth/change-password - Handles password change for logged-in user (protected)
router.put('/change-password', protect, changePassword);

// --- Protected Routes ---

// GET /api/auth/me - Fetches the currently authenticated user's details (protected)
router.get('/me', protect, async (req, res) => {
  try {
    if (!req.user) {
       return res.status(404).json({ message: 'User data not found after authentication.' });
    }
    res.json(req.user);
  } catch (err) {
    console.error(`Error in /api/auth/me handler: ${err.message}`);
    res.status(500).send('Server Error');
  }
});

// DELETE /api/auth/me - Deletes the logged-in user's account (protected)
router.delete('/me', protect, deleteAccount);

export default router;
