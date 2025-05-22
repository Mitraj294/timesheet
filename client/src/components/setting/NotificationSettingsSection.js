// /home/digilab/timesheet/client/src/components/setting/NotificationSettingsSection.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { 
  fetchEmployees, 
  selectAllEmployees, 
  selectEmployeeStatus,
  updateEmployeesNotificationPreferences,
  selectEmployeeNotificationUpdateStatus // Selector for the employee notification update status
} from '../../redux/slices/employeeSlice';
// import { setAlert } from '../../redux/slices/alertSlice'; // Kept for reference, thunks usually handle alerts
import { 
  updateEmployerSettings,
  selectEmployerSettings, 
  selectSettingsStatus 
} from '../../redux/slices/settingsSlice'; 
import '../../styles/NotificationSettings.scss';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const NotificationSettingsSection = () => {
  const dispatch = useDispatch();
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employerSettingsUpdateStatus = useSelector(selectSettingsStatus); // Status for updating employer settings
  const currentEmployerSettings = useSelector(selectEmployerSettings); 
  const employeePrefsUpdateStatus = useSelector(selectEmployeeNotificationUpdateStatus); // Status for updating employee preferences

  // State for global daily notification times. Empty string means "immediate".
  const [dailyNotificationTimes, setDailyNotificationTimes] = useState({}); // { monday: '09:00' or '', ... }
  // State for per-employee notification enabled/disabled status
  const [employeeNotificationEnabled, setEmployeeNotificationEnabled] = useState({}); // { employeeId: 'true'/'false' }
  const [actionNotificationEmail, setActionNotificationEmail] = useState('');

  useEffect(() => {
    if (employeeStatus === 'idle') {
      dispatch(fetchEmployees());
    }
  }, [employeeStatus, dispatch]);

  useEffect(() => {
    // Initialize dailyNotificationTimes
    const initialDailyTimes = {};
    daysOfWeek.forEach(day => {
      initialDailyTimes[day.toLowerCase()] = currentEmployerSettings?.globalNotificationTimes?.[day.toLowerCase()] || ''; 
    });
    setDailyNotificationTimes(initialDailyTimes);

    // Initialize actionNotificationEmail
    setActionNotificationEmail(currentEmployerSettings?.actionNotificationEmail || '');

    // Initialize employeeNotificationEnabled when employees are loaded
    if (employees.length > 0) {
      const initialEmployeeStatus = {};
      employees.forEach(emp => {
        // Assumes employee object has 'receivesActionNotifications' boolean property
        // Defaults to 'true' (Yes) if the property is undefined or true
        initialEmployeeStatus[emp._id] = emp.receivesActionNotifications === false ? 'false' : 'true';
      });
      setEmployeeNotificationEnabled(initialEmployeeStatus);
    }
  }, [employees, currentEmployerSettings]); 

  const handleActionEmailChange = (e) => {
    setActionNotificationEmail(e.target.value);
  };

  const handleDailyTimeChange = (day, time) => {
    setDailyNotificationTimes(prev => ({
      ...prev,
      [day.toLowerCase()]: time, // time will be '' if cleared, or 'HH:mm' if set
    }));
  };

  const handleEmployeeToggleChange = (employeeId, value) => {
    setEmployeeNotificationEnabled(prev => ({
      ...prev,
      [employeeId]: value, // value will be 'true' or 'false' (string)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const employerNotificationSettingsToSave = {
        globalNotificationTimes: dailyNotificationTimes,
        actionNotificationEmail: actionNotificationEmail,
    };

    const employeeNotificationPreferencesToSave = Object.keys(employeeNotificationEnabled).map(empId => ({
        employeeId: empId,
        receivesNotifications: employeeNotificationEnabled[empId] === 'true' 
    }));

    // console.log('Submitting Employer Notification Settings:', employerNotificationSettingsToSave);
    // console.log('Submitting Employee Notification Preferences:', employeeNotificationPreferencesToSave);

    try {
      // Update employer-wide settings
      await dispatch(updateEmployerSettings(employerNotificationSettingsToSave)).unwrap();
      
      // Update individual employee notification preferences
      if (employeeNotificationPreferencesToSave.length > 0) {
        await dispatch(updateEmployeesNotificationPreferences(employeeNotificationPreferencesToSave)).unwrap();
      }
      // Success alerts are typically handled within the thunks themselves
    } catch (error) {
      // Error alerts are also typically handled within the thunks.
      // You might dispatch a generic error alert here if thunks don't cover all cases.
      console.error('Failed to update one or more notification settings:', error);
    }
  };

  if (employeeStatus === 'loading' && !employees.length) {
    return <div className="settings-placeholder-content" style={{ textAlign: 'center', padding: '20px' }}><FontAwesomeIcon icon={faSpinner} spin size="2x" /><p>Loading employees...</p></div>;
  }

const booleanOptions = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

  return (
    <div className="notification-settings-card"> {/* Main card container */}
      <h3 className="notification-settings-title">Notification Preferences</h3>
      <form onSubmit={handleSubmit}>

        {/* Section 0: Action Notification Email */}
        <div className="settings-section">
            <h4 className="section-subtitle">Action Notification Email</h4>
            <p className="section-description">
                Set the email address where notifications for timesheet creation/updates will be sent.
            </p>
            <div className="settings-input-group">
                <label htmlFor="actionNotificationEmail" className="settings-input-group-label">Email Address:</label>
                <input
                    type="email"
                    id="actionNotificationEmail"
                    className="settings-text-input" // Use a general class for text inputs
                    value={actionNotificationEmail}
                    onChange={handleActionEmailChange}
                    disabled={employerSettingsUpdateStatus === 'loading' || employeePrefsUpdateStatus === 'loading'}
                    placeholder="e.g., manager@example.com"
                />
            </div>
        </div>
        {/* Section 1: Global Daily Notification Times */}
        <div className="settings-section">
          <h4 className="section-subtitle">Daily Notification Time</h4>
          <p className="section-description">
            Set the time for daily notifications. This time applies to all employees who have notifications enabled.
            Leave the time blank for a day to receive notifications immediately when a timesheet is created or updated on that day.
          </p>
          {daysOfWeek.map(day => (
            <div key={day} className="settings-input-group">
              <label htmlFor={`time-${day}`} className="settings-input-group-label">{day}:</label>
              <div className="time-picker-container"> {/* Mimicking structure from example */}
                <input
                  type="time"
                  id={`time-${day}`}
                  className="settings-time-input" // General class for time inputs
                  value={dailyNotificationTimes[day.toLowerCase()] || ''} // Handles empty string for blank input
                  onChange={(e) => handleDailyTimeChange(day, e.target.value)}
                  disabled={employerSettingsUpdateStatus === 'loading' || employeePrefsUpdateStatus === 'loading'}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Section 2: Per-Employee Notification Toggle */}
        <div className="settings-section">
          <h4 className="section-subtitle">Employee Specific Notifications</h4>
          <p className="section-description">Enable or disable daily notifications for individual employees regarding their timesheet activities.</p>
          {employees.length > 0 ? employees.map(employee => (
            <div key={employee._id} className="settings-input-group employee-specific-group">
              <label htmlFor={`notify-${employee._id}`} className="settings-input-group-label employee-name-label">
                {employee.name} ({employee.email}):
              </label>
              <div className="select-container"> {/* Mimicking structure from example */}
                <select
                  id={`notify-${employee._id}`}
                  className="settings-select-input" // General class for select inputs
                  value={employeeNotificationEnabled[employee._id] || 'true'} // Default to 'true' if not set
                  onChange={(e) => handleEmployeeToggleChange(employee._id, e.target.value)}
                  disabled={employerSettingsUpdateStatus === 'loading' || employeePrefsUpdateStatus === 'loading'}
                >
                  {booleanOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )) : <p>No employees found to configure.</p>}
        </div>

        <div className="settings-button-group">
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={
              employerSettingsUpdateStatus === 'loading' || 
              employeePrefsUpdateStatus === 'loading' || 
              (employeeStatus === 'loading' && !employees.length)
            }>
            {(employerSettingsUpdateStatus === 'loading' || employeePrefsUpdateStatus === 'loading') ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
            <span className="button-text">{(employerSettingsUpdateStatus === 'loading' || employeePrefsUpdateStatus === 'loading') ? 'Updating...' : 'Update'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationSettingsSection;
