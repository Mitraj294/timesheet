// /home/digilab/timesheet/server/models/Employee.js
import mongoose from "mongoose";
import Timesheet from "./Timesheet.js";
import VehicleReview from "./VehicleReview.js";
import Schedule from "./Schedule.js";

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  employeeCode: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  isAdmin: { type: Boolean, default: false },
  overtime: { type: Boolean, default: false },
  expectedHours: { type: Number, default: 40 },
  holidayMultiplier: { type: Number, default: 1.5 },
  wage: { type: Number, required: true },
  totalLeavesTaken: { type: Number, default: 0 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

EmployeeSchema.pre('remove', async function(next) {
  console.log(`[Employee.pre('remove')] Employee ${this._id} (${this.email}) is being removed. Cleaning up associated data...`);
  try {
    const timesheetDeleteResult = await Timesheet.deleteMany({ employeeId: this._id });
    console.log(`[Employee.pre('remove')] Timesheet.deleteMany result for employee ${this._id}: ${JSON.stringify(timesheetDeleteResult)}`);

    const reviewDeleteResult = await VehicleReview.deleteMany({ employeeId: this._id });
    console.log(`[Employee.pre('remove')] VehicleReview.deleteMany result for employee ${this._id}: ${JSON.stringify(reviewDeleteResult)}`);

    const scheduleDeleteResult = await Schedule.deleteMany({ employee: this._id });
    console.log(`[Employee.pre('remove')] Schedule.deleteMany result for employee ${this._id}: ${JSON.stringify(scheduleDeleteResult)}`);

    next();
  } catch (error) {
    console.error(`[Employee.pre('remove')] Error during associated data cleanup for employee ${this._id}:`, error);
    next(error);
  }
});

export default mongoose.model("Employee", EmployeeSchema);
