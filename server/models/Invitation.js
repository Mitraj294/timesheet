import mongoose from "mongoose";

const InvitationSchema = new mongoose.Schema({
  prospectiveEmployeeName: { type: String, required: true },
  prospectiveEmployeeEmail: { type: String, required: true, lowercase: true },
  companyName: { type: String, required: true }, // As entered by prospective employee
  companyEmail: { type: String, required: true, lowercase: true }, // Employer's email to find the target employer
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // To link to the employer once identified
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who approved/rejected
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

InvitationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Invitation", InvitationSchema);