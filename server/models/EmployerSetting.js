import mongoose from "mongoose";

// Settings for each employer (preferences, timesheet, notifications, etc.)
const EmployerSettingSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Link to employer user
      required: true,
      unique: true, // One settings doc per employer
      index: true,
    },
    tabletViewRecordingType: {
      type: String,
      enum: ["Automatically Record", "Manually Record"],
      default: "Automatically Record",
    },
    tabletViewPasswordRequired: {
      type: Boolean,
      default: false,
    },
    showVehiclesTabInSidebar: {
      type: Boolean,
      // If not set, vehicles tab may be hidden
    },
    // Timesheet settings
    timesheetStartDayOfWeek: {
      type: String,
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      default: "Monday",
    },
    timesheetIsLunchBreakDefault: {
      type: Boolean,
      default: true, // Lunch break included by default
    },
    timesheetAllowOldEdits: {
      type: Boolean,
      default: false, // Don't allow editing old timesheets by default
    },
    defaultTimesheetViewType: {
      type: String,
      enum: ["Daily", "Weekly", "Fortnightly", "Monthly"],
      default: "Weekly",
    },
    timesheetHideWage: {
      type: Boolean,
      default: false, // Show wage info by default
    },
    timesheetIsProjectClientRequired: {
      type: Boolean,
      default: false,
    },
    timesheetAreNotesRequired: {
      type: Boolean,
      default: false,
    },
    employeeCanCreateProject: {
      type: Boolean,
      default: false, // Employees can't create projects by default
    },
    reportColumns: {
      type: [String], // List of columns to show in reports
      // If not set, show all columns
    },
    weeklyReportEmail: {
      type: String,
      trim: true,
      default: "", // Email for weekly reports
    },
    globalNotificationTimes: {
      type: {
        monday: { type: Date, default: null },
        tuesday: { type: Date, default: null },
        wednesday: { type: Date, default: null },
        thursday: { type: Date, default: null },
        friday: { type: Date, default: null },
        saturday: { type: Date, default: null },
        sunday: { type: Date, default: null },
      },
      default: () => ({
        monday: null,
        tuesday: null,
        wednesday: null,
        thursday: null,
        friday: null,
        saturday: null,
        sunday: null,
      }),
    },
    actionNotificationEmail: {
      type: String,
      trim: true,
      default: "", // Email for action notifications
    },
    timezone: {
      type: String,
      trim: true,
      default: "Asia/Kolkata", // Default timezone
    },
  },
  {
    timestamps: true, autoIndex: process.env.NODE_ENV !== 'production' // Adds createdAt and updatedAt
  },
);

const EmployerSetting = mongoose.model(
  "EmployerSetting",
  EmployerSettingSchema,
);

export default EmployerSetting;
