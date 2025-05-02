// /home/digilab/timesheet/server/routes/authRoutes.js
import express from "express";
import { registerUser, loginUser, changePassword, deleteAccount } from "../controllers/authController.js"; // Import changePassword, deleteAccount
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

// PUT /api/auth/change-password - Handles password change for logged-in user
router.put('/change-password', protect, changePassword); // Add this line


// --- Protected Routes ---
// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  // --- ADD THIS LOG ---
  console.log(`[${new Date().toISOString()}] /api/auth/me route handler entered.`);
  try {
    if (!req.user) {
       // --- ADD THIS LOG ---
       console.log(`[${new Date().toISOString()}] /api/auth/me handler: req.user is missing!`);
       return res.status(404).json({ message: 'User data not found after authentication.' });
    }
    // --- ADD THIS LOG ---
    console.log(`[${new Date().toISOString()}] /api/auth/me handler: Sending user data for ${req.user.email}`);
    res.json(req.user);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error in /api/auth/me handler:`, err.message);
    res.status(500).send('Server Error');
  }
});

// DELETE /api/auth/me - Deletes the logged-in user's account
router.delete('/me', protect, deleteAccount); // Add this line

// --- ADD THIS LOG ---
console.log(`[${new Date().toISOString()}] authRoutes.js file loaded and router configured.`);

export default router;