import mongoose from 'mongoose';

// Schedule for a single day (used in a role's weekly schedule)
const scheduleSchema = new mongoose.Schema({
  day: { type: String, required: true }, 
  startTime: { type: String },
  endTime: { type: String }    
});

// Role schema: defines a job role for an employer
const roleSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to employer
    required: true,
  },
  roleName: { type: String, required: true }, // Name of the role
  roleDescription: { type: String }, // Optional description
  color: { type: String }, // Optional color for UI
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }], // Employees with this role
  schedule: [scheduleSchema] // Default weekly schedule for this role
}, { timestamps: true }); // Adds createdAt and updatedAt

const Role = mongoose.model('Role', roleSchema);
export default Role;
