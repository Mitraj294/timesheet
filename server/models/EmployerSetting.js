import mongoose from 'mongoose';

const EmployerSettingSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming your User model is named 'User'
    required: true,
    unique: true, // Each employer should have only one settings document
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
    default: true, // Default to showing the tab
  },
  // You can add more employer-specific settings here in the future
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

// Ensure that the employerId is indexed for faster lookups
EmployerSettingSchema.index({ employerId: 1 });

const EmployerSetting = mongoose.model('EmployerSetting', EmployerSettingSchema);

export default EmployerSetting;