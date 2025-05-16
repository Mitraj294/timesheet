import mongoose from 'mongoose';
// You will need to create a Mongoose model for Employer Settings, e.g., EmployerSetting.js
import EmployerSetting from '../models/EmployerSetting.js'; 

// Helper to extract user-friendly error message
const getErrorMessage = (error) => {
  // Customize this based on how your backend handles errors
  return error.message || 'An unexpected server error occurred';
};

// @desc    Get settings for the logged-in employer
// @route   GET /api/settings/employer
// @access  Private (Employer Only)
export const getEmployerSettings = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  let targetEmployerId;

  if (req.user.role === 'employer') {
    targetEmployerId = req.user.id;
  } else if (req.user.role === 'employee') {
    // Assuming the employee's user object (req.user) has an employerId field
    // This field should be populated during login or available in the JWT payload.
    targetEmployerId = req.user.employerId; 
    if (!targetEmployerId) {
      console.error(`[settingsController] Employer ID not found for employee ${req.user.id}.`);
      return res.status(400).json({ message: 'Employer ID not found for this employee.' });
    }
  } else {
    return res.status(403).json({ message: 'User role not permitted to access settings.' });
  }

  try {
    let settings = await EmployerSetting.findOne({ employerId: targetEmployerId });

    if (!settings) {
      console.log(`[settingsController] No settings found for employer ${targetEmployerId}. Creating and returning defaults.`);
      const defaultSettings = {
        employerId: targetEmployerId, // Associate default settings with the correct employerId
        // showVehiclesTabInSidebar is intentionally omitted, will be undefined by default
        tabletViewRecordingType: 'Automatically Record',
        tabletViewPasswordRequired: false,
      };
      settings = new EmployerSetting(defaultSettings);
      await settings.save();
      return res.json(settings);
    }
    console.log(`[settingsController] Settings found for employer ${targetEmployerId}. Returning settings.`);
    res.json(settings);

  } catch (error) {
    console.error('[settingsController] Error fetching employer settings:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

// @desc    Update settings for the logged-in employer
// @route   PUT /api/settings/employer
// @access  Private (Employer Only)
export const updateEmployerSettingsController = async (req, res) => {
  // req.user should be available from the 'protect' middleware
  if (!req.user || req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Access denied.' });
  }

  try {
    // req.body should contain the settings to update, e.g., { showVehiclesTabInSidebar: false }
    const settingsToUpdate = req.body;

    // Find and update the settings for the logged-in employer (req.user.id)
    // Use upsert: true to create the settings document if it doesn't exist
    const updatedSettings = await EmployerSetting.findOneAndUpdate(
      { employerId: req.user.id },
      { $set: settingsToUpdate }, // Use $set to update specific fields
      { new: true, upsert: true, runValidators: true } // new:true returns the updated doc
    );

    console.log(`[settingsController] Settings updated for employer ${req.user.id}.`);
    res.json(updatedSettings);

  } catch (error) {
    console.error('[settingsController] Error updating employer settings:', error);
    res.status(500).json({ message: getErrorMessage(error) });
  }
};