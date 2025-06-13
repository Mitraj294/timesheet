import mongoose from "mongoose";

// Invitation for a prospective employee to join a company
const InvitationSchema = new mongoose.Schema({
  prospectiveEmployeeName: { type: String, required: true, index: true }, // Name of person invited
  prospectiveEmployeeEmail: { type: String, required: true, lowercase: true, index: true },
  companyName: { type: String, required: true }, // Company as entered by invitee
  companyEmail: { type: String, required: true, lowercase: true, index: true }, // Employer's email
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending", // Invitation starts as pending
    index: true,
  },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }, // Linked employer (if found)
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }, // Who approved/rejected
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { autoIndex: process.env.NODE_ENV !== 'production' });

// Always update 'updatedAt' on save
InvitationSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Invitation", InvitationSchema);
