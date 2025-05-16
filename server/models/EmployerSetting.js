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
 
}, {
  timestamps: true,
});

const EmployerSetting = mongoose.model('EmployerSetting', EmployerSettingSchema);

export default EmployerSetting;