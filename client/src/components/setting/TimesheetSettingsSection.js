// /home/digilab/timesheet/client/src/components/setting/TimesheetSettingsSection.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave, faSpinner, faCalendarWeek, faUtensils, faEyeSlash, faEdit, faListAlt, faEnvelope,
  faProjectDiagram, faStickyNote
} from '@fortawesome/free-solid-svg-icons';
import {
  updateEmployerSettings,
  selectEmployerSettings,
  selectSettingsStatus,
} from '../../redux/slices/settingsSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import '../../styles/TabletViewSettings.scss';
import Select from 'react-select';

const TimesheetSettingsSection = () => {
  const dispatch = useDispatch();
  const currentSettings = useSelector(selectEmployerSettings);
  const settingsStatus = useSelector(selectSettingsStatus);

  const [formData, setFormData] = useState({
    timesheetStartDayOfWeek: 'Monday',
    timesheetIsLunchBreakDefault: true,
    timesheetHideWage: false,
    timesheetAllowOldEdits: false,
    defaultTimesheetViewType: 'Weekly',
    timesheetIsProjectClientRequired: false,
    timesheetAreNotesRequired: false,
    employeeCanCreateProject: false,
    reportColumns: [],
    weeklyReportEmail: '',
  });

  const isSaving = settingsStatus === 'loading';

  // Load settings from backend
  useEffect(() => {
    if (currentSettings) {
      setFormData({
        timesheetStartDayOfWeek: currentSettings.timesheetStartDayOfWeek || 'Monday',
        timesheetIsLunchBreakDefault: currentSettings.timesheetIsLunchBreakDefault === true,
        timesheetHideWage: currentSettings.timesheetHideWage === true,
        timesheetAllowOldEdits: currentSettings.timesheetAllowOldEdits === true,
        defaultTimesheetViewType: currentSettings.defaultTimesheetViewType || 'Weekly',
        timesheetIsProjectClientRequired: currentSettings.timesheetIsProjectClientRequired === true,
        timesheetAreNotesRequired: currentSettings.timesheetAreNotesRequired === true,
        employeeCanCreateProject: currentSettings.employeeCanCreateProject === true,
        reportColumns: currentSettings.reportColumns || [],
        weeklyReportEmail: currentSettings.weeklyReportEmail || '',
      });
    }
  }, [currentSettings]);

  useEffect(() => {
    console.log("[TimesheetSettingsSection] Component mounted");
    return () => {
      console.log("[TimesheetSettingsSection] Component unmounted");
    };
  }, []);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    console.log(`[TimesheetSettingsSection] Changed ${name}:`, type === 'checkbox' ? checked : value);
  };

  // Handle multi-select for report columns
  const handleMultiSelectChange = (selectedOptions) => {
    setFormData(prev => ({
      ...prev,
      reportColumns: selectedOptions ? selectedOptions.map(option => option.value) : [],
    }));
    console.log("[TimesheetSettingsSection] Changed reportColumns:", selectedOptions ? selectedOptions.map(option => option.value) : []);
  };

  // Save settings
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[TimesheetSettingsSection] Submitting timesheet settings:", formData);
    try {
      await dispatch(updateEmployerSettings(formData)).unwrap();
      dispatch(setAlert('Timesheet settings updated successfully!', 'success'));
    } catch (error) {
      // Error handled by alert system
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
    <div className="tablet-view-settings-card">
      <h3 className="tablet-view-title">Timesheet Settings</h3>
      <form onSubmit={handleSubmit}>
        <div className="tablet-view-input select-input">
          <p className="select-slim-label"><FontAwesomeIcon icon={faCalendarWeek} /> Start Day of Week</p>
          <select name="timesheetStartDayOfWeek" value={formData.timesheetStartDayOfWeek} onChange={handleChange} disabled={isSaving}>
            {dayOptions.map(day => <option key={day} value={day}>{day}</option>)}
          </select>
        </div>
        <div className="tablet-view-input select-input">
          <p className="select-slim-label"><FontAwesomeIcon icon={faListAlt} /> Default Timesheet View</p>
          <select name="defaultTimesheetViewType" value={formData.defaultTimesheetViewType} onChange={handleChange} disabled={isSaving}>
            {viewTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="tablet-view-input select-input">
          <p className="select-slim-label"><FontAwesomeIcon icon={faUtensils} /> Lunch Break Default</p>
          <select name="timesheetIsLunchBreakDefault" value={String(formData.timesheetIsLunchBreakDefault)} onChange={handleChange} disabled={isSaving}>
            {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="tablet-view-input select-input">
          <p className="select-slim-label"><FontAwesomeIcon icon={faEyeSlash} /> Hide Wage (for Employees)</p>
          <select name="timesheetHideWage" value={String(formData.timesheetHideWage)} onChange={handleChange} disabled={isSaving}>
            {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="tablet-view-input select-input">
          <p className="select-slim-label"><FontAwesomeIcon icon={faProjectDiagram} /> Project/Client Needed</p>
          <select name="timesheetIsProjectClientRequired" value={String(formData.timesheetIsProjectClientRequired)} onChange={handleChange} disabled={isSaving}>
            {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="tablet-view-input select-input">
          <p className="select-slim-label"><FontAwesomeIcon icon={faStickyNote} /> Notes Needed</p>
          <select name="timesheetAreNotesRequired" value={String(formData.timesheetAreNotesRequired)} onChange={handleChange} disabled={isSaving}>
            {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="tablet-view-input select-input">
          <p className="select-slim-label"><FontAwesomeIcon icon={faEdit} /> Allow Employees to Edit Old Timesheets</p>
          <select name="timesheetAllowOldEdits" value={String(formData.timesheetAllowOldEdits)} onChange={handleChange} disabled={isSaving}>
            {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="tablet-view-input select-input">
          <p className="select-slim-label"><FontAwesomeIcon icon={faProjectDiagram} /> Allow Employees to Create Projects</p>
          <select name="employeeCanCreateProject" value={String(formData.employeeCanCreateProject)} onChange={handleChange} disabled={isSaving}>
            {booleanOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="tablet-view-input">
          <p className="select-slim-label"><FontAwesomeIcon icon={faEnvelope} /> Weekly Report Email</p>
          <input
            type="email"
            name="weeklyReportEmail"
            value={formData.weeklyReportEmail}
            onChange={handleChange}
            disabled={isSaving}
            placeholder="Enter email for weekly report"
            className="tablet-view-input-field"
          />
          <small>An email address that will receive a weekly timesheet summary report.</small>
        </div>
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
  );
};

export default TimesheetSettingsSection;