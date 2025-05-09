import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  day: { type: String, required: true }, // e.g., "Monday", "Tuesday"
  startTime: { type: String },
  endTime: { type: String }
});

const roleSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming your user model is named 'User'
    required: true,
  },
  roleName: { type: String, required: true },
  roleDescription: { type: String },
  color: { type: String },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  schedule: [scheduleSchema] // Default weekly schedule for this role
}, { timestamps: true });

const Role = mongoose.model('Role', roleSchema);
export default Role;
