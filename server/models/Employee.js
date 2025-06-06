// /home/digilab/timesheet/server/models/Employee.js
import mongoose from "mongoose";
import Timesheet from "./Timesheet.js"; 
import VehicleReview from "./VehicleReview.js"; 
import Schedule from "./Schedule.js"; 

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Employee's name
  employeeCode: { type: String, required: true, unique: true }, // Unique code for employee
  email: { type: String, required: true, unique: true },
  isAdmin: { type: Boolean, default: false }, // Can this employee manage others?
  overtime: { type: Boolean, default: false }, // Eligible for overtime?
  expectedHours: { type: Number, default: 40 }, // Weekly expected hours
  holidayMultiplier: { type: Number, default: 1.5 }, // Pay multiplier for holidays
  wage: { type: Number, required: true }, // Hourly wage
  totalLeavesTaken: { type: Number, default: 0 }, // Track leave days taken

  // Links to User account (for login etc). Only one Employee per User.
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    unique: true, 
    sparse: true // Allows multiple employees with no userId
  },

  // Reference to employer (User with role 'employer')
  employerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  // Should this employee's actions trigger notifications to employer?
  receivesActionNotifications: {
    type: Boolean,
    default: true
  }
});

// No automatic cascading deletes; handled in controllers if needed.

export default mongoose.model("Employee", EmployeeSchema);
