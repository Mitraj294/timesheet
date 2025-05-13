// /home/digilab/timesheet/server/models/User.js
import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
// Employee model is not directly needed here for cascading delete anymore,
// as authController will handle finding employees.
// However, if there are other parts of User model logic that might need Employee, keep it.
// For now, assuming it's not strictly needed for this simplified hook.
// import Employee from "./Employee.js"; 

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

// Pre-save hook for hashing password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error); // Pass errors to Mongoose
  }
});

// This pre('remove') hook is now simplified.
// The explicit deletion of associated Employee records (and their dependent data)
// when a User account is deleted via ConfirmDeleteAccountPage
// will be handled directly in the authController.js.
// This hook will still run if user.remove() or user.deleteOne() is called on an instance.
UserSchema.pre('remove', async function(next) {
  console.log(`[User.pre('remove')] User ${this._id} (${this.email}) is being removed. Any User-specific pre-remove logic (not Employee cascade) would go here.`);
  // If there's any other cleanup specific to the User model itself (not cascading to Employee),
  // it could be added here. For now, it's just a log.
  next();
});

// Method to check password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);
