// /home/digilab/timesheet/server/models/User.js
import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
import Employee from "./Employee.js"; // Import Employee model
import Timesheet from "./Timesheet.js"; // Not directly used in this hook anymore
import VehicleReview from "./VehicleReview.js"; // Not directly used in this hook anymore

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["employee", "employer", "admin"], default: "employee" },
  country: { type: String },
  phoneNumber: { type: String },
  companyName: { type: String },
  createdAt: { type: Date, default: Date.now },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  deleteAccountToken: { type: String },
  deleteAccountTokenExpires: { type: Date },
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware: Before removing a user, find and remove their associated Employee records.
// This will, in turn, trigger the Employee model's pre('remove') hook.
UserSchema.pre('remove', async function(next) {
  console.log(`[User.pre('remove')] User ${this._id} (${this.email}) is being removed. Finding associated Employee records to trigger their removal...`);
  try {
    const employees = await Employee.find({ userId: this._id });

    if (employees.length > 0) {
      console.log(`[User.pre('remove')] Found ${employees.length} employee record(s) for user ${this._id}. Initiating their removal...`);
      for (const employee of employees) {
        // Calling .remove() on the instance triggers the Employee's pre('remove') hook
        await employee.remove(); 
        console.log(`[User.pre('remove')] Removal process initiated for employee ${employee._id} linked to user ${this._id}.`);
      }
    } else {
      console.log(`[User.pre('remove')] No employee records found for user ${this._id}.`);
    }
    next();
  } catch (error) {
    console.error(`[User.pre('remove')] Error during cascading delete of Employee records for user ${this._id}:`, error);
    next(error);
  }
});

UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);
