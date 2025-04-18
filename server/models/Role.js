import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  day: { type: String, required: true },
  startTime: { type: String },
  endTime: { type: String }
});

const roleSchema = new mongoose.Schema({
  roleName: { type: String, required: true },
  roleDescription: { type: String },
  color: { type: String },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],

  schedule: [scheduleSchema]
}, { timestamps: true });

const Role = mongoose.model('Role', roleSchema);
export default Role;
