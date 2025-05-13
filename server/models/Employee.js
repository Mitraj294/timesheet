import mongoose from "mongoose";
import Timesheet from "./Timesheet.js"; // Import Timesheet model
import VehicleReview from "./VehicleReview.js"; // Import VehicleReview model
import Schedule from "./Schedule.js"; // Import Schedule model for cascading delete

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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true }, // Link to User model for the employee themselves
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Link to the User model for the employer
});

// Middleware: Before removing an employee, delete their associated Timesheets and VehicleReviews.
EmployeeSchema.pre('remove', async function(next) {
  // 'this' refers to the employee document being removed
  console.log(`[Employee.pre('remove')] Employee ${this._id} (${this.email}) is being removed. Cleaning up associated data...`);
  try {
    // Delete associated Timesheet records
    const timesheetDeleteResult = await Timesheet.deleteMany({ employeeId: this._id });
    console.log(`[Employee.pre('remove')] Timesheet.deleteMany result for employee ${this._id}: ${JSON.stringify(timesheetDeleteResult)}`);

    // Delete associated VehicleReview records
    const reviewDeleteResult = await VehicleReview.deleteMany({ employeeId: this._id });
    console.log(`[Employee.pre('remove')] VehicleReview.deleteMany result for employee ${this._id}: ${JSON.stringify(reviewDeleteResult)}`);

    // Delete associated Schedules (field name in Schedule model is 'employee')
    const scheduleDeleteResult = await Schedule.deleteMany({ employee: this._id });
    console.log(`[Employee.pre('remove')] Schedule.deleteMany result for employee ${this._id}: ${JSON.stringify(scheduleDeleteResult)}`);

    // Note: Removing employee from Roles is handled in employeeController.deleteEmployee
    // as it's more of a business logic step than a direct data cascade from Employee model.

    next();
  } catch (error) {
    console.error(`[Employee.pre('remove')] Error during associated data cleanup for employee ${this._id}:`, error);
    next(error); // Pass error to stop the remove operation if cleanup fails critically
  }
});

export default mongoose.model("Employee", EmployeeSchema);
