// /home/digilab/timesheet/server/models/User.js
import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
import Employee from "./Employee.js"; // Import Employee model for cascading delete

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

// Middleware: Before removing a user, delete their associated Employee record if they are an employee.
UserSchema.pre('remove', async function(next) {
  // 'this' refers to the user document being removed
  if (this.role === 'employee') {
    try {
      // Assuming Employee model has a 'userId' field linking to User._id
      await Employee.deleteMany({ userId: this._id });
      console.log(`Associated employee records for user ${this._id} deleted.`);
    } catch (error) {
      console.error(`Error deleting associated employee records for user ${this._id}:`, error);
      // Decide if the error should prevent user deletion or just be logged
      // next(error); // Call next with an error to halt the remove operation
    }
  }
  next();
});

// Method: Compare entered password with the hashed password in the database.
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);
