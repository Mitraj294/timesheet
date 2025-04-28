// /home/digilab/timesheet/server/models/Timesheet.js
import mongoose from "mongoose";

const TimesheetSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    date: { type: Date, required: true },
    startTime: { type: Date },
    endTime: { type: Date },
    lunchBreak: { type: String, enum: ["Yes", "No"], default: "No" },
    lunchDuration: { type: String, default: "00:00" }, // Keep default for non-lunch cases
    leaveType: {
      type: String,
      enum: ["None", "None Working Days", "Annual", "Sick", "Public Holiday", "Paid", "Unpaid"],
      default: "None"
    },
    description: { type: String, default: "" },
    notes: { type: String, default: "" },
    hourlyWage: { type: Number },
    totalHours: { type: Number, default: 0 },
    // REMOVED default: "UTC" - Allow client value to be saved directly
    timezone: { type: String },
  },
  { timestamps: true }
);

// Index remains the same
TimesheetSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export default mongoose.model("Timesheet", TimesheetSchema);
