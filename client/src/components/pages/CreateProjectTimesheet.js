import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom'; // Use useParams to get IDs from URL
import { useSelector, useDispatch } from 'react-redux';
import { fetchClients, selectAllClients } from '../../redux/slices/clientSlice';
import { fetchEmployees, selectAllEmployees } from '../../redux/slices/employeeSlice';
import {
  fetchProjects,
  clearProjects,
  selectProjectStatus,
  selectProjectError,
  selectProjectItems
} from '../../redux/slices/projectSlice';
import {
    // Removed checkTimesheetExists as it might not be needed if editing is handled differently or not allowed here
    createTimesheet,
    fetchTimesheetById, // <-- Add this import (needs to be created in slice)
    updateTimesheet, // Keep update if editing project timesheets is allowed via this route
    // Removed check status/error/result selectors
    selectTimesheetCreateStatus,
    selectTimesheetCreateError,
    selectTimesheetUpdateStatus,
    selectTimesheetUpdateError,
    clearCreateStatus, clearUpdateStatus,
    selectCurrentTimesheet,
    selectCurrentTimesheetStatus,
} from '../../redux/slices/timesheetSlice';
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
import '../../styles/Forms.scss';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import { DateTime } from 'luxon';

// Constants for default values
const DEFAULT_LUNCH_DURATION = '00:30';
const DEFAULT_FORM_DATA = {
  employeeId: '',
  clientId: '', // Will be set from URL param
  projectId: '', // Will be set from URL param
  date: DateTime.now().toFormat('yyyy-MM-dd'),
  startTime: '',
  endTime: '',
  lunchBreak: 'No',
  lunchDuration: DEFAULT_LUNCH_DURATION,
  leaveType: 'None', // Leave type might be less relevant in project context? Decide based on requirements.
  description: '',
  hourlyWage: '',
  totalHours: 0,
  notes: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

const CreateProjectTimesheet = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // Get clientId and projectId from URL params
  const { clientId: clientIdFromUrl, projectId: projectIdFromUrl, timesheetId: timesheetIdForEdit } = useParams();
  const isEditing = Boolean(timesheetIdForEdit); // Determine edit mode based on timesheetId param

  // --- State ---
  const [formData, setFormData] = useState({
      ...DEFAULT_FORM_DATA,
      clientId: clientIdFromUrl || '',
      projectId: projectIdFromUrl || ''
  });
  const [error, setError] = useState(null);
  const [filteredProjects, setFilteredProjects] = useState([]); // Still needed if client can change? Or disable client field.
  // Local state for timesheetToEdit removed, use Redux state below

  // --- Redux Selectors ---
  const employees = useSelector(selectAllEmployees);
  const clients = useSelector(selectAllClients); // Keep clients if needed for display/validation
  const allProjects = useSelector(selectProjectItems);
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);
  const createStatus = useSelector(selectTimesheetCreateStatus);
  const createError = useSelector(selectTimesheetCreateError);
  const updateStatus = useSelector(selectTimesheetUpdateStatus);
  const updateError = useSelector(selectTimesheetUpdateError);
  // Use selectors for fetching single timesheet if editing
  const timesheetToEdit = useSelector(selectCurrentTimesheet); // Get the timesheet being edited from Redux
  const currentTimesheetStatus = useSelector(selectCurrentTimesheetStatus); // Get its fetch status

  const isLeaveSelected = formData.leaveType !== 'None';

  // --- Pure Calculation Function ---
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

  // --- Loading State ---
  const isLoading = useMemo(() =>
    createStatus === 'loading' ||
    updateStatus === 'loading' ||
    (isEditing && currentTimesheetStatus === 'loading'), // Check loading status for the specific timesheet
    [createStatus, updateStatus, isEditing, currentTimesheetStatus] // Add currentTimesheetStatus
  );

  // --- Effects ---
  // Show Alerts for Errors
  useEffect(() => {
    const reduxError = projectError || createError || updateError;
    if (reduxError) dispatch(setAlert(reduxError, 'danger'));
  }, [projectError, createError, updateError, dispatch]);

  // Fetch Initial Data (Employees, Specific Client/Project if needed)
  useEffect(() => {
    if (employees.length === 0) dispatch(fetchEmployees());
    // Fetch specific client/project details if needed for display, or rely on IDs
    // dispatch(fetchClientById(clientIdFromUrl)); // Example
    // dispatch(fetchProjectById(projectIdFromUrl)); // Example
    // Fetch timesheet data if editing
    if (isEditing && timesheetIdForEdit) {
        // Fetch the specific timesheet to edit
        // Fetch only if idle or if the wrong timesheet is currently loaded
        if (currentTimesheetStatus === 'idle' || timesheetToEdit?._id !== timesheetIdForEdit) {
             dispatch(fetchTimesheetById(timesheetIdForEdit)); // Assumes this thunk exists
        }
    }
  }, [dispatch, clientIdFromUrl, projectIdFromUrl, isEditing, timesheetIdForEdit, employees.length]);

  // Fetch projects for the specific client (if client dropdown is enabled)
  // If client/project are fixed, this might not be needed or simplified.
  useEffect(() => {
      if (formData.clientId && !isLeaveSelected) {
          dispatch(fetchProjects(formData.clientId));
      } else {
          dispatch(clearProjects());
      }
  }, [formData.clientId, isLeaveSelected, dispatch]);

  // Filter projects (if client dropdown enabled)
  useEffect(() => {
    if (formData.clientId && allProjects && allProjects.length > 0) {
      const clientProjects = allProjects.filter(p => (p.clientId?._id || p.clientId) === formData.clientId);
      setFilteredProjects(clientProjects);
      // Ensure the projectId from URL is still selected if client changes back
      if (!clientProjects.some(p => p._id === formData.projectId)) {
          // If the preselected project doesn't belong to the selected client, maybe clear it?
          // setFormData(prev => ({ ...prev, projectId: '' })); // Decide on this behavior
      }
    } else {
      setFilteredProjects([]);
    }
  }, [allProjects, formData.clientId, formData.projectId]);

  // Populate form for editing (requires timesheetToEdit state to be populated)
  useEffect(() => {
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
      const initialFormData = {
        // ... other fields ...
        timezone: entryTimezone,
        employeeId: timesheetToEdit.employeeId?._id || timesheetToEdit.employeeId || '',
        clientId: clientIdFromUrl, // Keep from URL param
        projectId: projectIdFromUrl, // Keep from URL param
        date: formattedDate,
        startTime: utcToLocalTimeInput(timesheetToEdit.startTime),
        // Find employee wage from the main employee list for reliability
        hourlyWage: employees.find(emp => emp._id === (timesheetToEdit.employeeId?._id || timesheetToEdit.employeeId))?.wage || '',
        endTime: utcToLocalTimeInput(timesheetToEdit.endTime),
        lunchBreak: timesheetToEdit.lunchBreak || 'No',
        lunchDuration: /^\d{2}:\d{2}$/.test(timesheetToEdit.lunchDuration) ? timesheetToEdit.lunchDuration : '00:30',
        leaveType: timesheetToEdit.leaveType || 'None',
        description: timesheetToEdit.description || '',
        hourlyWage: timesheetToEdit.employeeId?.wage || timesheetToEdit.hourlyWage || '',
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
        // Ensure client/project IDs from URL are set on initial load for create mode
        setFormData(prev => ({ ...prev, clientId: clientIdFromUrl || '', projectId: projectIdFromUrl || '' }));
    }
  }, [timesheetToEdit, currentTimesheetStatus, timesheetIdForEdit, calculateHoursPure, isEditing, clientIdFromUrl, projectIdFromUrl, dispatch, employees]); // Added employees dependency

  // Calculate hours effect
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

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        let updated = { ...prev, [name]: value };
        if (name === 'employeeId') {
            const selectedEmployee = employees.find((emp) => emp._id === value);
            updated.hourlyWage = selectedEmployee ? selectedEmployee.wage || '' : '';
        } else if (name === 'leaveType') {
            const isNowLeave = value !== 'None';
            if (isNowLeave) {
                updated = { ...updated, startTime: '', endTime: '', lunchBreak: 'No', lunchDuration: DEFAULT_LUNCH_DURATION, notes: '', totalHours: 0 };
            } else { updated.description = ''; }
        } else if (name === 'lunchBreak' && value === 'No') {
            updated.lunchDuration = '00:30';
        }
        // If client changes, reset project? Or disable client dropdown?
        // if (name === 'clientId') updated.projectId = ''; // Example: Reset project if client changes
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
        leaveType: formData.leaveType,
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

  // Find client and project names for display
  const clientName = useMemo(() => clients.find(c => c._id === clientIdFromUrl)?.name || 'Loading Client...', [clients, clientIdFromUrl]);
  const projectName = useMemo(() => allProjects.find(p => p._id === projectIdFromUrl)?.name || 'Loading Project...', [allProjects, projectIdFromUrl]);

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
            <Link to={`/clients/view/${clientIdFromUrl}`} className='breadcrumb-link'>{clientName}</Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to={`/clients/view/${clientIdFromUrl}/project/${projectIdFromUrl}`} className='breadcrumb-link'>{projectName}</Link> {/* Ensure this link is correct */}
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>{isEditing ? 'Edit Timesheet' : 'Create Timesheet'}</span>
          </div>
        </div>
      </div>

      <div className='form-container'>
        <form onSubmit={handleSubmit} className='employee-form' noValidate>

          {/* Display Client and Project Info (Readonly) */}
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
            <select id='employeeId' name='employeeId' value={formData.employeeId} onChange={handleChange} required disabled={isEditing || isLoading}>
              <option value=''>-- Select Employee --</option>
              {employees.map((emp) => (<option key={emp._id} value={emp._id}>{emp.name}</option>))}
            </select>
          </div>

          <div className='form-group'>
            <label htmlFor='date'><FontAwesomeIcon icon={faCalendarAlt} /> Date*</label>
            <input id='date' type='date' name='date' value={formData.date} onChange={handleChange} required disabled={isLoading} />
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
              {/* Client and Project dropdowns removed/disabled as they come from context */}

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
                <label htmlFor='notes'><FontAwesomeIcon icon={faStickyNote} /> Work Notes</label>
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