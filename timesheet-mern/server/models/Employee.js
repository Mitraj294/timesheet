import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  employeeCode: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  isAdmin: { type: Boolean, default: false },
  overtime: { type: Boolean, default: false },
  expectedHours: { type: Number, default: 40 },
  holidayMultiplier: { type: Number, default: 1.5 },
  wage: { type: Number, required: true },
  totalLeavesTaken: { type: Number, default: 0 }
});

export default mongoose.model("Employee", EmployeeSchema);
