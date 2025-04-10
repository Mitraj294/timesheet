import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  roleName: { type: String, required: true },
  roleDescription: { type: String, required: true },
  color: { type: String, default: 'Blue' },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  schedule: [
    {
      day: { type: String },
      startTime: { type: String },
      endTime: { type: String },
    },
  ],
}, { timestamps: true });

export default mongoose.model('Role', RoleSchema);
