import mongoose from "mongoose";

// Schedule schema: stores a single work shift for an employee
const scheduleSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Employer who owns this schedule
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee", // Employee assigned to this shift
      required: true,
      index: true,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role", // Optional: role for this shift
      default: null,
      index: true,
    },
    date: {
      type: Date,
      required: true, // Date of the shift
      index: true,
    },
    startTime: {
      type: String, // e.g., "09:00"
      required: true,
    },
    endTime: {
      type: String, // e.g., "17:00"
      required: true,
    },
    timezone: {
      type: String,
      required: true,
      default: "UTC", // Timezone for the shift
    },
  },
  {
    timestamps: true, autoIndex: process.env.NODE_ENV !== 'production' // Adds createdAt and updatedAt
  },
);

// Compound index for common lookup: an employee's schedule on a specific date
scheduleSchema.index({ employee: 1, date: 1 });
// Compound index for an employer's schedules on a specific date
scheduleSchema.index({ employerId: 1, date: 1 });

const Schedule = mongoose.model("Schedule", scheduleSchema);
export default Schedule;
