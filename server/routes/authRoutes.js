// /home/digilab/timesheet/server/routes/authRoutes.js
import express from "express";
import { makeInvoker } from "awilix-express";
import container from "../container.js";
import authControllerFactory from "../controllers/authController.js";
import { protect, employerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();
const api = makeInvoker(authControllerFactory);

// User registration and login
router.post("/register", api("registerUser")); // Register new user
router.post("/login", api("loginUser")); // Login

// Password reset
router.post("/forgot-password", api("forgotPassword")); // Request password reset
router.put("/reset-password/:token", api("resetPassword")); // Reset password with token

// Employer can check if a user exists before inviting/adding
router.post("/check-user", protect, employerOnly, api("checkUserExists"));

// Public: check if a prospective employee exists
router.post("/check-prospective-employee", api("checkProspectiveEmployee"));

// Invitation management (for joining companies)
router.post("/request-invitation", api("requestCompanyInvitation"));
router.get(
  "/invitations/pending",
  protect,
  employerOnly,
  api("getPendingInvitations"),
);
router.post(
  "/invitations/:invitationId/approve",
  protect,
  employerOnly,
  api("approveInvitation"),
);
router.post(
  "/invitations/:invitationId/reject",
  protect,
  employerOnly,
  api("rejectInvitation"),
);

// Change password (must be logged in)
router.put("/change-password", protect, api("changePassword"));

// Get current logged-in user's info
router.get("/me", protect, async (req, res) => {
  try {
    if (!req.user) {
      return res
        .status(404)
        .json({ message: "User data not found after authentication." });
    }
    res.json(req.user);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// Account deletion (request link and confirm)
router.post("/request-deletion-link", protect, api("requestAccountDeletionLink"));
router.post("/confirm-delete-account/:token", api("confirmAccountDeletion"));

// Verify password for sensitive actions
router.post("/verify-password", protect, api("verifyCurrentUserPassword"));

export default router;
