import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom'; // Use useParams to get IDs from URL
import { useSelector, useDispatch } from 'react-redux';
import { fetchClients, selectAllClients, selectClientStatus } from '../../redux/slices/clientSlice'; // Added selectClientStatus
import { fetchEmployees, selectAllEmployees,selectEmployeeStatus} from '../../redux/slices/employeeSlice';
import {
  fetchProjects,
  clearProjects,
  selectProjectStatus,
  selectProjectError,
  selectProjectItems
} from '../../redux/slices/projectSlice';
import {
   
    createTimesheet,
    fetchTimesheetById,
    updateTimesheet, 
 
    selectTimesheetCreateStatus,
    selectTimesheetCreateError,
    selectTimesheetUpdateStatus,
    selectTimesheetUpdateError,
    clearCreateStatus, clearUpdateStatus,
    selectCurrentTimesheet,
    selectCurrentTimesheetStatus 

} from '../../redux/slices/timesheetSlice';
import { selectAuthUser } from '../../redux/slices/authSlice'; // Import selectAuthUser from authSlice
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faSave,
  faTimes,
  faSpinner,
  faExclamationCircle,
  faClock,
  faBuilding, faUserTie, faProjectDiagram, faCalendarAlt, faSignOutAlt, faStickyNote, faDollarSign, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/Forms.scss'; // Ensure this path is correct
import { setAlert } from '../../redux/slices/alertSlice';
import { selectEmployerSettings, fetchEmployerSettings, selectSettingsStatus } from '../../redux/slices/settingsSlice'; // Import settings
import Alert from '../layout/Alert';
import { DateTime } from 'luxon';

// Constants for default values
const DEFAULT_FORM_DATA = {
  employeeId: '',
  clientId: '', // Will be set from URL param
  projectId: '', // Will be set from URL param
  date: DateTime.now().toFormat('yyyy-MM-dd'),
  startTime: '',
  endTime: '',
  lunchBreak: 'No',
  lunchDuration: '00:30', // Default lunch duration
  leaveType: 'None',
  description: '',
  hourlyWage: '',
  totalHours: 0,
  notes: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

const DEFAULT_LUNCH_DURATION = '00:00'; // Default duration value when lunch is not taken or for leave entries

const CreateProjectTimesheet = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // Get clientId and projectId from URL params
  const { clientId: clientIdFromUrl, projectId: projectIdFromUrl, timesheetId: timesheetIdForEdit } = useParams();
  const user = useSelector(selectAuthUser); // Get logged-in user
  const isEditing = Boolean(timesheetIdForEdit); // Determine edit mode based on timesheetId param

  // Local component state
  const [formData, setFormData] = useState({
      ...DEFAULT_FORM_DATA,
      clientId: clientIdFromUrl || '',
      projectId: projectIdFromUrl || ''
  });
  const [error, setError] = useState(null);
  const [filteredProjects, setFilteredProjects] = useState([]); // For project dropdown if client selection is enabled

  // Redux state selectors
  const employees = useSelector(selectAllEmployees); // For employee dropdown
  const employeeStatus = useSelector(selectEmployeeStatus); // For checking if employees are loaded
  const clients = useSelector(selectAllClients); // Used for displaying client name
  const clientStatus = useSelector(selectClientStatus); // Get client loading status
  const allProjects = useSelector(selectProjectItems); // Used for displaying project name and filtering
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);
  const createStatus = useSelector(selectTimesheetCreateStatus);
  const createError = useSelector(selectTimesheetCreateError);
  const updateStatus = useSelector(selectTimesheetUpdateStatus);
  const updateError = useSelector(selectTimesheetUpdateError);
  // Use selectors for fetching single timesheet if editing
  const timesheetToEdit = useSelector(selectCurrentTimesheet);
  const currentTimesheetStatus = useSelector(selectCurrentTimesheetStatus);
  // Settings
  const employerSettings = useSelector(selectEmployerSettings);
  const settingsStatus = useSelector(selectSettingsStatus);

  const isLeaveSelected = formData.leaveType !== 'None';

  // Find the Employee record for the logged-in user if their role is 'employee'
  const loggedInEmployeeRecord = useMemo(() => {
    if (user?.role === 'employee' && Array.isArray(employees) && user?._id) {
      return employees.find(emp => emp.userId === user._id);
    }
    return null;
  }, [employees, user]);

  // Pure function to calculate total hours, memoized for performance
  const calculateHoursPure = useCallback((currentFormData) => {
    const { startTime, endTime, lunchBreak, lunchDuration, leaveType } = currentFormData;
    const isLeave = leaveType !== 'None';
    const timeFormatRegex = /^\d{2}:\d{2}$/;
    if (isLeave || !startTime || !endTime || !timeFormatRegex.test(startTime) || !timeFormatRegex.test(endTime)) return 0;
    try {
      const baseDate = '1970-01-01';
      const startDateTime = DateTime.fromISO(`${baseDate}T${startTime}`, { zone: 'local' });
      const endDateTime = DateTime.fromISO(`${baseDate}T${endTime}`, { zone: 'local' });
      if (!startDateTime.isValid || !endDateTime.isValid || endDateTime <= startDateTime) return 0;
      let totalMinutes = endDateTime.diff(startDateTime, 'minutes').minutes;
      if (lunchBreak === 'Yes' && lunchDuration && timeFormatRegex.test(lunchDuration)) {
        const [lunchHours, lunchMinutes] = lunchDuration.split(':').map(Number);
        totalMinutes -= (lunchHours * 60) + lunchMinutes;
      }
      const totalHoursCalculated = totalMinutes > 0 ? totalMinutes / 60 : 0;
      return parseFloat(totalHoursCalculated.toFixed(2));
    } catch (e) { throw new Error(`Calculation Error: ${e.message}`); }
  }, []);

  // Derived loading state
  const isLoading = useMemo(() =>
    createStatus === 'loading' ||
    updateStatus === 'loading' ||
    (isEditing && currentTimesheetStatus === 'loading'),
    [createStatus, updateStatus, isEditing, currentTimesheetStatus]
  );

  // Effects
  // Displays errors from Redux state (project fetch, timesheet create/update) as alerts
  useEffect(() => { // Combined error handling
    const reduxError = projectError || createError || updateError || (isEditing && currentTimesheetStatus === 'failed' && !timesheetToEdit ? "Failed to load timesheet for editing." : null);
    if (reduxError) dispatch(setAlert(reduxError, 'danger'));
    // Cleanup function to clear errors when component unmounts or dependencies change
    return () => {
        if (reduxError) { dispatch(clearCreateStatus()); dispatch(clearUpdateStatus()); /* dispatch(clearProjectError()); */ } // Clear relevant errors
    };
  }, [projectError, createError, updateError, isEditing, currentTimesheetStatus, timesheetToEdit, dispatch]);

  // Fetch settings if not already loaded
  useEffect(() => {
    if (settingsStatus === 'idle') {
      dispatch(fetchEmployerSettings());
    }
  }, [dispatch, settingsStatus]);

  // Fetches initial data: employees, and the specific timesheet if in edit mode
  useEffect(() => {
    // Fetch employees if not already loaded or loading
    if (employeeStatus === 'idle' || (employeeStatus !== 'loading' && employees.length === 0)) {
        dispatch(fetchEmployees());
    }
    // Fetch clients if not already loaded or loading
    if (clientStatus === 'idle' || (clientStatus !== 'loading' && clients.length === 0)) {
        dispatch(fetchClients());
    }

    // Fetch timesheet data if editing
    if (isEditing && timesheetIdForEdit) {
        if (currentTimesheetStatus === 'idle' || timesheetToEdit?._id !== timesheetIdForEdit) {
             dispatch(fetchTimesheetById(timesheetIdForEdit)); // Assumes this thunk exists
        }
    } // No else needed here, form init for create mode is handled in another useEffect
  }, [dispatch, isEditing, timesheetIdForEdit, employeeStatus, employees.length, clientStatus, clients.length, currentTimesheetStatus, timesheetToEdit?._id]);

  // Fetches projects for the current client if client selection is dynamic and not a leave entry
  useEffect(() => { // This effect might be simplified if client/project are always fixed from URL
      if (formData.clientId && !isLeaveSelected) {
          dispatch(fetchProjects(formData.clientId));
      } else {
          dispatch(clearProjects());
      }
  }, [formData.clientId, isLeaveSelected, dispatch]);

  // Filters projects based on the selected client (if client selection is dynamic)
  useEffect(() => {
    if (formData.clientId && allProjects && allProjects.length > 0) {
      const clientProjects = allProjects.filter(p => (p.clientId?._id || p.clientId) === formData.clientId);
      setFilteredProjects(clientProjects);
      if (!clientProjects.some(p => p._id === formData.projectId)) {
          // If preselected project isn't for this client, consider clearing formData.projectId
      }
    } else {
      setFilteredProjects([]);
    }
  }, [allProjects, formData.clientId, formData.projectId]);

  // Populate form for editing (requires timesheetToEdit state to be populated)
  useEffect(() => { // Populates form fields when editing an existing timesheet
    // Populate form when editing and the correct timesheet has loaded successfully
    if (isEditing && currentTimesheetStatus === 'succeeded' && timesheetToEdit && timesheetToEdit._id === timesheetIdForEdit) {
      const entryTimezone = timesheetToEdit.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const utcToLocalTimeInput = (isoStr) => {
        if (!isoStr) return '';
        try { return DateTime.fromISO(isoStr, { zone: 'utc' }).setZone(entryTimezone).toFormat('HH:mm'); }
        catch (err) { return ''; }
      };
      let formattedDate = timesheetToEdit.date;
      if (formattedDate && !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
          try { formattedDate = DateTime.fromISO(formattedDate).toFormat('yyyy-MM-dd'); }
          catch { formattedDate = DateTime.now().toFormat('yyyy-MM-dd'); }
      }
      const employeeForWage = employees.find(emp => emp._id === (timesheetToEdit.employeeId?._id || timesheetToEdit.employeeId));

      const initialFormData = {
        timezone: entryTimezone,
        employeeId: timesheetToEdit.employeeId?._id || timesheetToEdit.employeeId || '',
        clientId: clientIdFromUrl, // Keep from URL param
        projectId: projectIdFromUrl, // Keep from URL param
        date: formattedDate,
        startTime: utcToLocalTimeInput(timesheetToEdit.startTime),
        hourlyWage: employees.find(emp => emp._id === (timesheetToEdit.employeeId?._id || timesheetToEdit.employeeId))?.wage || '',
        hourlyWage: employeeForWage?.wage || timesheetToEdit.hourlyWage || '',
        endTime: utcToLocalTimeInput(timesheetToEdit.endTime),
        lunchBreak: timesheetToEdit.lunchBreak || 'No',
        lunchDuration: /^\d{2}:\d{2}$/.test(timesheetToEdit.lunchDuration) ? timesheetToEdit.lunchDuration : '00:30',
        leaveType: timesheetToEdit.leaveType || 'None',
        description: timesheetToEdit.description || '',
        totalHours: timesheetToEdit.totalHours || 0,
        notes: timesheetToEdit.notes || '',
      };
      setFormData(initialFormData);
      try {
          const initialHours = calculateHoursPure(initialFormData);
          setFormData(prev => ({ ...prev, totalHours: initialHours }));
      } catch (calcError) {
          dispatch(setAlert(`Error calculating initial hours: ${calcError.message}`, 'warning'));
          setError(`Error calculating initial hours: ${calcError.message}`);
      }
    } else if (!isEditing) {
      // Create mode: Wait for settings and employee record (if applicable)
      if (settingsStatus === 'succeeded' && (user?.role !== 'employee' || (user?.role === 'employee' && loggedInEmployeeRecord))) {
        const defaultLunchBreakFromSettings = employerSettings?.timesheetIsLunchBreakDefault === true ? 'Yes' : 'No';
        let initialCreateData = {
          ...DEFAULT_FORM_DATA,
          lunchBreak: defaultLunchBreakFromSettings,
          lunchDuration: defaultLunchBreakFromSettings === 'Yes' ? (employerSettings?.timesheetDefaultLunchDuration || '00:30') : '00:30',
          clientId: clientIdFromUrl || '',
          projectId: projectIdFromUrl || '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        if (user?.role === 'employee' && loggedInEmployeeRecord) {
          initialCreateData.employeeId = loggedInEmployeeRecord._id;
          initialCreateData.hourlyWage = loggedInEmployeeRecord.wage || '';
        }
        setFormData(initialCreateData);
      }
    }
  }, [timesheetToEdit, currentTimesheetStatus, timesheetIdForEdit, calculateHoursPure, isEditing, clientIdFromUrl, projectIdFromUrl, dispatch, employees, user, loggedInEmployeeRecord, settingsStatus, employerSettings]);

  // Recalculates total hours whenever relevant time inputs or leave status change
  useEffect(() => {
      let calculatedHoursValue = 0;
      try {
          calculatedHoursValue = calculateHoursPure(formData);
          setFormData(prev => {
              const roundedPrev = parseFloat(prev.totalHours || 0).toFixed(2);
              const roundedCurrent = calculatedHoursValue.toFixed(2);
              if (roundedPrev !== roundedCurrent) return { ...prev, totalHours: calculatedHoursValue };
              return prev;
          });
          if (error) setError(null);
      } catch (calcError) {
          console.error("Calculation Error:", calcError.message);
      }
  }, [formData.startTime, formData.endTime, formData.lunchBreak, formData.lunchDuration, formData.leaveType, calculateHoursPure, dispatch, error]);

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        let updated = { ...prev, [name]: value };
        if (name === 'employeeId') {
            if (user?.role !== 'employee') { // Employees cannot change their pre-filled wage via this dropdown
                const selectedEmployee = employees.find((emp) => emp._id === value);
                updated.hourlyWage = selectedEmployee ? selectedEmployee.wage || '' : '';
            }
        } else if (name === 'leaveType') {
            const isNowLeave = value !== 'None';
            if (isNowLeave) {
                updated = { ...updated, startTime: '', endTime: '', lunchBreak: 'No', lunchDuration: '00:30', notes: '', totalHours: 0 };
            } else { updated.description = ''; }
        } else if (name === 'lunchBreak' && value === 'No') {
            updated.lunchDuration = '00:30';
        }
        return updated;
    });
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.employeeId) return 'Employee is required.';
    if (!formData.date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) return 'Date is required (YYYY-MM-DD).';
    if (!formData.clientId) return 'Client ID is missing.'; // Should be set from URL
    if (!formData.projectId) return 'Project ID is missing.'; // Should be set from URL

    if (isLeaveSelected) {
      if (!formData.description.trim()) return 'Leave Description is required.';
    } else {
      if (!formData.startTime) return 'Start Time is required.';
      if (!formData.endTime) return 'End Time is required.';
      if (!/^\d{2}:\d{2}$/.test(formData.startTime) || !/^\d{2}:\d{2}$/.test(formData.endTime)) return 'Invalid Time format (HH:MM).';
      try {
        const startDateTime = DateTime.fromISO(`1970-01-01T${formData.startTime}`, { zone: 'local' });
        const endDateTime = DateTime.fromISO(`1970-01-01T${formData.endTime}`, { zone: 'local' });
        if (!startDateTime.isValid || !endDateTime.isValid || endDateTime <= startDateTime) return 'End Time must be after Start Time.';
      } catch (e) { return 'Error validating time inputs.'; }
      if (formData.lunchBreak === 'Yes' && !/^\d{2}:\d{2}$/.test(formData.lunchDuration)) return 'Invalid Lunch Duration format (HH:MM).';
      if (parseFloat(formData.totalHours) > 16) return 'Total hours seem high (> 16). Please verify.';
      if (employerSettings?.timesheetAreNotesRequired && !formData.notes.trim()) return 'Work Notes are required.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearCreateStatus());
    dispatch(clearUpdateStatus());
    setError(null);

    let calculatedHoursValue = 0;
    try {
        calculatedHoursValue = calculateHoursPure(formData);
        if (!isLeaveSelected && calculatedHoursValue <= 0 && formData.startTime && formData.endTime) {
            throw new Error('Total Hours calculation resulted in zero or less.');
        }
    } catch (calcError) {
        setError(calcError.message);
        dispatch(setAlert(calcError.message, 'danger'));
        return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      dispatch(setAlert(validationError, 'warning'));
      return;
    }

    try {
      const localTimeToUtcISO = (timeStr) => {
        if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr) || !formData.date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) return null;
        let conversionTimezone = formData.timezone;
        if (!conversionTimezone || !DateTime.local().setZone(conversionTimezone).isValid) conversionTimezone = 'UTC';
        try {
          const localDT = DateTime.fromISO(`${formData.date}T${timeStr}`, { zone: conversionTimezone });
          if (!localDT.isValid) throw new Error(`Invalid local time parse: ${formData.date}T${timeStr}`);
          return localDT.toUTC().toISO();
        } catch (err) { throw new Error(`UTC Conversion Error: ${err.message}`); }
      };

      const startTimeUTC = !isLeaveSelected ? localTimeToUtcISO(formData.startTime) : null;
      const endTimeUTC = !isLeaveSelected ? localTimeToUtcISO(formData.endTime) : null;

      if (!isLeaveSelected && (!startTimeUTC || !endTimeUTC)) return; // Error handled by localTimeToUtcISO

      const timezoneToSend = formData.timezone && DateTime.local().setZone(formData.timezone).isValid
                             ? formData.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;

      const requestData = {
        employeeId: formData.employeeId,
        clientId: formData.clientId, // Already set from URL param
        projectId: formData.projectId, // Already set from URL param
        date: formData.date,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        lunchBreak: !isLeaveSelected ? formData.lunchBreak : 'No',
        lunchDuration: !isLeaveSelected && formData.lunchBreak === 'Yes' ? formData.lunchDuration : DEFAULT_LUNCH_DURATION,
        leaveType: formData.leaveType, // This was '00:30' before, corrected to formData.leaveType
        description: isLeaveSelected ? formData.description : "",
        notes: !isLeaveSelected ? formData.notes : "",
        hourlyWage: parseFloat(formData.hourlyWage) || 0,
        timezone: timezoneToSend,
      };

      if (isEditing) {
        await dispatch(updateTimesheet({ id: timesheetIdForEdit, timesheetData: requestData })).unwrap();
        dispatch(setAlert('Project Timesheet updated successfully!', 'success'));
      } else {
        await dispatch(createTimesheet(requestData)).unwrap();
        dispatch(setAlert('Project Timesheet created successfully!', 'success'));
      }

      // Always navigate back to the specific project view
      navigate(`/clients/view/${clientIdFromUrl}/project/${projectIdFromUrl}`);

    } catch (apiError) {
      const errorMessage = typeof apiError === 'string' ? apiError : (apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} timesheet.`);
      setError(errorMessage);
      dispatch(setAlert(errorMessage, 'danger'));
    }
  };

  const handleCancel = () => {
    // Always navigate back to the specific project view
    navigate(`/clients/view/${clientIdFromUrl}/project/${projectIdFromUrl}`);
  };

  const isProjectLoading = projectStatus === 'loading';

  // Memoized client and project names for display in header/breadcrumbs
  const clientName = useMemo(() => {
    if (clientStatus === 'loading' && !clients.find(c => c._id === clientIdFromUrl)) {
      return 'Loading Client...';
    }
    const client = clients.find(c => c._id === clientIdFromUrl);
    if (client) return client.name;
    if (clientStatus === 'succeeded' && !client) return 'Client Not Found';
    return 'Loading Client...'; // Default or if status is 'idle' and client not yet found
  }, [clients, clientIdFromUrl, clientStatus]);

  const projectName = useMemo(() => {
    if (projectStatus === 'loading' && !allProjects.find(p => p._id === projectIdFromUrl)) {
      return 'Loading Project...';
    }
    const project = allProjects.find(p => p._id === projectIdFromUrl);
    if (project) return project.name;
    if (projectStatus === 'succeeded' && !project) return 'Project Not Found';
    return 'Loading Project...'; // Default or if status is 'idle' and project not yet found
  }, [allProjects, projectIdFromUrl, projectStatus]);

  // Render
  return (
    <div className='vehicles-page'>
      <Alert />
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            {isEditing ? 'Edit' : 'Create'} Project Timesheet
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/clients' className='breadcrumb-link'>Clients</Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to={`/clients/view/${clientIdFromUrl}`} className='breadcrumb-link'>{clientName || 'View Client'}</Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to={`/clients/view/${clientIdFromUrl}/project/${projectIdFromUrl}`} className='breadcrumb-link'>{projectName}</Link> {/* Ensure this link is correct */}
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>{isEditing ? 'Edit Timesheet' : 'Create Timesheet'}</span>
          </div>
        </div>
      </div>

      <div className='form-container'>
        <form onSubmit={handleSubmit} className='employee-form' noValidate>
          {/* Display Client and Project Info (Readonly as they are from URL params) */}
          <div className='form-group readonly-info'>
              <label><FontAwesomeIcon icon={faBuilding} /> Client</label>
              <input type="text" value={clientName} readOnly disabled />
          </div>
          <div className='form-group readonly-info'>
              <label><FontAwesomeIcon icon={faProjectDiagram} /> Project</label>
              <input type="text" value={projectName} readOnly disabled />
          </div>

          <div className='form-group'>
            <label htmlFor='employeeId'><FontAwesomeIcon icon={faUserTie} /> Employee*</label>
            <select
              id='employeeId'
              name='employeeId'
              value={formData.employeeId}
              onChange={handleChange}
              required
              disabled={isEditing || isLoading || user?.role === 'employee'} // Disable for employees
            >
              <option value=''>-- Select Employee --</option>
              {employees.map((emp) => (<option key={emp._id} value={emp._id}>{emp.name}</option>))}
            </select>
          </div>

          <div className='form-group'>
            <label htmlFor='date'><FontAwesomeIcon icon={faCalendarAlt} /> Date*</label>
            <input id='date' type='date' name='date' value={formData.date} onChange={handleChange} required disabled={isLoading || isEditing} />
          </div>

          <div className='form-group'>
            <label htmlFor='leaveType'><FontAwesomeIcon icon={faSignOutAlt} /> Leave Type</label>
            <select id='leaveType' name='leaveType' value={formData.leaveType} onChange={handleChange} disabled={isLoading}>
              <option value='None'>None (Work Entry)</option>
              <option value='Annual'>Annual Leave</option>
              <option value='Sick'>Sick Leave</option>
              <option value='Public Holiday'>Public Holiday</option>
              <option value='Paid'>Other Paid Leave</option>
              <option value='Unpaid'>Unpaid Leave</option>
            </select>
          </div>

          {isLeaveSelected && (
            <div className='form-group'>
              <label htmlFor='description'><FontAwesomeIcon icon={faInfoCircle} /> Leave Description*</label>
              <textarea id='description' name='description' value={formData.description} onChange={handleChange} placeholder='Provide reason for leave' required={isLeaveSelected} disabled={isLoading} rows='3' />
            </div>
          )}

          {!isLeaveSelected && (
            <>
              <div className='form-group'>
                <label htmlFor='startTime'><FontAwesomeIcon icon={faClock} /> Start Time*</label>
                <input id='startTime' type='time' name='startTime' value={formData.startTime} onChange={handleChange} step='60' required={!isLeaveSelected} disabled={isLoading} />
              </div>

              <div className='form-group'>
                <label htmlFor='endTime'><FontAwesomeIcon icon={faClock} /> End Time*</label>
                <input id='endTime' type='time' name='endTime' value={formData.endTime} onChange={handleChange} step='60' required={!isLeaveSelected} disabled={isLoading} />
              </div>

              <div className='form-group'>
                <label htmlFor='lunchBreak'>Lunch Break</label>
                <select id='lunchBreak' name='lunchBreak' value={formData.lunchBreak} onChange={handleChange} disabled={isLoading}>
                  <option value='No'>No</option>
                  <option value='Yes'>Yes</option>
                </select>
              </div>

              {formData.lunchBreak === 'Yes' && (
                <div className='form-group'>
                  <label htmlFor='lunchDuration'>Lunch Duration</label>
                  <select id='lunchDuration' name='lunchDuration' value={formData.lunchDuration} onChange={handleChange} required={formData.lunchBreak === 'Yes'} disabled={isLoading}>
                    <option value='00:15'>00:15</option>
                    <option value='00:30'>00:30</option>
                    <option value='00:45'>00:45</option>
                    <option value='01:00'>01:00</option>
                    <option value='01:30'>01:30</option>
                    <option value='02:00'>02:00</option>
                  </select>
                </div>
              )}

              <div className='form-group'>
                <label htmlFor='notes'>
                  <FontAwesomeIcon icon={faStickyNote} /> Work Notes
                  {!isLeaveSelected && employerSettings?.timesheetAreNotesRequired && '*'}
                </label>
                <textarea id='notes' name='notes' value={formData.notes} onChange={handleChange} placeholder='Add any work-related notes' disabled={isLoading} rows='3' />
              </div>
            </>
          )}

          <div className='form-group'>
            <label><FontAwesomeIcon icon={faDollarSign} /> Hourly Wage (Read-only)</label>
            <input type='text' value={formData.hourlyWage ? `$${parseFloat(formData.hourlyWage).toFixed(2)}` : 'N/A'} readOnly disabled />
          </div>

          {!isLeaveSelected && (
             <div className='form-group summary'>
                <strong>Total Hours Calculated:</strong> {formData.totalHours.toFixed(2)} hours
             </div>
          )}

          <div className='form-footer'>
            <button type='button' className='btn btn-danger' onClick={handleCancel} disabled={isLoading}>
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button type='submit' className='btn btn-success' disabled={isLoading || (projectStatus === 'loading' && !isLeaveSelected)}>
              {isLoading ? (<><FontAwesomeIcon icon={faSpinner} spin /> Saving...</>) : (<><FontAwesomeIcon icon={isEditing ? faPen : faSave} /> {isEditing ? 'Update Timesheet' : 'Save Timesheet'}</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectTimesheet;