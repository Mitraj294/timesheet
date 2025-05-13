// /home/digilab/timesheet/server/models/Employee.js
import mongoose from "mongoose";
import Timesheet from "./Timesheet.js"; // Ensure this path is correct
import VehicleReview from "./VehicleReview.js"; // Ensure this path is correct
import Schedule from "./Schedule.js"; // Ensure this path is correct

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
  // userId links this employee record to a User account (for login, etc.)
  // unique:true and sparse:true means a User can only be linked to one Employee record,
  // and null userId values are allowed and don't conflict for uniqueness.
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    unique: true, 
    sparse: true // Allows multiple documents to have a null userId
  },
  // employerId links this employee to their employer (which is also a User with role 'employer')
  employerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
});

// Middleware: Before removing an employee, delete their associated Timesheets, VehicleReviews, and Schedules.
EmployeeSchema.pre('remove', async function(next) {
  // 'this' refers to the employee document being removed
  console.log(`[Employee.pre('remove')] Employee ${this._id} (Email: ${this.email}, Code: ${this.employeeCode}) is being removed. Cleaning up associated data...`);
  try {
    // Delete associated Timesheet records
    // Assumes Timesheet model has an 'employeeId' field linking to Employee._id
    const timesheetDeleteResult = await Timesheet.deleteMany({ employeeId: this._id });
    console.log(`[Employee.pre('remove')] Timesheet.deleteMany result for employee ${this._id}: ${JSON.stringify(timesheetDeleteResult)}`);

    // Delete associated VehicleReview records
    // Assumes VehicleReview model has an 'employeeId' field linking to Employee._id
    const reviewDeleteResult = await VehicleReview.deleteMany({ employeeId: this._id });
    console.log(`[Employee.pre('remove')] VehicleReview.deleteMany result for employee ${this._id}: ${JSON.stringify(reviewDeleteResult)}`);

    // Delete associated Schedules
    // Assumes Schedule model has an 'employee' field linking to Employee._id
    const scheduleDeleteResult = await Schedule.deleteMany({ employee: this._id });
    console.log(`[Employee.pre('remove')] Schedule.deleteMany result for employee ${this._id}: ${JSON.stringify(scheduleDeleteResult)}`);

    // Note: Removing employee from Roles is handled in employeeController.deleteEmployee
    // as it's more of a business logic step than a direct data cascade from Employee model.

    next(); // Proceed to actually remove the Employee document
  } catch (error) {
    console.error(`[Employee.pre('remove')] Error during associated data cleanup for employee ${this._id}:`, error);
    next(error); // If an error occurs, pass it to Mongoose to halt the remove operation
  }
});

export default mongoose.model("Employee", EmployeeSchema);
