// /home/digilab/timesheet/server/routes/authRoutes.js
import express from "express";
import {
    registerUser,
    loginUser,
    changePassword,
    forgotPassword, // Import new controller
    resetPassword  , // Import new controller
    checkUserExists,
    requestCompanyInvitation,
    getPendingInvitations,
    approveInvitation,
    rejectInvitation,
    checkProspectiveEmployee, // Import the new controller
    requestAccountDeletionLink, // Import new controller
    confirmAccountDeletion, // Import new controller
} from "../controllers/authController.js";
import User from "../models/User.js";
// Import the authentication middleware
import { protect ,employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Public Routes ---
// POST /api/auth/register - Handles user registration
router.post("/register", registerUser);
// POST /api/auth/login - Handles user login
router.post("/login", loginUser);
// POST /api/auth/forgot-password - Initiates password reset
router.post("/forgot-password", forgotPassword);
// POST /api/auth/reset-password/:token - Resets password using token (Note: PUT is fine, POST is also common)
router.put("/reset-password/:token", resetPassword);
// If it needs protection: router.post("/check-user", protect, checkUserExists);
// If employer only: router.post("/check-user", protect, employerOnly, checkUserExists);
// For now, let's assume it's used by employers adding employees, so protect + employerOnly is good.
router.post('/check-user', protect, employerOnly, checkUserExists);
router.post('/check-prospective-employee', checkProspectiveEmployee); // New public route
// Invitation Routes
router.post('/request-invitation', requestCompanyInvitation); // Public
router.get('/invitations/pending', protect, employerOnly, getPendingInvitations); // Employer only
router.post('/invitations/:invitationId/approve', protect, employerOnly, approveInvitation); // Employer only
router.post('/invitations/:invitationId/reject', protect, employerOnly, rejectInvitation); // Employer only

// --- Protected Routes ---
// PUT /api/auth/change-password - Handles password change for logged-in user (protected)
router.put('/change-password', protect, changePassword);
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

// --- Secure Account Deletion Routes ---
// POST /api/auth/request-deletion-link - User requests an email link to delete their account (protected)
router.post('/request-deletion-link', protect, requestAccountDeletionLink);
// POST /api/auth/confirm-delete-account/:token - User confirms deletion via email link and password (public, token verified)
router.post('/confirm-delete-account/:token', confirmAccountDeletion);

export default router;
