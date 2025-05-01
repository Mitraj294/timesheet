// /home/digilab/timesheet/server/models/User.js
import mongoose from "mongoose";
import bcrypt from 'bcryptjs'; // Import bcryptjs

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["employee", "employer"], default: "employee" },
  createdAt: { type: Date, default: Date.now }
});

// Middleware to hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10); // 10 is a good salt round value
    // Hash the password using the generated salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error); // Pass error to the next middleware
  }
});

// Method to compare entered password with hashed password (optional but useful)
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


export default mongoose.model("User", UserSchema);
