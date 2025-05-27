// /home/digilab/timesheet/client/src/components/setting/NotificationSettingsSection.js
import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone'; // Import moment-timezone
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
import { 
  updateEmployerSettings,
  selectEmployerSettings, 
  selectSettingsStatus 
} from '../../redux/slices/settingsSlice'; 
import '../../styles/NotificationSettings.scss';


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
  const [dailyNotificationTimes, setDailyNotificationTimes] = useState({});
  const [employeeNotificationEnabled, setEmployeeNotificationEnabled] = useState({});
  const [actionNotificationEmail, setActionNotificationEmail] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState(moment.tz.guess() || 'UTC'); // State for timezone

  useEffect(() => {
    if (employeeStatus === 'idle') {
      dispatch(fetchEmployees());
    }
  }, [employeeStatus, dispatch]);

  useEffect(() => {
    if (currentEmployerSettings) {
      const initialDailyTimes = {};
      // Ensure employer's timezone is available, fallback to UTC or a sensible default
      const employerTimezone = currentEmployerSettings.timezone || selectedTimezone; // Use selectedTimezone as fallback
      setSelectedTimezone(employerTimezone); // Set initial timezone from settings

      daysOfWeek.forEach(day => {
        const dayKey = day.toLowerCase();
        const utcDateString = currentEmployerSettings.globalNotificationTimes?.[dayKey];
        if (utcDateString) { // utcDateString is an ISO date string from backend
          // Convert UTC date string to moment object, then to employer's local time, then format
          const displayTime = moment(utcDateString).tz(employerTimezone).format('HH:mm');
          initialDailyTimes[dayKey] = displayTime;
        } else {
          initialDailyTimes[dayKey] = ''; // No date set, so empty time string
        }
      });
      setDailyNotificationTimes(initialDailyTimes);
      setActionNotificationEmail(currentEmployerSettings.actionNotificationEmail || '');
    }
  }, [currentEmployerSettings]);

  useEffect(() => {
    if (employees.length > 0) {
      const initialEmployeeStatus = {};
      employees.forEach(emp => {
        initialEmployeeStatus[emp._id] = emp.receivesActionNotifications !== false;
      });
      setEmployeeNotificationEnabled(initialEmployeeStatus);
    } else {
      setEmployeeNotificationEnabled({});
    }
  }, [employees]);

  const handleActionEmailChange = (e) => {
    setActionNotificationEmail(e.target.value);
  };

  const handleDailyTimeChange = (day, time) => {
    setDailyNotificationTimes(prev => ({
      ...prev,
      [day.toLowerCase()]: time,
    }));
  };

  const handleTimezoneChange = (e) => {
    setSelectedTimezone(e.target.value);
  };

  const handleEmployeeToggleChange = (employeeId, value) => {
    setEmployeeNotificationEnabled(prev => ({
      ...prev,
      [employeeId]: value === 'true',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const employerNotificationSettingsToSave = {
        globalNotificationTimes: dailyNotificationTimes,
        actionNotificationEmail: actionNotificationEmail,
        timezone: selectedTimezone, // Include selected timezone
    };

    const employeeNotificationPreferencesToSave = Object.keys(employeeNotificationEnabled).map(empId => ({
        employeeId: empId,
        receivesNotifications: employeeNotificationEnabled[empId]
    }));

    try {
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
      // (The optional client-side trigger comment block was removed as the preferred method is server-side)

      if (employeeNotificationPreferencesToSave.length > 0) {
        await dispatch(updateEmployeesNotificationPreferences(employeeNotificationPreferencesToSave)).unwrap();
      }
    } catch (error) {
      console.error('Failed to update one or more notification settings. Scheduled notifications may not be updated if the primary setting update failed or the backend logic is not in place:', error);
    }
  };

  if (employeeStatus === 'loading' && !employees.length) {
    return <div className="settings-placeholder-content" style={{ textAlign: 'center', padding: '20px' }}><FontAwesomeIcon icon={faSpinner} spin size="2x" /><p>Loading employees...</p></div>;
  }

  return (
    <div className="notification-settings-card">
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
                    className="settings-text-input"
                    value={actionNotificationEmail}
                    onChange={handleActionEmailChange}
                    disabled={employerSettingsUpdateStatus === 'loading' || employeePrefsUpdateStatus === 'loading'}
                    placeholder="e.g., manager@example.com"
                />
            </div>
        </div>

        {/* Section for Timezone */}
        <div className="settings-section">
          <h4 className="section-subtitle">Timezone</h4>
          <p className="section-description">
            Select your primary timezone. This will ensure notification times are scheduled correctly.
          </p>
          <div className="settings-input-group">
            <label htmlFor="timezone-select" className="settings-input-group-label">Timezone:</label>
            <div className="select-container">
              <select
                id="timezone-select"
                className="settings-select-input"
                value={selectedTimezone}
                onChange={handleTimezoneChange}
                disabled={employerSettingsUpdateStatus === 'loading' || employeePrefsUpdateStatus === 'loading'}
              >
                {moment.tz.names().map(tzName => <option key={tzName} value={tzName}>{tzName}</option>)}
              </select>
            </div>
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
              <div className="time-picker-container">
                <input
                  type="time"
                  id={`time-${day}`}
                  className="settings-time-input"
                  value={dailyNotificationTimes[day.toLowerCase()] || ''}
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
              <div className="select-container">
                <select
                  id={`notify-${employee._id}`}
                  className="settings-select-input"
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