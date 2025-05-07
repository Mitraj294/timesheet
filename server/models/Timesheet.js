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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure a unique timesheet entry per employee per day.
timesheetSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Middleware: Update the 'updatedAt' field on each save.
timesheetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Timesheet = mongoose.model('Timesheet', timesheetSchema);

export default Timesheet;
