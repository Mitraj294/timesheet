import mongoose from 'mongoose';

const EmployerSettingSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
    unique: true, 
  },
  tabletViewRecordingType: {
    type: String,
    enum: ['Automatically Record', 'Manually Record'],
    default: 'Automatically Record',
  },
  tabletViewPasswordRequired: {
    type: Boolean,
    default: false,
  },
  showVehiclesTabInSidebar: {
    type: Boolean,
    // No default value; will be undefined if not explicitly set
  },
  // Timesheet Specific Settings
  timesheetStartDayOfWeek: {
    type: String,
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    default: 'Monday',
  },
  timesheetIsLunchBreakDefault: {
    type: Boolean,
    default: true, // e.g., Lunch break is typically included
  },
  timesheetAllowOldEdits: {
    type: Boolean,
    default: false, // By default, don't allow editing old timesheets
  },
  defaultTimesheetViewType: {
    type: String,
    enum: ['Daily', 'Weekly', 'Fortnightly', 'Monthly'],
    default: 'Weekly',
  },
  timesheetHideWage: {
    type: Boolean,
    default: false, // By default, show wage information
  },
  timesheetIsProjectClientRequired: {
    type: Boolean,
    default: false, // Default to No (false)
  },
  timesheetAreNotesRequired: {
    type: Boolean,
    default: false,       // Default to No (false)
  },
  employeeCanCreateProject: {
    type: Boolean,
    default: false, // By default, employees cannot create projects
  },
  reportColumns: {
    type: [String], // Array of strings to store selected column keys
                    // default: [], // No default; undefined means all columns
  },
  weeklyReportEmail: {
    type: String,
    trim: true,
    default: '', // Default to an empty string
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
    default: () => ({ // Use a function for default object
      monday: null, tuesday: null, wednesday: null, thursday: null,
      friday: null, saturday: null, sunday: null
    }),
  },
  actionNotificationEmail: { // Email to receive notifications for timesheet actions
    type: String,
    trim: true,
    default: '', // Default to empty, employer can set it up
  },
  timezone: { // To interpret globalNotificationTimes correctly
    type: String,
    trim: true,
    default: 'Asia/Kolkata', // Default to Indian Standard Time
  },
}, {
  timestamps: true,
});

const EmployerSetting = mongoose.model('EmployerSetting', EmployerSettingSchema);

export default EmployerSetting;