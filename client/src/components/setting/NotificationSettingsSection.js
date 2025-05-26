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
// import { setAlert } from '../../redux/slices/alertSlice'; // Kept for reference, thunks usually handle alerts
import '../../styles/NotificationSettings.scss';
// Hypothetically, if a separate action is needed to trigger schedule updates:
// import { rescheduleGlobalNotifications } from '../../redux/slices/settingsSlice'; // or a new notificationSlice


const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const booleanOptions = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];
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
    // Initialize or update dailyNotificationTimes and actionNotificationEmail when currentEmployerSettings change
    if (currentEmployerSettings) {
      const initialDailyTimes = {};
      daysOfWeek.forEach(day => {
        initialDailyTimes[day.toLowerCase()] = currentEmployerSettings.globalNotificationTimes?.[day.toLowerCase()] || '';
      });
      setDailyNotificationTimes(initialDailyTimes);
      setActionNotificationEmail(currentEmployerSettings.actionNotificationEmail || '');
    }
  }, [currentEmployerSettings]);

  useEffect(() => {
    // Initialize or update employeeNotificationEnabled when employees list changes
    if (employees.length > 0) {
      const initialEmployeeStatus = {};
      employees.forEach(emp => {
        // Assumes employee object has 'receivesActionNotifications' boolean property
        // Defaults to true if the property is undefined or true
        initialEmployeeStatus[emp._id] = emp.receivesActionNotifications !== false; // Store as boolean
      });
      setEmployeeNotificationEnabled(initialEmployeeStatus);
    } else {
      setEmployeeNotificationEnabled({}); // Clear if no employees
    }
  }, [employees]);

  const handleActionEmailChange = (e) => {
    setActionNotificationEmail(e.target.value);
  };

  const handleDailyTimeChange = (day, time) => {
    // time will be '' if cleared, or 'HH:mm' if set
    setDailyNotificationTimes(prev => ({
      ...prev,
      [day.toLowerCase()]: time,
    }));
  };

  const handleEmployeeToggleChange = (employeeId, value) => {
    setEmployeeNotificationEnabled(prev => ({
      ...prev,
      [employeeId]: value === 'true', // Convert string from select to boolean
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
        receivesNotifications: employeeNotificationEnabled[empId] // Already a boolean
    }));

    // console.log('Submitting Employer Notification Settings:', employerNotificationSettingsToSave);
    // console.log('Submitting Employee Notification Preferences:', employeeNotificationPreferencesToSave);

    try {
      // Step 1: Update employer-wide settings (e.g., save to Employer model/settings document)
      // This action sends `globalNotificationTimes` to the backend.
      await dispatch(updateEmployerSettings(employerNotificationSettingsToSave)).unwrap();
      
      // SERVER-SIDE REQUIREMENT FOR UPDATING SCHEDULED NOTIFICATIONS:
      // The backend logic for the 'updateEmployerSettings' endpoint (or a subsequent triggered process
      // within the same handler) needs to be enhanced to handle the cascading update to
      // ScheduledNotification documents.
      // When 'globalNotificationTimes' are updated via the call above, the backend should:
      // 1. After successfully saving the employer settings, retrieve the employer's timezone.
      // 2. Identify all 'pending' ScheduledNotification documents for this employer whose scheduling
      //    is intrinsically linked to these global daily times (e.g., daily summary notifications).
      //    This might require a 'notificationType' or 'referenceDayOfWeek' field on ScheduledNotification.
      // 3. For each such identified notification, recalculate its 'scheduledTimeUTC' based on the
      //    newly provided 'globalNotificationTimes' and the employer's timezone.
      //    For instance, if Monday's notification time changes from 09:00 to 10:00 local time,
      //    all relevant pending Monday notifications should be rescheduled to the next 10:00
      //    (converted to UTC) on a Monday.
      // This server-side logic, integrated into the existing `updateEmployerSettings` handler,
      // is crucial for the changes in global notification times to correctly adjust future scheduled sends.

      // OPTIONAL CLIENT-SIDE TRIGGER (Less Ideal if backend can handle it directly):
      // If, for some architectural reason, the backend's `updateEmployerSettings` endpoint
      // cannot directly handle the rescheduling, a separate action dispatched from the client
      // would be a fallback. This would require a new backend endpoint and a corresponding
      // Redux thunk (e.g., `rescheduleGlobalNotifications`).
      // Example:
      //   await dispatch(rescheduleGlobalNotifications({
      //       globalNotificationTimes: employerNotificationSettingsToSave.globalNotificationTimes
      //   })).unwrap();
      // However, integrating into the existing `updateEmployerSettings` backend flow is preferred.

      // Step 2: Update individual employee notification preferences
      if (employeeNotificationPreferencesToSave.length > 0) {
        await dispatch(updateEmployeesNotificationPreferences(employeeNotificationPreferencesToSave)).unwrap();
      }
      // Success alerts are typically handled within the thunks themselves.
      // If not, a general success alert could be dispatched here, e.g.:
      // dispatch(setAlert('Notification settings updated. Scheduled notifications will be adjusted accordingly by the server.', 'success'));
    } catch (error) {
      // Error alerts are also typically handled within the thunks. If not, a generic one can be added.
      console.error('Failed to update one or more notification settings. Scheduled notifications may not be updated if the primary setting update failed or the backend logic is not in place:', error);
      // dispatch(setAlert('Failed to update notification settings. Please ensure backend is configured to update schedules.', 'danger'));
    }
  };

  if (employeeStatus === 'loading' && !employees.length) {
    return <div className="settings-placeholder-content" style={{ textAlign: 'center', padding: '20px' }}><FontAwesomeIcon icon={faSpinner} spin size="2x" /><p>Loading employees...</p></div>;
  }

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
                  // Convert boolean state to string for select value. Default to 'true' if undefined.
                  value={
                    employeeNotificationEnabled[employee._id] !== undefined 
                    ? String(employeeNotificationEnabled[employee._id]) 
                    : 'true'}
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
