import mongoose from "mongoose";

// Invitation for a prospective employee to join a company
const InvitationSchema = new mongoose.Schema({
  prospectiveEmployeeName: { type: String, required: true }, // Name of person invited
  prospectiveEmployeeEmail: { type: String, required: true, lowercase: true },
  companyName: { type: String, required: true }, // Company as entered by invitee
  companyEmail: { type: String, required: true, lowercase: true }, // Employer's email
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending', // Invitation starts as pending
  },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Linked employer (if found)
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who approved/rejected
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Always update 'updatedAt' on save
InvitationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Invitation", InvitationSchema);