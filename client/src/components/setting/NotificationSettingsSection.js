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
  const employerSettingsUpdateStatus = useSelector(selectSettingsStatus);
  const currentEmployerSettings = useSelector(selectEmployerSettings);
  const employeePrefsUpdateStatus = useSelector(selectEmployeeNotificationUpdateStatus);

  const [dailyNotificationTimes, setDailyNotificationTimes] = useState({});
  const [employeeNotificationEnabled, setEmployeeNotificationEnabled] = useState({});
  const [actionNotificationEmail, setActionNotificationEmail] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState(moment.tz.guess() || 'UTC');

  // Fetch employees if needed
  useEffect(() => {
    if (employeeStatus === 'idle') dispatch(fetchEmployees());
  }, [employeeStatus, dispatch]);

  // Load settings from backend
  useEffect(() => {
    if (currentEmployerSettings) {
      const employerTimezone = currentEmployerSettings.timezone || selectedTimezone;
      setSelectedTimezone(employerTimezone);
      const initialDailyTimes = {};
      daysOfWeek.forEach(day => {
        const dayKey = day.toLowerCase();
        const utcDateString = currentEmployerSettings.globalNotificationTimes?.[dayKey];
        initialDailyTimes[dayKey] = utcDateString
          ? moment(utcDateString).tz(employerTimezone).format('HH:mm')
          : '';
      });
      setDailyNotificationTimes(initialDailyTimes);
      setActionNotificationEmail(currentEmployerSettings.actionNotificationEmail || '');
    }
  }, [currentEmployerSettings, selectedTimezone]);

  // Load per-employee notification preferences
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

  // Handlers for form fields
  const handleActionEmailChange = (e) => {
    setActionNotificationEmail(e.target.value);
  };
  const handleDailyTimeChange = (day, time) => {
    setDailyNotificationTimes(prev => ({
      ...prev, [day.toLowerCase()]: time,
    }));
  };
  const handleTimezoneChange = (e) => {
    setSelectedTimezone(e.target.value);
  };
  const handleEmployeeToggleChange = (employeeId, value) => {
    setEmployeeNotificationEnabled(prev => ({
      ...prev, [employeeId]: value === 'true',
    }));
  };

  // Save settings
  const handleSubmit = async (e) => {
    e.preventDefault();
    const employerNotificationSettingsToSave = {
      globalNotificationTimes: dailyNotificationTimes,
      actionNotificationEmail: actionNotificationEmail,
      timezone: selectedTimezone,
    };
    const employeeNotificationPreferencesToSave = Object.keys(employeeNotificationEnabled).map(empId => ({
      employeeId: empId,
      receivesNotifications: employeeNotificationEnabled[empId]
    }));
    try {
      await dispatch(updateEmployerSettings(employerNotificationSettingsToSave)).unwrap();
      if (employeeNotificationPreferencesToSave.length > 0) {
        await dispatch(updateEmployeesNotificationPreferences(employeeNotificationPreferencesToSave)).unwrap();
      }
    } catch (error) {
      // Error handled by alert system
    }
  };

  if (employeeStatus === 'loading' && !employees.length) {
    return (
      <div className="settings-placeholder-content" style={{ textAlign: 'center', padding: '20px' }}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="notification-settings-card">
      <h3 className="notification-settings-title">Notification Preferences</h3>
      <form onSubmit={handleSubmit}>
        {/* Action Notification Email */}
        <div className="settings-section">
          <h4 className="section-subtitle">Action Notification Email</h4>
          <p className="section-description">
            Set the email address for timesheet notifications.
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
        {/* Timezone */}
        <div className="settings-section">
          <h4 className="section-subtitle">Timezone</h4>
          <p className="section-description">
            Select your timezone for correct notification times.
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
        {/* Daily Notification Times */}
        <div className="settings-section">
          <h4 className="section-subtitle">Daily Notification Time</h4>
          <p className="section-description">
            Set the time for daily notifications. Leave blank for instant notifications.
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
        {/* Per-Employee Notification Toggle */}
        <div className="settings-section">
          <h4 className="section-subtitle">Employee Specific Notifications</h4>
          <p className="section-description">Enable or disable notifications for each employee.</p>
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
            {(employerSettingsUpdateStatus === 'loading' || employeePrefsUpdateStatus === 'loading')
              ? <FontAwesomeIcon icon={faSpinner} spin />
              : <FontAwesomeIcon icon={faSave} />}
            <span className="button-text">
              {(employerSettingsUpdateStatus === 'loading' || employeePrefsUpdateStatus === 'loading')
                ? 'Updating...' : 'Update'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationSettingsSection;