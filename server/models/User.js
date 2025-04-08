import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["employee", "employer"], default: "employee" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", UserSchema);
