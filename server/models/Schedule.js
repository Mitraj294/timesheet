import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // If role is not used in this context, you can make it optional:
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
}, { timestamps: true });

const Schedule = mongoose.model('Schedule', scheduleSchema);
export default Schedule;
