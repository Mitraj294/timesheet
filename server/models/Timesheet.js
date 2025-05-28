// /home/digilab/timesheet/server/models/Timesheet.js
import mongoose from 'mongoose';

const timesheetSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  date: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  startTime: { type: Date, default: null }, // Stored as full UTC BSON Date
  endTime: { type: Date, default: null },   // Stored as full UTC BSON Date
  lunchBreak: { type: String, enum: ['Yes', 'No'], default: 'No' },
  lunchDuration: {
      type: String,
      default: '00:00',
      match: [/^\d{2}:\d{2}$/, 'Lunch duration must be in HH:MM format']
  },
  leaveType: { type: String, default: 'None' },
  totalHours: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  description: { type: String, default: '' },
  hourlyWage: { type: Number, default: 0 },
  timezone: { type: String, default: 'UTC' }, // User's local timezone identifier
  actualEndTime: { type: Date, default: null }, // Actual timestamp when endTime was recorded
  isActiveStatus: { type: String, enum: ['Active', 'Inactive'], default: 'Inactive' }, // Stored status
  startLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: { // [longitude, latitude]
      type: [Number],
      default: undefined, // Or [] if you prefer, but undefined means it won't be set if no coords
    },
    address: { type: String, trim: true, default: '' } // Optional: Store reverse-geocoded address
  },
  endLocation: { // Same structure as startLocation
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined },
    address: { type: String, trim: true, default: '' }
  },
  // createdAt and updatedAt will be handled by timestamps option
}, { 
  timestamps: true,
  toJSON: {}, // No virtuals to include
  toObject: {} // No virtuals to include
});

// Ensure a unique timesheet entry per employee per day.
timesheetSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// The { timestamps: true } option automatically handles createdAt and updatedAt,
// so the manual pre('save') hook for updatedAt is no longer needed.

const Timesheet = mongoose.model('Timesheet', timesheetSchema);

export default Timesheet;
