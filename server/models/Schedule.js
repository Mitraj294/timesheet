import mongoose from 'mongoose';

// Schedule schema: stores a single work shift for an employee
const scheduleSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Employer who owns this schedule
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee', // Employee assigned to this shift
    required: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role', // Optional: role for this shift
    default: null,
  },
  date: {
    type: Date,
    required: true, // Date of the shift
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
    default: 'UTC', // Timezone for the shift
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

const Schedule = mongoose.model('Schedule', scheduleSchema);
export default Schedule;
