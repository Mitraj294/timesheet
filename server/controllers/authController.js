import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from 'crypto'; // Needed for token generation
import User from "../models/User.js";
// --- IMPORTANT ---
// Import your email sending utility (adjust path if necessary)
import sendEmail from '../utils/sendEmail.js';

// --- Constants ---
const MIN_PASSWORD_LENGTH = 6;
const JWT_EXPIRY = '1d';
const RESET_TOKEN_EXPIRY_MINUTES = 10;
const RESET_TOKEN_EXPIRY_MS = RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000;
const USER_ROLES = {
  EMPLOYER: 'employer',
  EMPLOYEE: 'employee',
  // Add other roles as needed
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, country, phoneNumber, companyName } = req.body;

    if (!name || !email || !password || !role ) {
      return res.status(400).json({ message: "Please provide name, email, password, and role" });
    }

    // Enhanced validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` });
    }
    if (!Object.values(USER_ROLES).includes(role.toLowerCase())) {
      return res.status(400).json({ message: "Invalid user role provided" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Hashing is typically handled by a pre-save hook in the User model.
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password, // Model hook should handle hashing
      role,
      country: country || '', 
      phoneNumber: phoneNumber || '',
      companyName: role.toLowerCase() === USER_ROLES.EMPLOYER ? (companyName || '') : '', // companyName for employers only
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
      // token: generateToken(user._id, user.role) // Optional: immediate login token post-registration
    });
  } catch (error) {
    console.error("Error in user registration:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

const generateToken = (userId, userRole) => {
  return jwt.sign({ id: userId, role: userRole }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // Generic "Invalid credentials" for security; 401 Unauthorized
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        phoneNumber: user.phoneNumber,
        companyName: user.companyName
      }
    });

  } catch (error) {
    console.error("Error in user login:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/changepassword
// @access  Private (Requires authentication)
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // userId from protect middleware

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new passwords are required." });
        }
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
        }

        const user = await User.findById(userId);
        if (!user) {
            // User should exist if protect middleware ran
            return res.status(404).json({ message: "User not found." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect current password." });
        }
        // Model hook handles new password hashing
        user.password = newPassword;
        await user.save();

        res.json({ message: "Password updated successfully." });

    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Server error during password change." });
    }
};

// @desc    Initiate password reset process
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] Entered forgotPassword controller.`);
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Please provide an email address." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            // Security: don't reveal email existence. Generic response even if email not found.
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.json({ message: "If an account with that email exists, a password reset link has been sent." }); // No error, exit early
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = Date.now() + RESET_TOKEN_EXPIRY_MS;
        await user.save({ validateBeforeSave: false }); // Skip full validation on this save

        // CLIENT_BASE_URL from env
        const resetUrl = `${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        // Email sending (e.g., nodemailer)
        const message = `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset for your account.</p>
            <p>Please click on the following link, or paste it into your browser to complete the process:</p>
            <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
            <p>This link will expire in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.</p>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        `;

        try {
            console.log(`[${new Date().toISOString()}] Attempting to send password reset email to: ${user.email}`);
            await sendEmail({
                to: user.email,
                subject: `Your Password Reset Link (Valid for ${RESET_TOKEN_EXPIRY_MINUTES} min)`,
                html: message,
            });
            console.log(`[${new Date().toISOString()}] Password reset email successfully sent (or appeared to send) to: ${user.email}`);
            // Generic message for success or if user wasn't found
            res.json({ message: "If an account with that email exists, a password reset link has been sent." });
        } catch (emailError) {
            // Log the full error object
            console.error(`[${new Date().toISOString()}] FAILED to send password reset email to ${user.email}. Error Details:`, emailError);
            // Clear token on email send failure
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false }); // Skip full validation
            return res.status(500).json({ message: "Error sending password reset email. Please try again later." });
        }

    } catch (error) {
        console.error("Error in forgot password:", error);
        console.error(`[${new Date().toISOString()}] UNCAUGHT error in forgotPassword controller for email ${req.body.email}. Error: ${error.message}`); // Log uncaught errors in the main try block
        res.status(500).json({ message: "Server error during forgot password process." });
    }
};

// @desc    Reset user password using a token
// @route   POST /api/auth/resetpassword/:token
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
        }

        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() } // Token expiry check
        });

        if (!user) {
            return res.status(400).json({ message: "Password reset token is invalid or has expired." });
        }

        // Model hook hashes new password
        user.password = newPassword;
        user.passwordResetToken = undefined; // Clear reset token fields
        user.passwordResetExpires = undefined;
        await user.save();

        // Optional: immediate login post-reset
        // const loginToken = generateToken(user._id, user.role);
        // res.json({ message: "Password reset successful.", token: loginToken, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });

        res.json({ message: "Password has been reset successfully." });

    } catch (error) {
        console.error("Error in reset password:", error);
        res.status(500).json({ message: "Server error during password reset." });
    }
};

// @desc    Delete user account
// @route   DELETE /api/auth/deleteaccount
// @access  Private (Requires authentication and password confirmation)
export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id; // userId from protect middleware

        const user = await User.findById(userId);
        if (!user) {
            // User should exist if protect middleware ran
            return res.status(404).json({ message: "User not found." });
        }

        // Optional: password verification for delete
        const { password } = req.body; // Password confirmation for delete
        if (!password || !(await user.matchPassword(password))) { // user.matchPassword()
            return res.status(401).json({ message: "Incorrect password. Account deletion failed." });
        }

        await User.findByIdAndDelete(userId);
        console.log(`User ${userId} deleted successfully.`); // Log deletion
        // TODO: Add logic here to delete associated data (e.g., Employee record, Timesheets, Reviews) if necessary

        res.json({ message: "Account deleted successfully." });
    } catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).json({ message: "Server error during account deletion." });
    }
};