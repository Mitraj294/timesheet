// /home/digilab/timesheet/client/src/components/setting/TimesheetSettingsSection.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; 
import { faSave, faSpinner, faCalendarWeek, faUtensils, faEyeSlash, faEdit, faListAlt, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { // Keep faUserPlus for the new setting
  updateEmployerSettings,
  selectEmployerSettings,
  selectSettingsStatus,
} from '../../redux/slices/settingsSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import { faProjectDiagram, faStickyNote } from '@fortawesome/free-solid-svg-icons'; // Added new icons
import '../../styles/TabletViewSettings.scss'; // Re-use similar styling
import Select from 'react-select'; // Import react-select for multi-select

const TimesheetSettingsSection = () => {
  const dispatch = useDispatch();
  const currentSettings = useSelector(selectEmployerSettings);
  const settingsStatus = useSelector(selectSettingsStatus);

  const [formData, setFormData] = useState({
    timesheetStartDayOfWeek: 'Monday',
    timesheetIsLunchBreakDefault: true,
    timesheetHideWage: false, // New setting
    timesheetAllowOldEdits: false,
    defaultTimesheetViewType: 'Weekly',
    timesheetIsProjectClientRequired: false, // Default to No (false)
    timesheetAreNotesRequired: false,       // Default to No (false)
    employeeCanCreateProject: false, // New setting, default to false
    reportColumns: [], // New setting for report columns
    weeklyReportEmail: '', // New setting for weekly report email
  });

  const isSaving = settingsStatus === 'loading';

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        timesheetStartDayOfWeek: currentSettings.timesheetStartDayOfWeek || 'Monday',
        timesheetIsLunchBreakDefault: currentSettings.timesheetIsLunchBreakDefault === true, // Ensure boolean
        timesheetHideWage: currentSettings.timesheetHideWage === true, // Ensure boolean
        timesheetAllowOldEdits: currentSettings.timesheetAllowOldEdits === true, // Ensure boolean
        defaultTimesheetViewType: currentSettings.defaultTimesheetViewType || 'Weekly',
        timesheetIsProjectClientRequired: currentSettings.timesheetIsProjectClientRequired === true,
        timesheetAreNotesRequired: currentSettings.timesheetAreNotesRequired === true,
        employeeCanCreateProject: currentSettings.employeeCanCreateProject === true, // Ensure boolean
        reportColumns: currentSettings.reportColumns || [], // Initialize with current settings or empty array
        weeklyReportEmail: currentSettings.weeklyReportEmail || '', // Initialize with current or empty
      });
    }
  }, [currentSettings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleMultiSelectChange = (selectedOptions) => {
    setFormData((prev) => ({
      ...prev,
      reportColumns: selectedOptions ? selectedOptions.map(option => option.value) : [],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // No need to set isSaving locally, settingsStatus from Redux handles it
    try {
      await dispatch(updateEmployerSettings(formData)).unwrap();
      dispatch(setAlert('Timesheet settings updated successfully!', 'success'));
    } catch (error) {
      // Error alert is handled by the thunk or a global error handler
      console.error('Failed to update timesheet settings:', error);
      // The thunk already dispatches an error alert.
    }
  };

  const dayOptions = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const viewTypeOptions = ['Daily', 'Weekly', 'Fortnightly', 'Monthly'];
  const booleanOptions = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ];
  const reportColumnOptions = [
    { value: 'employee', label: 'Employee Name' },
    { value: 'date', label: 'Date' },
    { value: 'day', label: 'Day of Week' },
    { value: 'client', label: 'Client Name' },
    { value: 'project', label: 'Project Name' },
    { value: 'startTime', label: 'Start Time' },
    { value: 'endTime', label: 'End Time' },
    { value: 'lunchDuration', label: 'Lunch Duration' },
    { value: 'leaveType', label: 'Leave Type' },
    { value: 'description', label: 'Leave Description' },
    { value: 'notes', label: 'Work Notes' },
    { value: 'hourlyWage', label: 'Hourly Wage' },
    { value: 'totalHours', label: 'Total Hours' },
  ];


  if (settingsStatus === 'loading' && !Object.keys(currentSettings || {}).length) {
    return (
      <div className="settings-placeholder-content" style={{ textAlign: 'center', padding: '20px' }}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading timesheet settings...</p>
      </div>
    );
  }

  return (
    <div className="tablet-view-settings-card"> {/* Re-use class for consistent card styling */}
      <div>
        <h3 className="tablet-view-title">Timesheet Settings</h3> {/* Re-use class */}
        <form onSubmit={handleSubmit}>
          {/* Timesheet Start Day of Week */}
          <div className="tablet-view-input select-input">
            <p className="select-slim-label"><FontAwesomeIcon icon={faCalendarWeek} /> Start Day of Week</p>
            <select name="timesheetStartDayOfWeek" value={formData.timesheetStartDayOfWeek} onChange={handleChange} disabled={isSaving}>
              {dayOptions.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>

          {/* Default Timesheet View Type */}
          <div className="tablet-view-input select-input">
            <p className="select-slim-label"><FontAwesomeIcon icon={faListAlt} /> Default Timesheet View</p>
            <select name="defaultTimesheetViewType" value={formData.defaultTimesheetViewType} onChange={handleChange} disabled={isSaving}>
              {viewTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          {/* Lunch Break Default */}
          <div className="tablet-view-input select-input">
            <p className="select-slim-label"><FontAwesomeIcon icon={faUtensils} /> Lunch Break Default </p>
            <select name="timesheetIsLunchBreakDefault" value={String(formData.timesheetIsLunchBreakDefault)} onChange={handleChange} disabled={isSaving}>
              {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Hide Wage */}
          <div className="tablet-view-input select-input">
            <p className="select-slim-label"><FontAwesomeIcon icon={faEyeSlash} /> Hide Wage (for Employees)</p>
            <select name="timesheetHideWage" value={String(formData.timesheetHideWage)} onChange={handleChange} disabled={isSaving}>
              {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Project/Client Needed */}
          <div className="tablet-view-input select-input">
            <p className="select-slim-label"><FontAwesomeIcon icon={faProjectDiagram} /> Project/Client Needed </p>
            <select name="timesheetIsProjectClientRequired" value={String(formData.timesheetIsProjectClientRequired)} onChange={handleChange} disabled={isSaving}>
              {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Notes Needed */}
          <div className="tablet-view-input select-input">
            <p className="select-slim-label"><FontAwesomeIcon icon={faStickyNote} /> Notes Needed </p>
            <select name="timesheetAreNotesRequired" value={String(formData.timesheetAreNotesRequired)} onChange={handleChange} disabled={isSaving}>
              {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Allow Editing Old Timesheets */}
          <div className="tablet-view-input select-input">
            <p className="select-slim-label"><FontAwesomeIcon icon={faEdit} /> Allow Employees to Edit Old Timesheets</p>
            <select name="timesheetAllowOldEdits" value={String(formData.timesheetAllowOldEdits)} onChange={handleChange} disabled={isSaving}>
              {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Employee Can Create Project */}
          <div className="tablet-view-input select-input">
            <p className="select-slim-label"><FontAwesomeIcon icon={faProjectDiagram} /> Allow Employees to Create Projects</p>
            <select name="employeeCanCreateProject" value={String(formData.employeeCanCreateProject)} onChange={handleChange} disabled={isSaving}>
              {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
{/* Weekly Report Email */}
          <div className="tablet-view-input"> {/* Removed select-input, just use tablet-view-input */}
            <p className="select-slim-label"><FontAwesomeIcon icon={faEnvelope} /> Weekly Report Email</p>
            <input
              type="email"
              name="weeklyReportEmail"
              value={formData.weeklyReportEmail}
              onChange={handleChange}
              disabled={isSaving}
              placeholder="Enter email for weekly report" // Changed placeholder slightly for consistency
              className="tablet-view-input-field" // Add a new class for styling the input element directly
            />
            <small>An email address that will receive a weekly timesheet summary report.</small>
          </div>

          {/* Report Columns Selection */}
          <div className="tablet-view-input select-input">
            <p className="select-slim-label"><FontAwesomeIcon icon={faListAlt} /> Report Columns (Timesheet)</p>
            <Select
              isMulti
              name="reportColumns"
              options={reportColumnOptions}
              className="react-select-container"
              classNamePrefix="react-select"
              value={reportColumnOptions.filter(option => formData.reportColumns.includes(option.value))}
              onChange={handleMultiSelectChange}
              isDisabled={isSaving}
            />
            <small>If no columns are selected, all standard columns will be included in reports.</small>
          </div>

          

          <div className="tablet-view-button-group">
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
              <span className="button-text">{isSaving ? 'Updating...' : 'Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimesheetSettingsSection;