import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose"; // Import mongoose for instanceof check
import crypto from 'crypto'; // Needed for token generation
import User from "../models/User.js";
import Employee from "../models/Employee.js"; 
import Timesheet from "../models/Timesheet.js"; 
import VehicleReview from "../models/VehicleReview.js"; 
import Schedule from "../models/Schedule.js"; 
import Invitation from "../models/Invitation.js"; // Import the new Invitation model
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
  ADMIN: 'admin' // Assuming admin role might be used, ensure User model enum supports it if active
  // Add other roles as needed
};

// --- Helper Functions ---

const getClientBaseUrl = () => {
  // If NODE_ENV is not 'production' (e.g., 'development' locally), use localhost.
  // Otherwise, use the CLIENT_BASE_URL from .env, with a fallback.
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000'; // Ensure your local React client runs on this port
  }
  return process.env.CLIENT_BASE_URL || 'http://localhost:3000'; // Fallback for production
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, country, phoneNumber, companyName, isInvited = false, employerId = null } = req.body;

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
      // Company name is only for employers.
      // If an employee is registered (e.g. by an employer or after invitation), companyName on User model is not typically set.
      // The association is via Employee.employerId.
      companyName: role.toLowerCase() === USER_ROLES.EMPLOYER ? (companyName || '') : '', // companyName for employers only
      // If this registration is part of an invitation approval, employerId might be passed.
      // However, the Employee model's employerId is the primary link.
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
        // Do not send employerId here unless specifically needed for the response context
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

        const resetUrl = `${getClientBaseUrl()}/reset-password/${resetToken}`;

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

// @desc    Check if a user exists by email
// @route   POST /api/auth/check-user
// @access  Private (e.g., for internal checks by an employer adding an employee)
export const checkUserExists = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }
        const user = await User.findOne({ email }).select('_id name email role'); // Select only necessary fields
        if (user) {
            return res.json({ exists: true, user });
        } else {
            return res.json({ exists: false });
        }
    } catch (error) {
        console.error("Error checking user existence:", error);
        res.status(500).json({ message: "Server error while checking user." });
    }
};

// @desc    Check if a prospective employee's email is already in use as an active employee
// @route   POST /api/auth/check-prospective-employee
// @access  Public
export const checkProspectiveEmployee = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        const user = await User.findOne({ email }).select('_id');
        if (!user) {
            // Email is not registered at all, so they can proceed to request an invitation.
            return res.json({ canProceed: true, userExists: false, isEmployee: false, message: "Email is available." });
        }

        // User exists, now check if they are an Employee
        const employee = await Employee.findOne({ userId: user._id }).select('_id employerId');
        if (employee) {
            // User exists AND is an employee
            return res.status(409).json({ // 409 Conflict is appropriate
                canProceed: false,
                userExists: true,
                isEmployee: true,
                message: "This email is already an active employee. Please log in or ask your new employer to invite you."
            });
        }

        // User exists but is NOT an employee (e.g., an employer, or a user whose Employee record was deleted)
        return res.json({
            canProceed: true, // They can request an invitation
            userExists: true,
            isEmployee: false,
            message: "This email is already registered. You can proceed to request an invitation." // Or a more nuanced message
        });
    } catch (error) {
        console.error("Error in checkProspectiveEmployee:", error);
        res.status(500).json({ message: "Server error while checking email status." });
    }
};

// @desc    Prospective employee requests an invitation to join a company
// @route   POST /api/auth/request-invitation
// @access  Public
export const requestCompanyInvitation = async (req, res) => {
    try {
        const { prospectiveEmployeeName, prospectiveEmployeeEmail, companyName, companyEmail } = req.body;

        if (!prospectiveEmployeeName || !prospectiveEmployeeEmail || !companyName || !companyEmail) {
            return res.status(400).json({ message: "All fields are required: your name, your email, company name, and company email." });
        }

        // Server-side check: Prevent invitation request if email is already an active employee
        const existingUserForProspective = await User.findOne({ email: prospectiveEmployeeEmail }).select('_id');
        if (existingUserForProspective) {
            const existingEmployeeRecord = await Employee.findOne({ userId: existingUserForProspective._id }).select('_id');
            if (existingEmployeeRecord) {
                return res.status(409).json({ // 409 Conflict
                    message: "This email is already an active employee. An invitation cannot be requested."
                });
            }
        }
        // End server-side check


        // Optional: Check if an invitation already exists for this email to this company
        const existingInvitation = await Invitation.findOne({ prospectiveEmployeeEmail, companyEmail, status: 'pending' });
        if (existingInvitation) {
            return res.status(400).json({ message: "An invitation request for this email to this company is already pending." });
        }

        // Find the employer user by their email
        const employerUser = await User.findOne({ email: companyEmail, role: USER_ROLES.EMPLOYER });
        if (!employerUser) {
            // Don't reveal if company email exists for security.
            // You might send an email to `prospectiveEmployeeEmail` saying "request submitted, if company exists..."
            // Or, for simplicity now, just inform that the request is logged.
            // Log this attempt for admin review if needed.
            console.warn(`Invitation request made to non-existent or non-employer company email: ${companyEmail}`);
            // To the user, it might appear successful to prevent probing.
            // However, a more direct feedback might be better UX depending on requirements.
            // For now, let's assume we proceed to create an invitation even if employer isn't found immediately,
            // and rely on employer to see it if their email matches. Or, reject if employer not found.
            // Let's reject if employer not found for clarity.
             return res.status(404).json({ message: "Employer with the provided company email not found or is not registered as an employer." });
        }

        const invitation = new Invitation({
            prospectiveEmployeeName,
            prospectiveEmployeeEmail,
            companyName, // Store what user typed
            companyEmail, // Store what user typed (employer's email)
            employerId: employerUser._id, // Link to the found employer
        });

        await invitation.save();

        // Notify the employer about the new invitation request
        const employerNotificationSubject = `New Employee Invitation Request from ${prospectiveEmployeeName}`;
        const loginUrl = `${getClientBaseUrl()}/login`; // Generate login URL
        const employerNotificationHtml = `
            <h1>New Employee Invitation Request</h1>
            <p>Hello ${employerUser.name || 'Employer'},</p>
            <p><b>${prospectiveEmployeeName}</b> (Email: ${prospectiveEmployeeEmail}) has requested to join your company, "${employerUser.companyName || companyName}".</p>
            <p>Please log in to your employer dashboard to review and manage this request:</p>
            <p><a href="${loginUrl}" clicktracking=off>${loginUrl}</a></p>
            <p>Thank you,<br/>The Timesheet System</p>
        `;
        try {
            await sendEmail({ to: employerUser.email, subject: employerNotificationSubject, html: employerNotificationHtml });
        } catch (emailError) {
            console.error(`Failed to send invitation request email to employer ${employerUser.email}:`, emailError);
            // Continue even if email fails, as the invitation is already saved.
        }

        res.status(201).json({ message: "Invitation request submitted successfully. The company will be notified." });

    } catch (error) {
        console.error("Error requesting invitation:", error);
        res.status(500).json({ message: "Server error while submitting invitation request." });
    }
};

// @desc    Employer gets their pending invitations
// @route   GET /api/auth/invitations/pending
// @access  Private (Employer only)
export const getPendingInvitations = async (req, res) => {
    try {
        if (req.user.role !== USER_ROLES.EMPLOYER) {
            return res.status(403).json({ message: "Access denied." });
        }
        const invitations = await Invitation.find({ employerId: req.user.id, status: 'pending' })
                                            .sort({ createdAt: -1 });
        res.json(invitations);
    } catch (error) {
        console.error("Error fetching pending invitations:", error);
        res.status(500).json({ message: "Server error fetching invitations." });
    }
};

// @desc    Employer approves an invitation
// @route   POST /api/auth/invitations/:invitationId/approve
// @access  Private (Employer only)
export const approveInvitation = async (req, res) => {
    const { invitationId } = req.params;
    const employer = req.user; // Logged-in employer from 'protect' middleware

    try {
        const invitation = await Invitation.findById(invitationId);

        if (!invitation) {
            return res.status(404).json({ message: "Invitation not found." });
        }
        if (invitation.status !== 'pending') {
            return res.status(400).json({ message: `Invitation has already been ${invitation.status}.` });
        }
        if (invitation.employerId.toString() !== employer.id.toString()) {
            return res.status(403).json({ message: "Access denied. You are not authorized to approve this invitation." });
        }

        const { prospectiveEmployeeEmail, prospectiveEmployeeName } = invitation;
        let employeeUser;
        let temporaryPassword = null;

        // 1. Check for existing User or create a new one
        const existingUser = await User.findOne({ email: prospectiveEmployeeEmail });

        if (existingUser) {
            // User exists. Check if they are already an employee of *any* company.
            const existingEmployeeRecord = await Employee.findOne({ userId: existingUser._id });
            if (existingEmployeeRecord) {
                if (existingEmployeeRecord.employerId.toString() === employer.id.toString()) {
                    // Already an employee of this company.
                    // Mark invitation as approved, but no new records needed.
                    invitation.status = 'approved';
                    invitation.resolvedBy = employer._id;
                    await invitation.save();
                    return res.status(200).json({ message: "This user is already an employee of your company. Invitation marked as approved.", employee: existingEmployeeRecord });
                } else {
                    // Employee of another company. This is a conflict.
                    return res.status(409).json({ message: "This user is already registered as an employee with another company." });
                }
            }
            // User exists but is not an Employee yet (or not in our Employee table for some reason)
            // Or user exists with a different role that can be converted/associated.
            // We will use this existing user account.
            employeeUser = existingUser;
            if (employeeUser.role !== USER_ROLES.EMPLOYEE) {
                // Optionally, update role if it's a generic user becoming an employee
                // For now, we assume if user exists, their role is acceptable or already 'employee'
                console.log(`User ${employeeUser.email} exists with role ${employeeUser.role}, will be linked as employee.`);
            }
        } else {
            // User does not exist, create a new one
            temporaryPassword = crypto.randomBytes(8).toString('hex');
            employeeUser = new User({
                name: prospectiveEmployeeName,
                email: prospectiveEmployeeEmail,
                password: temporaryPassword, // Pre-save hook in User model will hash this
                role: USER_ROLES.EMPLOYEE,
                // Add any other default fields for User model
            });
            await employeeUser.save();
        }

        // 2. Create Employee record
        // Check if an Employee record already links this user to this employer (double check)
        const existingEmployeeLink = await Employee.findOne({ userId: employeeUser._id, employerId: employer._id });
        if (existingEmployeeLink) {
             invitation.status = 'approved';
             invitation.resolvedBy = employer._id;
             await invitation.save();
            return res.status(200).json({ message: "Employee record already exists for this user in your company. Invitation marked as approved.", employee: existingEmployeeLink });
        }

        const employeeCode = `EMP-${Date.now().toString().slice(-6)}`; // Generate a simple unique code

        const newEmployee = new Employee({
            name: prospectiveEmployeeName,
            email: prospectiveEmployeeEmail, // Ensure this matches the User email
            employeeCode,
            wage: 0, // Employer should update this later
            userId: employeeUser._id,
            employerId: employer._id,
            // Add other default fields from Employee model
        });
        await newEmployee.save();

        // 3. Update Invitation status
        invitation.status = 'approved';
        invitation.resolvedBy = employer._id;
        await invitation.save();

        // 4. Notify Employee
        let employeeNotificationSubject;
        let employeeNotificationHtml;

        if (temporaryPassword) {
            console.log(`New user created. Email: ${prospectiveEmployeeEmail}, Temp Password: ${temporaryPassword}`);
            employeeNotificationSubject = "Welcome to the Team! Your Timesheet Account is Ready";
            employeeNotificationHtml = `
                <h1>Welcome, ${prospectiveEmployeeName}!</h1>
                <p>Your request to join <b>${employer.companyName || 'our company'}</b> has been approved.</p>
                <p>A new account has been created for you. Please use the following credentials to log in:</p>
                <p><b>Email:</b> ${prospectiveEmployeeEmail}</p>
                <p><b>Temporary Password:</b> ${temporaryPassword}</p>
                <p>We recommend changing your password after your first login.</p>
                <p>Login at: <a href="${getClientBaseUrl()}">${getClientBaseUrl()}</a></p>
                <p>Thank you,<br/>The ${employer.companyName || 'Company'} Team</p>
            `;
        } else {
            console.log(`Existing user ${prospectiveEmployeeEmail} linked as employee.`);
            employeeNotificationSubject = `You've been added to ${employer.companyName || 'a new company'}`;
            employeeNotificationHtml = `
                <h1>Hello ${prospectiveEmployeeName}!</h1>
                <p>You have been successfully added as an employee to <b>${employer.companyName || 'our company'}</b>.</p>
                <p>You can now log in using your existing credentials to access your timesheet and other company resources.</p>
                <p>Login at: <a href="${getClientBaseUrl()}">${getClientBaseUrl()}</a></p>
                <p>Thank you,<br/>The ${employer.companyName || 'Company'} Team</p>
            `;
        }

        res.status(200).json({
            message: "Invitation approved successfully. Employee created/linked.",
            employee: newEmployee, // Send back the created employee record
            user: { _id: employeeUser._id, email: employeeUser.email, name: employeeUser.name } // Send back some user info
        });

        // Send email after successful response to user to avoid delaying the response.
        try {
            await sendEmail({ to: prospectiveEmployeeEmail, subject: employeeNotificationSubject, html: employeeNotificationHtml });
        } catch (emailError) {
            console.error(`Failed to send approval email to employee ${prospectiveEmployeeEmail}:`, emailError);
            // Log error, but the main operation was successful.
        }

    } catch (error) {
        console.error("Error approving invitation:", error);
        if (error.code === 11000) { // Duplicate key error
            // This might happen if Employee.email or Employee.employeeCode has a unique constraint violated
            return res.status(409).json({ message: "Failed to approve invitation due to a conflict. An employee with similar details might already exist.", details: error.message });
        }
        res.status(500).json({ message: "Server error while approving invitation." });
    }
};

// @desc    Employer rejects an invitation
// @route   POST /api/auth/invitations/:invitationId/reject
// @access  Private (Employer only)
export const rejectInvitation = async (req, res) => {
    const { invitationId } = req.params;
    const employer = req.user;

    try {
        const invitation = await Invitation.findById(invitationId);

        if (!invitation) {
            return res.status(404).json({ message: "Invitation not found." });
        }
        if (invitation.status !== 'pending') {
            return res.status(400).json({ message: `Invitation has already been ${invitation.status}.` });
        }
        if (invitation.employerId.toString() !== employer.id.toString()) {
            return res.status(403).json({ message: "Access denied. You are not authorized to reject this invitation." });
        }

        invitation.status = 'rejected';
        invitation.resolvedBy = employer._id;
        await invitation.save();

        // Notify the prospective employee about the rejection
        const rejectionSubject = `Update on your application to ${invitation.companyName}`;
        const rejectionHtml = `
            <h1>Hello ${invitation.prospectiveEmployeeName},</h1>
            <p>Thank you for your interest in joining <b>${invitation.companyName}</b>.</p>
            <p>We regret to inform you that your application has not been approved at this time.</p>
            <p>We wish you the best in your job search.</p>
            <p>Sincerely,<br/>The ${invitation.companyName} Team</p>
        `;
        try {
            await sendEmail({ to: invitation.prospectiveEmployeeEmail, subject: rejectionSubject, html: rejectionHtml });
        } catch (emailError) {
            console.error(`Failed to send rejection email to ${invitation.prospectiveEmployeeEmail}:`, emailError);
            // Log error, but the main operation was successful.
        }

        res.status(200).json({ message: "Invitation rejected successfully." });

    } catch (error) {
        console.error("Error rejecting invitation:", error);
        res.status(500).json({ message: "Server error while rejecting invitation." });
    }
};

// @desc    Request an account deletion link via email
// @route   POST /api/auth/request-deletion-link
// @access  Private (Requires authentication)
export const requestAccountDeletionLink = async (req, res) => {
  try {
    const user = await User.findById(req.user.id); // req.user.id from 'protect' middleware

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const deleteToken = crypto.randomBytes(32).toString('hex');

    user.deleteAccountToken = crypto
      .createHash('sha256')
      .update(deleteToken)
      .digest('hex');
    // Set token to expire in, for example, 10 minutes
    user.deleteAccountTokenExpires = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false }); // Save the token and expiry

    // Construct the deletion URL (ensure CLIENT_BASE_URL is set in .env)
    const deletionUrl = `${getClientBaseUrl()}/confirm-delete-account/${deleteToken}`; // Raw token in URL

    const emailMessage = `
      <p>You are receiving this email because you (or someone else) have requested the deletion of your account for the Timesheet App.</p>
      <p>Please click on the following link, or paste it into your browser to complete the process:</p>
      <p><a href="${deletionUrl}" clicktracking=off>${deletionUrl}</a></p>
      <p>This link will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email and your account will remain safe.</p>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Account Deletion Request - Timesheet App',
      html: emailMessage,
    });

    res.status(200).json({ message: `A secure link to delete your account has been sent to ${user.email}. Please check your inbox.` });

  } catch (error) {
    console.error('Error in requestAccountDeletionLink:', error);
    // Attempt to clear token fields if an error occurs after they might have been set
    if (req.user && req.user.id) {
        try {
            const userToClean = await User.findById(req.user.id);
            if (userToClean) {
                userToClean.deleteAccountToken = undefined;
                userToClean.deleteAccountTokenExpires = undefined;
                await userToClean.save({ validateBeforeSave: false });
            }
        } catch (cleanupError) {
            console.error('Error cleaning up deletion token fields:', cleanupError);
        }
    }
    res.status(500).json({ message: 'Error sending account deletion email. Please try again.' });
  }
};

// @desc    Confirm account deletion using a token and password
// @route   POST /api/auth/confirm-delete-account/:token
// @access  Public (Relies on token for security)
export const confirmAccountDeletion = async (req, res) => {
  const { token } = req.params;
  let session; // Declare session outside try so it's accessible in finally

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const { password } = req.body;

    console.log(`[authController.confirmAccountDeletion] Attempting to confirm account deletion for token (param): ${token}`);

    const user = await User.findOne({
      deleteAccountToken: hashedToken,
      deleteAccountTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.warn(`[authController.confirmAccountDeletion] Token invalid or expired. Hashed token used for search: ${hashedToken}`);
      return res.status(400).json({ message: 'Deletion token is invalid or has expired.' });
    }

    // --- DEBUGGING LOG ---
    // Log the type and structure of the user object.
    console.log(`[authController.confirmAccountDeletion] User found: ${user._id}. Verifying password.`);
    // For more detail, you could log the object itself, but be mindful of sensitive data in logs.
    // console.log('[DEBUG] User object details:', JSON.stringify(user, null, 2)); // Be cautious with this in production
    // --- END DEBUGGING LOG ---

    if (!password || !(await user.matchPassword(password))) { // Assumes user.matchPassword method exists
      console.warn(`[authController.confirmAccountDeletion] Incorrect password for user ${user.email}`);
      return res.status(401).json({ message: 'Incorrect password. Account deletion failed.' });
    }

    // --- Direct Deletion Logic within a Transaction ---
    session = await mongoose.startSession();
    session.startTransaction();
    console.log(`[authController.confirmAccountDeletion] Transaction started for user ${user._id}`);

      // 1. Find associated Employee records for the user
    const employeesToDelete = await Employee.find({ userId: user._id }).session(session);

      if (employeesToDelete.length > 0) {
      console.log(`[authController.confirmAccountDeletion] Found ${employeesToDelete.length} employee record(s) for user ${user._id}.`);
        for (const emp of employeesToDelete) {
        console.log(`[authController.confirmAccountDeletion] Deleting data for employee ${emp._id}...`);
          // Explicitly delete Timesheets, VehicleReviews, and Schedules for this employee
          await Timesheet.deleteMany({ employeeId: emp._id }, { session });
          console.log(`[authController.confirmAccountDeletion] Deleted Timesheets for employee ${emp._id}.`);
          await VehicleReview.deleteMany({ employeeId: emp._id }, { session });
          console.log(`[authController.confirmAccountDeletion] Deleted VehicleReviews for employee ${emp._id}.`);
          await Schedule.deleteMany({ employee: emp._id }, { session });
          console.log(`[authController.confirmAccountDeletion] Deleted Schedules for employee ${emp._id}.`);

          // Then delete the Employee record itself
          await Employee.findByIdAndDelete(emp._id, { session });
        console.log(`[authController.confirmAccountDeletion] Deleted employee record ${emp._id}.`);
        }
      } else {
      console.log(`[authController.confirmAccountDeletion] No employee records found for user ${user._id}.`);
      }

      // 2. Finally, delete the User record
      // Using findByIdAndDelete as pre('remove') hooks are no longer used for this cascade.
    await User.findByIdAndDelete(user._id, { session });
    console.log(`[authController.confirmAccountDeletion] User ${user.email} (ID: ${user._id}) document deleted.`);
      
      await session.commitTransaction();
    console.log(`[authController.confirmAccountDeletion] Transaction committed for user ${user._id}.`);
    
    res.status(200).json({ message: 'Your account has been successfully deleted.' });

  } catch (error) {
    console.error(`[authController.confirmAccountDeletion] Critical error for token (param): ${token}. Error:`, error);
    if (session && session.inTransaction()) {
        await session.abortTransaction();
      console.log(`[authController.confirmAccountDeletion] Transaction aborted for token (param): ${token}.`);
      }
    res.status(500).json({ message: 'An internal server error occurred while deleting the account. Please try again.' });
  } finally {
    if (session) {
      session.endSession();
      console.log(`[authController.confirmAccountDeletion] Session ended for token (param): ${token}.`);
    }
  }
};