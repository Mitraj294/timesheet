// Auth Controller: Handles registration, login, password, and invitation logic

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import crypto from "crypto";

// --- Constants ---
const MIN_PASSWORD_LENGTH = 6;
const JWT_EXPIRY = "1d";
const RESET_TOKEN_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_MS = RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000;
const USER_ROLES = {
  EMPLOYER: "employer",
  EMPLOYEE: "employee",
  ADMIN: "admin",
};

// Get client base URL for links in emails
const getClientBaseUrl = () => {
  if (process.env.NODE_ENV !== "production") {
    return process.env.CLIENT_BASE_URL || "https://192.168.1.63:3000";
  }
  return process.env.CLIENT_BASE_URL || "https://timesheet00.netlify.app";
};

// --- User Registration ---
const registerUser = ({ User, sendEmail }) => async (req, res) => {
  try {
    const { name, email, password, role, country, phoneNumber, companyName } =
      req.body;
    // Basic validation
    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Please provide name, email, password, and role" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address" });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
      });
    }
    if (!Object.values(USER_ROLES).includes(role.toLowerCase())) {
      return res.status(400).json({ message: "Invalid user role provided" });
    }
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }
    // Create user (password hashing handled by model)
    const user = await User.create({
      name,
      email,
      password,
      role,
      country: country || "",
      phoneNumber: phoneNumber || "",
      companyName:
        role.toLowerCase() === USER_ROLES.EMPLOYER ? companyName || "" : "",
    });
    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        phoneNumber: user.phoneNumber,
        companyName: user.companyName,
      },
    });
  } catch (error) {
    console.error("[Auth] Error during user registration:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// Generate JWT token for authentication
const generateToken = (userId, userRole, employerId = null) => {
  const payload = { id: userId, role: userRole };
  if (userRole === 'employee' && employerId) {
    payload.employerId = employerId;
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// --- User Login ---
const loginUser = ({ User, Employee }) => async (req, res) => {
  try {
    const { email, password } = req.body;
    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }
    const user = await User.findOne({ email });
    // Check credentials
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // For employees, get employerId for token
    let employerIdForToken = null;
    if (user.role === USER_ROLES.EMPLOYEE) {
      const employeeRecord = await Employee.findOne({
        userId: user._id,
      }).select("employerId");
      if (employeeRecord) {
        employerIdForToken = employeeRecord.employerId;
      }
    }
    const token = generateToken(user._id, user.role, employerIdForToken);
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        phoneNumber: user.phoneNumber,
        companyName: user.companyName,
        ...(user.role === USER_ROLES.EMPLOYEE &&
          employerIdForToken && { employerId: employerIdForToken }),
      },
    });
  } catch (error) {
    // Error in user login
    res.status(500).json({ message: "Server error during login" });
  }
};

// --- Change Password (Authenticated) ---
const changePassword = ({ User }) => async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new passwords are required." });
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password." });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully." });
  } catch (error) {
    // Error changing password
    res.status(500).json({ message: "Server error during password change." });
  }
};

// --- Forgot Password (Send Reset Link) ---
const forgotPassword = ({ User, sendEmail }) => async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ message: "Please provide an email address." });
    }
    const user = await User.findOne({ email });
    // Always respond with success to avoid leaking user existence
    if (!user) {
      return res.json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }
    // Generate reset token and expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + RESET_TOKEN_EXPIRY_MS;
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${getClientBaseUrl()}/reset-password/${resetToken}`;
    const message = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset for your account.</p>
      <p>Please click on the following link, or paste it into your browser to complete the process:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
      <p>This link will expire in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `;
    try {
      await sendEmail({
        to: user.email,
        subject: `Your Password Reset Link (Valid for ${RESET_TOKEN_EXPIRY_MINUTES} min)`,
        html: message,
      });
      res.json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (emailError) {
      // Clean up token fields if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        message: "Error sending password reset email. Please try again later.",
      });
    }
  } catch (error) {
    // Error in forgot password
    res
      .status(500)
      .json({ message: "Server error during forgot password process." });
  }
};

// --- Reset Password with Token ---
const resetPassword = ({ User }) => async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      });
    }
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Password reset token is invalid or has expired." });
    }
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    res.json({ message: "Password has been reset successfully." });
  } catch (error) {
    // Error in reset password
    res.status(500).json({ message: "Server error during password reset." });
  }
};

// --- Check if user exists by email ---
const checkUserExists = ({ User }) => async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    const user = await User.findOne({ email }).select("_id name email role");
    if (user) {
      return res.json({ exists: true, user });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    // Error checking user existence
    res.status(500).json({ message: "Server error while checking user." });
  }
};

// --- Check if a prospective employee's email is already in use ---
const checkProspectiveEmployee = ({ User, Employee }) => async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    const user = await User.findOne({ email }).select("_id");
    if (!user) {
      return res.json({
        canProceed: true,
        userExists: false,
        isEmployee: false,
        message: "Email is available.",
      });
    }
    const employee = await Employee.findOne({ userId: user._id }).select(
      "_id employerId",
    );
    if (employee) {
      return res.status(409).json({
        canProceed: false,
        userExists: true,
        isEmployee: true,
        message:
          "This email is already an active employee. Please log in or ask your new employer to invite you.",
      });
    }
    return res.json({
      canProceed: true,
      userExists: true,
      isEmployee: false,
      message:
        "This email is already registered. You can proceed to request an invitation.",
    });
  } catch (error) {
    // Error checking prospective employee
    res.status(500).json({ message: "Server error while checking prospective employee." });
  }
};

// --- Prospective employee requests an invitation to join a company ---
const requestCompanyInvitation = ({ User, Invitation, sendEmail }) => async (req, res) => {
  try {
    const {
      prospectiveEmployeeName,
      prospectiveEmployeeEmail,
      companyName,
      companyEmail,
    } = req.body;
    // Validate required fields
    if (
      !prospectiveEmployeeName ||
      !prospectiveEmployeeEmail ||
      !companyName ||
      !companyEmail
    ) {
      return res.status(400).json({
        message:
          "All fields are required: your name, your email, company name, and company email.",
      });
    }
    // Prevent duplicate invitation or employee
    const existingUserForProspective = await User.findOne({
      email: prospectiveEmployeeEmail,
    }).select("_id");
    if (existingUserForProspective) {
      const existingEmployeeRecord = await Employee.findOne({
        userId: existingUserForProspective._id,
      }).select("_id");
      if (existingEmployeeRecord) {
        return res.status(409).json({
          message:
            "This email is already an active employee. An invitation cannot be requested.",
        });
      }
    }
    const existingInvitation = await Invitation.findOne({
      prospectiveEmployeeEmail,
      companyEmail,
      status: "pending",
    });
    if (existingInvitation) {
      return res.status(400).json({
        message:
          "An invitation request for this email to this company is already pending.",
      });
    }
    // Find employer user
    const employerUser = await User.findOne({
      email: companyEmail,
      role: USER_ROLES.EMPLOYER,
    });
    if (!employerUser) {
      return res.status(404).json({
        message:
          "Employer with the provided company email not found or is not registered as an employer.",
      });
    }
    // Create invitation
    const invitation = new Invitation({
      prospectiveEmployeeName,
      prospectiveEmployeeEmail,
      companyName,
      companyEmail,
      employerId: employerUser._id,
    });
    await invitation.save();
    // Notify employer by email
    const employerNotificationSubject = `New Employee Invitation Request from ${prospectiveEmployeeName}`;
    const loginUrl = `${getClientBaseUrl()}/login`;
    const employerNotificationHtml = `
      <h1>New Employee Invitation Request</h1>
      <p>Hello ${employerUser.name || "Employer"},</p>
      <p><b>${prospectiveEmployeeName}</b> (Email: ${prospectiveEmployeeEmail}) has requested to join your company, "${employerUser.companyName || companyName}".</p>
      <p>Please log in to your employer dashboard to review and manage this request:</p>
      <p><a href="${loginUrl}" clicktracking=off>${loginUrl}</a></p>
      <p>Thank you,<br/>The Timesheet System</p>
    `;
    try {
      await sendEmail({
        to: employerUser.email,
        subject: employerNotificationSubject,
        html: employerNotificationHtml,
      });
    } catch (emailError) {
      // Error sending invitation email
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        message: "Error sending password reset email. Please try again later.",
      });
    }
    res.status(201).json({
      message:
        "Invitation request submitted successfully. The company will be notified.",
    });
  } catch (error) {
    // Error requesting invitation
    res
      .status(500)
      .json({ message: "Server error while submitting invitation request." });
  }
};

// --- Employer gets their pending invitations ---
const getPendingInvitations = ({ Invitation }) => async (req, res) => {
  try {
    if (req.user.role !== USER_ROLES.EMPLOYER) {
      return res.status(403).json({ message: "Access denied." });
    }
    const invitations = await Invitation.find({
      employerId: req.user.id,
      status: "pending",
    }).sort({ createdAt: -1 });
    res.json(invitations);
  } catch (error) {
    // Error fetching pending invitations
    res.status(500).json({ message: "Server error fetching invitations." });
  }
};

// --- Employer approves an invitation ---
const approveInvitation = ({ Invitation, User, Employee, sendEmail }) => async (req, res) => {
  const { invitationId } = req.params;
  const employer = req.user;
  try {
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found." });
    }
    if (invitation.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Invitation has already been ${invitation.status}.` });
    }
    if (invitation.employerId.toString() !== employer.id.toString()) {
      return res.status(403).json({
        message:
          "Access denied. You are not authorized to approve this invitation.",
      });
    }
    const { prospectiveEmployeeEmail, prospectiveEmployeeName } = invitation;
    let employeeUser;
    let temporaryPassword = null;
    // Check if the prospective employee already exists
    const existingUser = await User.findOne({
      email: prospectiveEmployeeEmail,
    });
    if (existingUser) {
      // Check if there is already an active employee record
      const existingEmployeeRecord = await Employee.findOne({
        userId: existingUser._id,
      });
      if (existingEmployeeRecord) {
        if (
          existingEmployeeRecord.employerId.toString() ===
          employer.id.toString()
        ) {
          // The user is already an employee of this employer
          invitation.status = "approved";
          invitation.resolvedBy = employer._id;
          await invitation.save();
          return res.status(200).json({
            message:
              "This user is already an employee of your company. Invitation marked as approved.",
            employee: existingEmployeeRecord,
          });
        } else {
          // The user is already registered as an employee with another company
          return res.status(409).json({
            message:
              "This user is already registered as an employee with another company.",
          });
        }
      }
      employeeUser = existingUser;
    } else {
      // Create a new user for the employee with a temporary password
      temporaryPassword = crypto.randomBytes(8).toString("hex");
      employeeUser = new User({
        name: prospectiveEmployeeName,
        email: prospectiveEmployeeEmail,
        password: temporaryPassword,
        role: USER_ROLES.EMPLOYEE,
      });
      await employeeUser.save();
    }
    // Check if there is already an employee link for this user and employer
    const existingEmployeeLink = await Employee.findOne({
      userId: employeeUser._id,
      employerId: employer._id,
    });
    if (existingEmployeeLink) {
      invitation.status = "approved";
      invitation.resolvedBy = employer._id;
      await invitation.save();
      return res.status(200).json({
        message:
          "Employee record already exists for this user in your company. Invitation marked as approved.",
        employee: existingEmployeeLink,
      });
    }
    // Create a new employee record
    const employeeCode = `EMP-${Date.now().toString().slice(-6)}`;
    const newEmployee = new Employee({
      name: prospectiveEmployeeName,
      email: prospectiveEmployeeEmail,
      employeeCode,
      wage: 0,
      userId: employeeUser._id,
      employerId: employer._id,
    });
    await newEmployee.save();
    invitation.status = "approved";
    invitation.resolvedBy = employer._id;
    await invitation.save();
    let employeeNotificationSubject;
    let employeeNotificationHtml;
    if (temporaryPassword) {
      employeeNotificationSubject =
        "Welcome to the Team! Your Timesheet Account is Ready";
      employeeNotificationHtml = `
                <h1>Welcome, ${prospectiveEmployeeName}!</h1>
                <p>Your request to join <b>${employer.companyName || "our company"}</b> has been approved.</p>
                <p>A new account has been created for you. Please use the following credentials to log in:</p>
                <p><b>Email:</b> ${prospectiveEmployeeEmail}</p>
                <p><b>Temporary Password:</b> ${temporaryPassword}</p>
                <p>We recommend changing your password after your first login.</p>
                <p>Login at: <a href="${getClientBaseUrl()}">${getClientBaseUrl()}</a></p>
                <p>Thank you,<br/>The ${employer.companyName || "Company"} Team</p>
            `;
    } else {
      employeeNotificationSubject = `You've been added to ${employer.companyName || "a new company"}`;
      employeeNotificationHtml = `
                <h1>Hello ${prospectiveEmployeeName}!</h1>
                <p>You have been successfully added as an employee to <b>${employer.companyName || "our company"}</b>.</p>
                <p>You can now log in using your existing credentials to access your timesheet and other company resources.</p>
                <p>Login at: <a href="${getClientBaseUrl()}">${getClientBaseUrl()}</a></p>
                <p>Thank you,<br/>The ${employer.companyName || "Company"} Team</p>
            `;
    }
    res.status(200).json({
      message: "Invitation approved successfully. Employee created/linked.",
      employee: newEmployee,
      user: {
        _id: employeeUser._id,
        email: employeeUser.email,
        name: employeeUser.name,
      },
    });
    try {
      await sendEmail({
        to: prospectiveEmployeeEmail,
        subject: employeeNotificationSubject,
        html: employeeNotificationHtml,
      });
    } catch (emailError) {
      // Error sending approval email
    }
  } catch (error) {
    // Error approving invitation
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "Failed to approve invitation due to a conflict. An employee with similar details might already exist.",
        details: error.message,
      });
    }
    res
      .status(500)
      .json({ message: "Server error while approving invitation." });
  }
};

// --- Employer rejects an invitation ---
const rejectInvitation = ({ Invitation, sendEmail }) => async (req, res) => {
  const { invitationId } = req.params;
  const employer = req.user;
  try {
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found." });
    }
    if (invitation.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Invitation has already been ${invitation.status}.` });
    }
    if (invitation.employerId.toString() !== employer.id.toString()) {
      return res.status(403).json({
        message:
          "Access denied. You are not authorized to reject this invitation.",
      });
    }
    invitation.status = "rejected";
    invitation.resolvedBy = employer._id;
    await invitation.save();
    const rejectionSubject = `Update on your application to ${invitation.companyName}`;
    const rejectionHtml = `
            <h1>Hello ${invitation.prospectiveEmployeeName},</h1>
            <p>Thank you for your interest in joining <b>${invitation.companyName}</b>.</p>
            <p>We regret to inform you that your application has not been approved at this time.</p>
            <p>We wish you the best in your job search.</p>
            <p>Sincerely,<br/>The ${invitation.companyName} Team</p>
        `;
    try {
      await sendEmail({
        to: invitation.prospectiveEmployeeEmail,
        subject: rejectionSubject,
        html: rejectionHtml,
      });
    } catch (emailError) {
      // Error sending rejection email
    }
    res.status(200).json({ message: "Invitation rejected successfully." });
  } catch (error) {
    // Error rejecting invitation
    res
      .status(500)
      .json({ message: "Server error while rejecting invitation." });
  }
};

// --- Request an account deletion link via email ---
const requestAccountDeletionLink = ({ User, sendEmail }) => async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (!user.email) {
      return res
        .status(400)
        .json({ message: "No email address found for your account." });
    }
    const deleteToken = crypto.randomBytes(32).toString("hex");
    user.deleteAccountToken = crypto
      .createHash("sha256")
      .update(deleteToken)
      .digest("hex");
    user.deleteAccountTokenExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    const deletionUrl = `${getClientBaseUrl()}/confirm-delete-account/${deleteToken}`;
    const emailMessage = `
      <p>You are receiving this email because you (or someone else) have requested the deletion of your account for the Timesheet App.</p>
      <p>Please click on the following link, or paste it into your browser to complete the process:</p>
      <p><a href="${deletionUrl}" clicktracking=off>${deletionUrl}</a></p>
      <p>This link will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email and your account will remain safe.</p>
    `;
    await sendEmail({
      to: user.email,
      subject: "Account Deletion Request - Timesheet App",
      html: emailMessage,
    });
    res.status(200).json({
      message: `A secure link to delete your account has been sent to ${user.email}. Please check your inbox.`,
    });
  } catch (error) {
    console.error('[authController.requestAccountDeletionLink] Error:', error);
    // Error in requestAccountDeletionLink
    if (req.user?.id) {
      try {
        const userToClean = await User.findById(req.user.id);
        if (userToClean) {
          userToClean.deleteAccountToken = undefined;
          userToClean.deleteAccountTokenExpires = undefined;
          await userToClean.save({ validateBeforeSave: false });
        }
      } catch (cleanupError) {
        console.error('[authController.requestAccountDeletionLink] Cleanup error:', cleanupError);
      }
    }
    res.status(500).json({
      message: "Error sending account deletion email. Please try again.",
    });
  }
};

// --- Confirm account deletion using a token and password ---
const confirmAccountDeletion = ({ User, Employee }) => async (req, res) => {
  const { token } = req.params;
  let session;
  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const { password } = req.body;
    const user = await User.findOne({
      deleteAccountToken: hashedToken,
      deleteAccountTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Deletion token is invalid or has expired." });
    }
    if (!password || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json({ message: "Incorrect password. Account deletion failed." });
    }
    session = await mongoose.startSession();
    session.startTransaction();
    const employeesToDelete = await Employee.find({ userId: user._id }).session(
      session,
    );
    if (employeesToDelete.length > 0) {
      for (const emp of employeesToDelete) {
        await Employee.findByIdAndDelete(emp._id, { session });
      }
    }
    await User.findByIdAndDelete(user._id, { session });
    await session.commitTransaction();
    res
      .status(200)
      .json({ message: "Your account has been successfully deleted." });
  } catch (error) {
    console.error(
      `[authController.confirmAccountDeletion] Critical error for token (param): ${token}. Error:`,
      error,
    );
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(500).json({
      message:
        "An internal server error occurred while deleting the account. Please try again.",
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// --- Verify current user's password ---
const verifyCurrentUserPassword = ({ User, Employee }) => async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: "User ID and password are required.",
      });
    }
    const authenticatedUser = req.user;
    if (authenticatedUser.id === userId) {
      // Proceed as before
    } else if (authenticatedUser.role === USER_ROLES.EMPLOYER) {
      const employeeRecord = await Employee.findOne({
        userId: userId,
        employerId: authenticatedUser.id,
      });
      if (!employeeRecord) {
        return res.status(403).json({
          success: false,
          message:
            "Forbidden: You are not authorized to verify this user's password.",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User ID mismatch or insufficient permissions.",
      });
    }
    const userToVerify = await User.findById(userId).select("+password");
    if (!userToVerify) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }
    const isMatch = await bcrypt.compare(password, userToVerify.password);
    if (isMatch) {
      return res
        .status(200)
        .json({ success: true, message: "Password verified." });
    } else {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password." });
    }
  } catch (error) {
    // Error verifying password
    res.status(500).json({
      success: false,
      message: "Server error during password verification.",
    });
  }
};

const authControllerFactory = ({ User, Employee, Invitation, bcrypt, jwt, crypto, sendEmail }) => ({
  registerUser: registerUser({ User, sendEmail }),
  loginUser: loginUser({ User, Employee }),
  changePassword: changePassword({ User }),
  forgotPassword: forgotPassword({ User, sendEmail }),
  resetPassword: resetPassword({ User }),
  checkUserExists: checkUserExists({ User }),
  checkProspectiveEmployee: checkProspectiveEmployee({ User, Employee }),
  requestCompanyInvitation: requestCompanyInvitation({ User, Invitation, sendEmail }),
  getPendingInvitations: getPendingInvitations({ Invitation }),
  approveInvitation: approveInvitation({ Invitation, User, Employee, sendEmail }),
  rejectInvitation: rejectInvitation({ Invitation, sendEmail }),
  requestAccountDeletionLink: requestAccountDeletionLink({ User, sendEmail }),
  confirmAccountDeletion: confirmAccountDeletion({ User, Employee }),
  verifyCurrentUserPassword: verifyCurrentUserPassword({ User, Employee }),
});

export {
  registerUser,
  loginUser,
  changePassword,
  forgotPassword,
  resetPassword,
  checkUserExists,
  checkProspectiveEmployee,
  requestCompanyInvitation,
  getPendingInvitations,
  approveInvitation,
  rejectInvitation,
  requestAccountDeletionLink,
  confirmAccountDeletion,
  verifyCurrentUserPassword
};

export default authControllerFactory;
