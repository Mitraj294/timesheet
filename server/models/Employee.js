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

// No pre('remove') hook here for cascading deletes, as controllers will handle this explicitly.

export default mongoose.model("Employee", EmployeeSchema);
