// /home/digilab/timesheet/server/models/Timesheet.js
import mongoose from "mongoose";

// Timesheet schema: stores a single day's work for an employee
const timesheetSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      // employeeId is part of a compound unique index below
    }, // Who worked
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
      index: true,
    }, // Optional: client for the work
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    }, // Optional: project for the work
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"], // e.g., "2024-05-01"
    },
    startTime: { type: Date, default: null }, // Work start (UTC)
    endTime: { type: Date, default: null }, // Work end (UTC)
    lunchBreak: { type: String, enum: ["Yes", "No"], default: "No" }, // Did employee take lunch?
    lunchDuration: {
      type: String,
      default: "00:00",
      match: [/^\d{2}:\d{2}$/, "Lunch duration must be in HH:MM format"], // e.g., "00:30"
    },
    leaveType: { type: String, default: "None" }, // Leave type if any
    totalHours: { type: Number, default: 0 }, // Total hours worked
    notes: { type: String, default: "" }, // Optional notes
    description: { type: String, default: "" }, // Optional description
    hourlyWage: { type: Number, default: 0 }, // Wage at time of entry
    timezone: { type: String, default: "UTC" }, // User's timezone
    actualEndTime: { type: Date, default: null }, // When endTime was actually recorded
    isActiveStatus: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Inactive",
      index: true,
    }, // Status of timesheet

    // Start location (geo point and address)
    startLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        // [longitude, latitude]
        type: [Number],
        default: undefined,
      },
      address: { type: String, trim: true, default: "" },
    },
    // End location (geo point and address)
    endLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined },
      address: { type: String, trim: true, default: "" },
    },
    // createdAt and updatedAt handled by timestamps
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    autoIndex: process.env.NODE_ENV !== 'production',
    // toJSON and toObject can be kept if you have specific transformations
  },
);

// Only one timesheet per employee per day
timesheetSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Timesheet = mongoose.model("Timesheet", timesheetSchema);

export default Timesheet;
