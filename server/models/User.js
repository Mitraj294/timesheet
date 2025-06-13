// /home/digilab/timesheet/server/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// User schema: stores login and profile info
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true }, // User's name
  email: { type: String, required: true, unique: true, index: true }, // Must be unique
  password: { type: String, required: true }, // Hashed password
  role: {
    type: String,
    enum: ["employee", "employer", "admin"],
    default: "employee",
    index: true,
  }, // User type
  country: { type: String },
  phoneNumber: { type: String },
  companyName: { type: String },
  createdAt: { type: Date, default: Date.now },
  passwordResetToken: { type: String }, // For password reset
  passwordResetExpires: { type: Date },
  deleteAccountToken: { type: String }, // For account deletion flow
  deleteAccountTokenExpires: { type: Date }, // For account deletion flow
}, { autoIndex: process.env.NODE_ENV !== 'production' });

// Hash password before saving if changed or new
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
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

// Compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", UserSchema);
