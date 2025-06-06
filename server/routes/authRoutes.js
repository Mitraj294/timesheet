// /home/digilab/timesheet/server/routes/authRoutes.js
import express from "express";
import {
  registerUser,
  loginUser,
  changePassword,
  forgotPassword,
  resetPassword,
  checkUserExists,
  requestCompanyInvitation,
  getPendingInvitations,
  approveInvitation,
  rejectInvitation,
  checkProspectiveEmployee,
  requestAccountDeletionLink,
  confirmAccountDeletion,
  verifyCurrentUserPassword,
} from "../controllers/authController.js";
import User from "../models/User.js";
import { protect, employerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// User registration and login
router.post("/register", registerUser); // Register new user
router.post("/login", loginUser); // Login

// Password reset
router.post("/forgot-password", forgotPassword); // Request password reset
router.put("/reset-password/:token", resetPassword); // Reset password with token

// Employer can check if a user exists before inviting/adding
router.post('/check-user', protect, employerOnly, checkUserExists);

// Public: check if a prospective employee exists
router.post('/check-prospective-employee', checkProspectiveEmployee);

// Invitation management (for joining companies)
router.post('/request-invitation', requestCompanyInvitation);
router.get('/invitations/pending', protect, employerOnly, getPendingInvitations);
router.post('/invitations/:invitationId/approve', protect, employerOnly, approveInvitation);
router.post('/invitations/:invitationId/reject', protect, employerOnly, rejectInvitation);

// Change password (must be logged in)
router.put('/change-password', protect, changePassword);

// Get current logged-in user's info
router.get('/me', protect, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: 'User data not found after authentication.' });
    }
    res.json(req.user);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Account deletion (request link and confirm)
router.post('/request-deletion-link', protect, requestAccountDeletionLink);
router.post('/confirm-delete-account/:token', confirmAccountDeletion);

// Verify password for sensitive actions
router.post('/verify-password', protect, verifyCurrentUserPassword);

export default router;
