// /home/digilab/timesheet/server/models/User.js
import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
import Employee from "./Employee.js"; // Import Employee model for cascading delete
import Timesheet from "./Timesheet.js"; // Import Timesheet model
import VehicleReview from "./VehicleReview.js"; // Import VehicleReview model

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["employee", "employer", "admin"], default: "employee" }, // Added 'admin'
  // Optional fields from registration
  country: { type: String },
  phoneNumber: { type: String },
  companyName: { type: String }, // Primarily for employer role
  createdAt: { type: Date, default: Date.now },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  deleteAccountToken: { type: String },
  deleteAccountTokenExpires: { type: Date },
});

// Middleware: Hash password before saving a new user or when password is modified.
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10); // Salt rounds
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware: Before removing a user, delete their associated data.
UserSchema.pre('remove', async function(next) {
  // 'this' refers to the user document being removed
  console.log(`[User.pre('remove')] User ${this._id} (${this.email}) is being removed. Attempting to delete associated Employee record...`);
  try {
    // Delete associated Employee record(s) where this user is the employee
    // This will effectively remove the user's role as an employee in any company.
    // The Employee model's pre('remove') hook will handle deletion of Timesheets and VehicleReviews.
    const employeeDeleteResult = await Employee.deleteMany({ userId: this._id });
    console.log(`[User.pre('remove')] Employee.deleteMany result for user ${this._id}: ${JSON.stringify(employeeDeleteResult)}`);

    next();
  } catch (error) {
    console.error(`[User.pre('remove')] Error deleting associated Employee records for user ${this._id}:`, error);
    next(error); // Pass error to stop the remove operation if cleanup fails critically
  }
});

// Method: Compare entered password with the hashed password in the database.
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);
