// /home/digilab/timesheet/server/routes/authRoutes.js
import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import User from "../models/User.js";
// Import the authentication middleware
import { protect } from '../middleware/authMiddleware.js'; // Adjust path if needed

const router = express.Router();

// --- Public Routes ---

// POST /api/auth/register - Handles user registration
router.post("/register", registerUser);

// POST /api/auth/login - Handles user login
router.post("/login", loginUser);

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


// --- Protected Routes ---

// GET /api/auth/me - Get data for the currently logged-in user
// This route is protected by the 'protect' middleware
router.get('/me', protect, async (req, res) => {
  try {
    // The 'protect' middleware has already verified the token
    // and attached the user object (without password) to req.user.
    // We just need to send it back.
    if (!req.user) {
       // This case should ideally be caught by the middleware, but double-check
       return res.status(404).json({ message: 'User data not found after authentication.' });
    }
    res.json(req.user); // Send the user data back
  } catch (err) {
    // Catch any unexpected errors during the process
    console.error("Error fetching user data in /me route:", err.message);
    res.status(500).send('Server Error');
  }
});


export default router;
