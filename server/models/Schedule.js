import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String, // Storing as string e.g., "09:00"
    required: true,
  },
  endTime: {
    type: String, // Storing as string e.g., "17:00"
    required: true,
  },
  timezone: {
    type: String,
    required: true,
    default: 'UTC',
  }
}, {
  timestamps: true
});

const Schedule = mongoose.model('Schedule', scheduleSchema);
export default Schedule;
