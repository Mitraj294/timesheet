import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from 'crypto'; // Needed for token generation
import User from "../models/User.js";
// --- IMPORTANT ---
// Import your email sending utility (adjust path if necessary)
import sendEmail from '../utils/sendEmail.js';

// Register User
export const registerUser = async (req, res) => {
  try {
    // Include new optional fields
    const { name, email, password, role, country, phoneNumber, companyName } = req.body;

    // Basic input validation
    if (!name || !email || !password || !role ) {
      return res.status(400).json({ message: "Please provide name, email, password, and role" });
    }
    // Add more validation as needed (e.g., password length, email format)

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Hash password before saving
    // Note: Hashing is done via middleware/hook in your User model, which is good practice.
    // If not, you would hash here:
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password, // Send plain password if model hook handles hashing
      // password: hashedPassword, // Send hashed password if hashing here
      role,
      country: country || '', // Save optional fields, default to empty string if not provided
      phoneNumber: phoneNumber || '',
      companyName: role === 'employer' ? (companyName || '') : '', // Only save companyName for employers
    });

    // Check if user creation was successful
    if (!user) {
      // This case might be redundant if User.create throws an error handled by catch block
      return res.status(400).json({ message: "Invalid user data, failed to create user" });
    }

    // Respond with success message and non-sensitive user data
    // Avoid sending back the whole user object if it contains sensitive info
    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id, // Use _id for consistency
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country,
        phoneNumber: user.phoneNumber,
        companyName: user.companyName,
      },
      // Optionally, generate and return a token immediately if registration implies login
      // token: generateToken(user._id, user.role) // Example call
    });
  } catch (error) {
    console.error("Error in user registration:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    // Check if user exists and if password matches
    // Use a single "Invalid credentials" message for security (don't reveal if email exists)
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" }); // Use 401 Unauthorized
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role }, // Payload
      process.env.JWT_SECRET,             // Secret Key
      { expiresIn: "1d" }                 // Options (e.g., expiration)
    );

    // Respond with token and non-sensitive user data
    res.json({
      token,
      user: {
        id: user._id, // Use id or _id consistently
        name: user.name,
        email: user.email,
        role: user.role,
        country: user.country, // Add optional fields
        phoneNumber: user.phoneNumber,
        companyName: user.companyName
      }
    });

  } catch (error) {
    console.error("Error in user login:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Change Password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // Get user ID from protect middleware

        // Basic validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new passwords are required." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long." });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            // Should not happen if protect middleware works, but good check
            return res.status(404).json({ message: "User not found." });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect current password." });
        }

        // Hash and save new password (pre-save hook in User model will handle hashing)
        user.password = newPassword;
        await user.save();

        res.json({ message: "Password updated successfully." });

    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Server error during password change." });
    }
};

// --- NEW: Forgot Password ---
export const forgotPassword = async (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] Entered forgotPassword controller.`); // <-- ADD THIS LINE
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Please provide an email address." });
        }

        const user = await User.findOne({ email });
        if (!user) {
            // Important: Don't reveal if the user exists or not for security
            // Send a success-like response even if email not found
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
        }

        // 1. Generate Reset Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // 2. Set Token and Expiry on User (e.g., 10 minutes)
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now
        await user.save({ validateBeforeSave: false }); // Save without validating other fields potentially

        // 3. Create Reset URL (adjust BASE_URL as needed)
        //    Use environment variables for the base URL!
        const resetUrl = `${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

        // 4. Send Email (Requires setup with nodemailer or similar)
        const message = `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset for your account.</p>
            <p>Please click on the following link, or paste it into your browser to complete the process:</p>
            <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
            <p>This link will expire in 10 minutes.</p>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        `;

        try {
            console.log(`[${new Date().toISOString()}] Attempting to send password reset email to: ${user.email}`); // Log before sending
            // --- Actually send the email ---
            await sendEmail({
                to: user.email,
                subject: 'Your Password Reset Link (Valid for 10 min)',
                html: message,
            });
            console.log(`[${new Date().toISOString()}] Password reset email successfully sent (or appeared to send) to: ${user.email}`); // Log after sending
            res.json({ message: "If an account with that email exists, a password reset link has been sent." });
        } catch (emailError) {
            console.error("Error sending password reset email:", emailError); // This line is already present
            // Clear token fields if email fails to prevent unusable token
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            console.error(`[${new Date().toISOString()}] FAILED to send password reset email to ${email}. Error: ${emailError.message}`); // More explicit log
            return res.status(500).json({ message: "Error sending password reset email. Please try again later." });
        }

    } catch (error) {
        console.error("Error in forgot password:", error);
        console.error(`[${new Date().toISOString()}] UNCAUGHT error in forgotPassword controller for email ${req.body.email}. Error: ${error.message}`); // Log uncaught errors in the main try block
        res.status(500).json({ message: "Server error during forgot password process." });
    }
};

// --- NEW: Reset Password ---
export const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }

        // 1. Hash the incoming token to match the stored one
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // 2. Find user by hashed token and check expiry
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() } // Check if token is still valid (greater than now)
        });

        if (!user) {
            return res.status(400).json({ message: "Password reset token is invalid or has expired." });
        }

        // 3. Set the new password (pre-save hook in User model will hash it)
        user.password = newPassword;
        user.passwordResetToken = undefined; // Clear the token fields
        user.passwordResetExpires = undefined;
        await user.save();

        // 4. Optional: Log the user in immediately by sending a new JWT token
        // const jwtToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
        // res.json({ message: "Password reset successful.", token: jwtToken, user: { ... } });

        res.json({ message: "Password has been reset successfully." });

    } catch (error) {
        console.error("Error in reset password:", error);
        res.status(500).json({ message: "Server error during password reset." });
    }
};

// Delete User Account
export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from protect middleware

        // Find user to ensure they exist before attempting delete
        const user = await User.findById(userId);
        if (!user) {
            // Should not happen if protect middleware works
            return res.status(404).json({ message: "User not found." });
        }

        // --- Optional: Add password verification step here for extra security ---
        const { password } = req.body; // If requiring password confirmation
        if (!password || !(await user.matchPassword(password))) { // Use the model method
            return res.status(401).json({ message: "Incorrect password. Account deletion failed." });
        }

        await User.findByIdAndDelete(userId);
        console.log(`User ${userId} deleted successfully.`); // Add logging
        // TODO: Add logic here to delete associated data (e.g., Employee record, Timesheets, Reviews) if necessary

        res.json({ message: "Account deleted successfully." });
    } catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).json({ message: "Server error during account deletion." });
    }
};

// Helper function to generate token (optional, can be inline as above)
// const generateToken = (id, role) => {
//   return jwt.sign({ id, role }, process.env.JWT_SECRET, {
//     expiresIn: '1d', // Example: token expires in 1 day
//   });
// };