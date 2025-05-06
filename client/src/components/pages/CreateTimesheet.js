import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom'; // Added useParams
import { useSelector, useDispatch } from 'react-redux';
import { fetchClients, selectAllClients } from '../../redux/slices/clientSlice';
import { fetchEmployees, selectAllEmployees } from '../../redux/slices/employeeSlice';
import {
  fetchProjects,
  clearProjects,
  selectProjectStatus,
  selectProjectError,
  selectProjectItems,
} from '../../redux/slices/projectSlice';
import {
    checkTimesheetExists,
    createTimesheet,
    updateTimesheet,
    fetchTimesheetById, // Added for fetching timesheet to edit
    selectTimesheetCheckStatus,
    selectTimesheetCheckResult,
    selectTimesheetCheckError,
    selectTimesheetCreateStatus,
    selectTimesheetCreateError,
    selectTimesheetUpdateStatus,
    selectTimesheetUpdateError,
    selectCurrentTimesheet, // Added for editing
    selectCurrentTimesheetStatus, // Added for editing
    clearCheckStatus, clearCreateStatus, clearUpdateStatus
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

// Default values for the form
const DEFAULT_FORM_DATA = {
  employeeId: '',
  clientId: '',
  projectId: '',
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

const CreateTimesheet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { clientId: clientIdFromUrl, projectId: projectIdFromUrl, timesheetId: timesheetIdForEdit } = useParams();

  // Determine if we are editing an existing timesheet or creating a new one
  const isEditing = Boolean(timesheetIdForEdit);
  const navigationState = location.state || {}; // Data passed via navigate state (e.g., from ProjectTimesheet page)
  const { clientId: preselectedClientId, projectId: preselectedProjectId, source } = navigationState;

  // Local component state
  const [formData, setFormData] = useState({
    ...DEFAULT_FORM_DATA,
    clientId: clientIdFromUrl || preselectedClientId || '', // Prioritize URL param, then navigation state
    projectId: projectIdFromUrl || preselectedProjectId || ''
  });
  const [error, setError] = useState(null); // For local form validation or calculation errors
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Redux state selectors
  const employees = useSelector(selectAllEmployees);
  const clients = useSelector(selectAllClients);
  const allProjects = useSelector(selectProjectItems);
  const projectStatus = useSelector(selectProjectStatus); // Status for fetching projects
  const projectError = useSelector(selectProjectError);   // Error from fetching projects

  const checkStatus = useSelector(selectTimesheetCheckStatus);     // Status for checking if timesheet exists
  const checkError = useSelector(selectTimesheetCheckError);       // Error from checking timesheet
  const createStatus = useSelector(selectTimesheetCreateStatus);   // Status for creating timesheet
  const createError = useSelector(selectTimesheetCreateError);     // Error from creating timesheet
  const updateStatus = useSelector(selectTimesheetUpdateStatus);   // Status for updating timesheet
  const updateError = useSelector(selectTimesheetUpdateError);     // Error from updating timesheet
  const timesheetToEdit = useSelector(selectCurrentTimesheet);     // Data of the timesheet being edited
  const currentTimesheetStatus = useSelector(selectCurrentTimesheetStatus); // Fetch status for timesheetToEdit

  const isLeaveSelected = formData.leaveType !== 'None';

  // Pure function to calculate total hours, memoized for performance
  const calculateHoursPure = useCallback((currentFormData) => {
    const { startTime, endTime, lunchBreak, lunchDuration, leaveType } = currentFormData;
    const isLeave = leaveType !== 'None';
    const timeFormatRegex = /^\d{2}:\d{2}$/;

    if (isLeave || !startTime || !endTime || !timeFormatRegex.test(startTime) || !timeFormatRegex.test(endTime)) {
      return 0; // Not applicable or invalid time format
    }

    try {
      const baseDate = '1970-01-01'; // Use a fixed date for time calculations
      const startDateTime = DateTime.fromISO(`${baseDate}T${startTime}`, { zone: 'local' });
      const endDateTime = DateTime.fromISO(`${baseDate}T${endTime}`, { zone: 'local' });

      if (!startDateTime.isValid || !endDateTime.isValid || endDateTime <= startDateTime) {
        return 0; // Invalid times or end time is not after start time
      }

      let totalMinutes = endDateTime.diff(startDateTime, 'minutes').minutes;

      if (lunchBreak === 'Yes' && lunchDuration && timeFormatRegex.test(lunchDuration)) {
        const [lunchHours, lunchMinutes] = lunchDuration.split(':').map(Number);
        const lunchDurationInMinutes = (lunchHours * 60) + lunchMinutes;
        totalMinutes -= lunchDurationInMinutes;
      } else if (lunchBreak === 'Yes' && (!lunchDuration || !timeFormatRegex.test(lunchDuration))) {
        throw new Error("Invalid Lunch Duration format. Please use HH:MM.");
      }

      const totalHoursCalculated = totalMinutes > 0 ? totalMinutes / 60 : 0;
      return parseFloat(totalHoursCalculated.toFixed(2)); // Round to 2 decimal places
    } catch (e) {
      throw new Error(`Calculation Error: ${e.message}`);
    }
  }, []);

  // Derived loading state for UI feedback
  const isLoading = useMemo(() =>
    checkStatus === 'loading' ||
    createStatus === 'loading' ||
    updateStatus === 'loading' ||
    (isEditing && currentTimesheetStatus === 'loading'), // Also consider loading if fetching the timesheet to edit
    [checkStatus, createStatus, updateStatus, isEditing, currentTimesheetStatus]
  );

  // Effects

  // Displays errors from Redux state as alerts
  useEffect(() => {
    const reduxError = projectError || checkError || createError || updateError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [projectError, checkError, createError, updateError, dispatch]);

  // Fetches initial data: employees, clients, and the specific timesheet if in edit mode
  useEffect(() => {
    if (employees.length === 0) dispatch(fetchEmployees());
    if (clients.length === 0) dispatch(fetchClients()); // Fetch clients if not already loaded

    if (isEditing && timesheetIdForEdit) {
      // Fetch the specific timesheet to edit only if it's not already loaded or is different
      if (currentTimesheetStatus === 'idle' || timesheetToEdit?._id !== timesheetIdForEdit) {
         dispatch(fetchTimesheetById(timesheetIdForEdit));
      }
    }
  }, [dispatch, isEditing, timesheetIdForEdit, employees.length, clients.length, currentTimesheetStatus, timesheetToEdit]);

  // Fetches projects when client selection changes (and not a leave entry)
  useEffect(() => {
    if (formData.clientId && !isLeaveSelected) {
      dispatch(fetchProjects(formData.clientId));
    } else if (!isLeaveSelected) { // If not a leave entry and no client selected, clear projects
      dispatch(clearProjects());
      setFilteredProjects([]); // Also clear local filtered projects
    }
    // If client changes and it wasn't a preselection from URL/navigation, reset project
    if (formData.clientId !== (clientIdFromUrl || preselectedClientId)) {
        setFormData(prev => ({ ...prev, projectId: '' }));
    }
  }, [formData.clientId, isLeaveSelected, dispatch, clientIdFromUrl, preselectedClientId]);

  // Filters projects based on the selected client
  useEffect(() => {
    if (formData.clientId && allProjects && allProjects.length > 0) {
      const clientProjects = allProjects.filter(p => (p.clientId?._id || p.clientId) === formData.clientId);
      setFilteredProjects(clientProjects);
    } else {
      setFilteredProjects([]);
    }
  }, [allProjects, formData.clientId]);

  // Populates form data when editing an existing timesheet
  useEffect(() => {
    if (isEditing && currentTimesheetStatus === 'succeeded' && timesheetToEdit && timesheetToEdit._id === timesheetIdForEdit) {
      const entryTimezone = timesheetToEdit.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const utcToLocalTimeInput = (isoStr) => {
        if (!isoStr) return '';
        try { return DateTime.fromISO(isoStr, { zone: 'utc' }).setZone(entryTimezone).toFormat('HH:mm'); }
        catch (err) { console.error("Error converting UTC to local time input:", err); return ''; }
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
        clientId: timesheetToEdit.clientId?._id || timesheetToEdit.clientId || '', // Use client from timesheet
        projectId: timesheetToEdit.projectId?._id || timesheetToEdit.projectId || '', // Use project from timesheet
        date: formattedDate,
        startTime: utcToLocalTimeInput(timesheetToEdit.startTime),
        endTime: utcToLocalTimeInput(timesheetToEdit.endTime),
        lunchBreak: timesheetToEdit.lunchBreak || 'No',
        lunchDuration: /^\d{2}:\d{2}$/.test(timesheetToEdit.lunchDuration) ? timesheetToEdit.lunchDuration : '00:30',
        leaveType: timesheetToEdit.leaveType || 'None',
        description: timesheetToEdit.description || '',
        hourlyWage: employeeForWage?.wage || timesheetToEdit.hourlyWage || '', // Prioritize current employee wage
        totalHours: timesheetToEdit.totalHours || 0,
        notes: timesheetToEdit.notes || '',
      };
      setFormData(initialFormData);
      // Initial calculation after form is populated
      try {
          const initialHours = calculateHoursPure(initialFormData);
          setFormData(prev => ({ ...prev, totalHours: initialHours }));
      } catch (calcError) {
          dispatch(setAlert(`Error calculating initial hours: ${calcError.message}`, 'warning'));
          setError(`Error calculating initial hours: ${calcError.message}`);
      }
    } else if (!isEditing) {
        // For create mode, ensure preselected IDs from URL or navigation state are used
        setFormData(prev => ({
            ...DEFAULT_FORM_DATA, // Start with defaults
            clientId: clientIdFromUrl || preselectedClientId || '',
            projectId: projectIdFromUrl || preselectedProjectId || '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Ensure timezone is set
        }));
    }
  }, [
      isEditing, currentTimesheetStatus, timesheetToEdit, timesheetIdForEdit, // For edit mode
      clientIdFromUrl, preselectedClientId, projectIdFromUrl, preselectedProjectId, // For create mode with preselection
      calculateHoursPure, dispatch, employees // General dependencies
    ]);

  // Recalculates total hours whenever relevant time inputs or leave status change
  useEffect(() => {
      let calculatedHoursValue = 0;
      try {
          calculatedHoursValue = calculateHoursPure(formData);
          setFormData(prev => {
              const roundedPrev = parseFloat(prev.totalHours || 0).toFixed(2);
              const roundedCurrent = calculatedHoursValue.toFixed(2);
              if (roundedPrev !== roundedCurrent) {
                  return { ...prev, totalHours: calculatedHoursValue };
              }
              return prev;
          });
          if (error && error.startsWith("Calculation Error:")) setError(null); // Clear only calculation errors
      } catch (calcError) {
          console.error("Calculation Error in useEffect:", calcError.message);
          // Avoid setting error state here if it's already being handled by validateForm or handleSubmit
      }
  }, [formData.startTime, formData.endTime, formData.lunchBreak, formData.lunchDuration, formData.leaveType, calculateHoursPure, error]); // Added error to deps

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        let updated = { ...prev, [name]: value };
        if (name === 'employeeId') {
            const selectedEmployee = employees.find((emp) => emp._id === value);
            updated.hourlyWage = selectedEmployee ? selectedEmployee.wage || '' : '';
        } else if (name === 'leaveType') {
            const isNowLeave = value !== 'None';
            const wasLeave = prev.leaveType !== 'None'; // Check previous leave state
            if (isNowLeave && !wasLeave) { // If changing to a leave type
                updated = {
                    ...updated,
                    startTime: '', endTime: '', lunchBreak: 'No',
                    lunchDuration: '00:30',
                    // Keep clientId and projectId if they were preselected from URL/navigation
                    clientId: clientIdFromUrl || preselectedClientId || '',
                    projectId: projectIdFromUrl || preselectedProjectId || '',
                    notes: '', totalHours: 0,
                };
            } else if (!isNowLeave && wasLeave) { // If changing from leave to work entry
                updated.description = ''; // Clear leave description
                // Potentially reset client/project if they were cleared for leave
                updated.clientId = clientIdFromUrl || preselectedClientId || '';
                updated.projectId = projectIdFromUrl || preselectedProjectId || '';
            }
        } else if (name === 'lunchBreak' && value === 'No') {
            updated.lunchDuration = '00:30';
        } else if (name === 'clientId') { // If client changes, reset project
            updated.projectId = '';
        }
        return updated;
    });
    if (error) setError(null); // Clear local error on input change
  };

  // Form validation logic
  const validateForm = () => {
    if (!formData.employeeId) return 'Employee is required.';
    if (!formData.date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) return 'Date is required (YYYY-MM-DD).';

    if (isLeaveSelected) {
      if (!formData.description.trim()) return 'Leave Description is required.';
    } else {
      if (!formData.clientId) return 'Client is required.';
      if (!formData.projectId) return 'Project is required.';
      if (!formData.startTime) return 'Start Time is required.';
      if (!formData.endTime) return 'End Time is required.';

      if (!/^\d{2}:\d{2}$/.test(formData.startTime) || !/^\d{2}:\d{2}$/.test(formData.endTime)) {
        return 'Invalid Start or End Time format (HH:MM).';
      }

      try {
        const startDateTime = DateTime.fromISO(`1970-01-01T${formData.startTime}`, { zone: 'local' });
        const endDateTime = DateTime.fromISO(`1970-01-01T${formData.endTime}`, { zone: 'local' });
        if (!startDateTime.isValid || !endDateTime.isValid || endDateTime <= startDateTime) {
          return 'End Time must be after Start Time.';
        }
      } catch (e) { return 'Error validating time inputs.'; }

      if (formData.lunchBreak === 'Yes' && !/^\d{2}:\d{2}$/.test(formData.lunchDuration)) {
          return 'Invalid Lunch Duration format (HH:MM).';
      }

      if (parseFloat(formData.totalHours) > 16) {
        return 'Total hours seem high (> 16). Please verify.';
      }
      if (parseFloat(formData.totalHours) <= 0 && formData.startTime && formData.endTime) {
        return 'Total hours cannot be zero or less for a work entry. Check times/lunch.';
      }
    }
    return null;
  };

  // Handles form submission for creating or updating a timesheet
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearCheckStatus());
    dispatch(clearCreateStatus());
    dispatch(clearUpdateStatus());
    setError(null);

    // Final calculation before validation
    let calculatedHoursValue = 0;
    try {
        calculatedHoursValue = calculateHoursPure(formData);
        // Update formData immediately with the final calculation for validation
        setFormData(prev => ({...prev, totalHours: calculatedHoursValue}));
    } catch (calcError) {
        setError(calcError.message);
        dispatch(setAlert(calcError.message, 'danger'));
        return;
    }

    // Validate with the potentially updated formData (from setFormData above)
    // Need to pass the updated formData to validateForm or re-fetch from state if validateForm uses it directly
    const currentFormDataForValidation = {...formData, totalHours: calculatedHoursValue};
    const validationError = validateForm(currentFormDataForValidation); // Pass current data

    if (validationError) {
      setError(validationError);
      dispatch(setAlert(validationError, 'warning'));
      return;
    }

    try {
      if (!isEditing) {
        const checkAction = await dispatch(checkTimesheetExists({
          employee: formData.employeeId,
          date: formData.date
        })).unwrap();

        if (checkAction.exists) {
          dispatch(setAlert('A timesheet for this employee on this date already exists.', 'warning'));
          setError('A timesheet for this employee on this date already exists.');
          return;
        }
      }

      // Prepare data for saving (convert times to UTC)
      const localTimeToUtcISO = (timeStr) => {
        if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr) || !formData.date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) return null;
        let conversionTimezone = formData.timezone;
        // Validate timezone before using
        if (!conversionTimezone || !DateTime.local().setZone(conversionTimezone).isValid) {
            console.warn(`Invalid timezone '${conversionTimezone}' detected, falling back to system default for conversion.`);
            conversionTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Fallback to system default
        }
        try {
          const localDT = DateTime.fromISO(`${formData.date}T${timeStr}`, { zone: conversionTimezone });
          if (!localDT.isValid) throw new Error(`Invalid local time parse: ${formData.date}T${timeStr}`);
          return localDT.toUTC().toISO();
        } catch (err) { throw new Error(`UTC Conversion Error: ${err.message}`); }
      };

      const startTimeUTC = !isLeaveSelected ? localTimeToUtcISO(formData.startTime) : null;
      const endTimeUTC = !isLeaveSelected ? localTimeToUtcISO(formData.endTime) : null;

      if (!isLeaveSelected && (formData.startTime && !startTimeUTC || formData.endTime && !endTimeUTC)) {
          // This means time conversion failed, error would have been thrown by localTimeToUtcISO
          setError("Failed to convert start or end time for saving. Check date/time inputs and timezone.");
          dispatch(setAlert("Failed to convert start or end time. Check inputs.", "danger"));
          return;
      }

      const timezoneToSend = formData.timezone && DateTime.local().setZone(formData.timezone).isValid
                             ? formData.timezone
                             : Intl.DateTimeFormat().resolvedOptions().timeZone;

      const requestData = {
        employeeId: formData.employeeId,
        clientId: !isLeaveSelected ? formData.clientId : null,
        projectId: !isLeaveSelected ? formData.projectId : null,
        date: formData.date,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        lunchBreak: !isLeaveSelected ? formData.lunchBreak : 'No',
        lunchDuration: !isLeaveSelected && formData.lunchBreak === 'Yes' ? formData.lunchDuration : '00:30',
        leaveType: formData.leaveType,
        description: isLeaveSelected ? formData.description : "",
        notes: !isLeaveSelected ? formData.notes : "",
        hourlyWage: parseFloat(formData.hourlyWage) || 0,
        totalHours: calculatedHoursValue, // Use the re-calculated value
        timezone: timezoneToSend,
      };

      if (isEditing) {
        await dispatch(updateTimesheet({ id: timesheetIdForEdit, timesheetData: requestData })).unwrap();
        dispatch(setAlert('Timesheet updated successfully!', 'success'));
      } else {
        await dispatch(createTimesheet(requestData)).unwrap();
        dispatch(setAlert('Timesheet created successfully!', 'success'));
      }

      // Navigate on success, considering the source of navigation
      const finalClientId = clientIdFromUrl || preselectedClientId || timesheetToEdit?.clientId?._id || timesheetToEdit?.clientId;
      const finalProjectId = projectIdFromUrl || preselectedProjectId || timesheetToEdit?.projectId?._id || timesheetToEdit?.projectId;

      if (source === 'projectTimesheet' && finalClientId && finalProjectId) {
          navigate(`/clients/view/${finalClientId}/project/${finalProjectId}`);
      } else {
          navigate('/timesheet');
      }

    } catch (apiError) {
      const errorMessage = typeof apiError === 'string' ? apiError : (apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} timesheet.`);
      setError(errorMessage);
      dispatch(setAlert(errorMessage, 'danger'));
    }
  };

  const handleCancel = () => {
    const finalClientId = clientIdFromUrl || preselectedClientId || timesheetToEdit?.clientId?._id || timesheetToEdit?.clientId;
    const finalProjectId = projectIdFromUrl || preselectedProjectId || timesheetToEdit?.projectId?._id || timesheetToEdit?.projectId;

    if (source === 'projectTimesheet' && finalClientId && finalProjectId) {
        navigate(`/clients/view/${finalClientId}/project/${finalProjectId}`);
    } else {
        navigate('/timesheet');
    }
  };

  const isProjectLoading = projectStatus === 'loading';

  // Memoized client and project names for display
  const clientName = useMemo(() => {
    const targetClientId = clientIdFromUrl || preselectedClientId;
    return clients.find(c => c._id === targetClientId)?.name || (targetClientId ? 'Loading Client...' : 'N/A');
  }, [clients, clientIdFromUrl, preselectedClientId]);

  const projectName = useMemo(() => {
    const targetProjectId = projectIdFromUrl || preselectedProjectId;
    // Search in allProjects as filteredProjects might not be up-to-date if client changes
    return allProjects.find(p => p._id === targetProjectId)?.name || (targetProjectId ? 'Loading Project...' : 'N/A');
  }, [allProjects, projectIdFromUrl, preselectedProjectId]);


  // Render
  return (
    <div className='vehicles-page'>
      <Alert />
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            {isEditing ? 'Edit' : 'Create'} {source === 'projectTimesheet' ? 'Project ' : ''}Timesheet
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
            {source === 'projectTimesheet' && clientIdFromUrl && projectIdFromUrl ? (
              <>
                <span className='breadcrumb-separator'> / </span>
                <Link to='/clients' className='breadcrumb-link'>Clients</Link>
                <span className='breadcrumb-separator'> / </span>
                <Link to={`/clients/view/${clientIdFromUrl}`} className='breadcrumb-link'>{clientName}</Link>
                <span className='breadcrumb-separator'> / </span>
                <Link to={`/clients/view/${clientIdFromUrl}/project/${projectIdFromUrl}`} className='breadcrumb-link'>{projectName}</Link>
              </>
            ) : (
              <>
                <span className='breadcrumb-separator'> / </span>
                <Link to='/timesheet' className='breadcrumb-link'>Timesheet</Link>
              </>
            )}
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>{isEditing ? 'Edit Timesheet' : 'Create Timesheet'}</span>
          </div>
        </div>
      </div>

      <div className='form-container'>
        <form onSubmit={handleSubmit} className='employee-form' noValidate>
          {/* Display Client and Project Info (Readonly if from projectTimesheet source) */}
          {source === 'projectTimesheet' && (
            <>
              <div className='form-group readonly-info'>
                  <label><FontAwesomeIcon icon={faBuilding} /> Client</label>
                  <input type="text" value={clientName} readOnly disabled />
              </div>
              <div className='form-group readonly-info'>
                  <label><FontAwesomeIcon icon={faProjectDiagram} /> Project</label>
                  <input type="text" value={projectName} readOnly disabled />
              </div>
            </>
          )}

          <div className='form-group'>
            <label htmlFor='employeeId'><FontAwesomeIcon icon={faUserTie} /> Employee*</label>
            <select id='employeeId' name='employeeId' value={formData.employeeId} onChange={handleChange} required disabled={isEditing || isLoading}>
              <option value=''>-- Select Employee --</option>
              {employees.map((emp) => (<option key={emp._id} value={emp._id}>{emp.name}</option>))}
            </select>
          </div>

          <div className='form-group'>
            <label htmlFor='date'><FontAwesomeIcon icon={faCalendarAlt} /> Date*</label>
            <input id='date' type='date' name='date' value={formData.date} onChange={handleChange} required disabled={isEditing || isLoading} />
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
             {/* Client and Project dropdowns only if not from projectTimesheet source */}
              {source !== 'projectTimesheet' && (
                <>
                  <div className='form-group'>
                    <label htmlFor='clientId'><FontAwesomeIcon icon={faBuilding} /> Client*</label>
                    <select id='clientId' name='clientId' value={formData.clientId || ''} onChange={handleChange} required={!isLeaveSelected} disabled={isLoading}>
                      <option value=''>-- Select Client --</option>
                      {clients.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                    </select>
                  </div>

                  <div className='form-group'>
                    <label htmlFor='projectId'><FontAwesomeIcon icon={faProjectDiagram} /> Project*</label>
                    <select id='projectId' name='projectId' value={formData.projectId || ''} onChange={handleChange} required={!isLeaveSelected} disabled={isLoading || isProjectLoading || !formData.clientId}>
                      <option value=''>{isProjectLoading ? 'Loading projects...' : (!formData.clientId ? 'Select Client First' : '-- Select Project --')}</option>
                      {filteredProjects.map((p) => (<option key={p._id} value={p._id}>{p.name}</option>))}
                    </select>
                    {!formData.clientId && !isProjectLoading && <small>Please select a client first.</small>}
                    {formData.clientId && !isProjectLoading && filteredProjects.length === 0 && <small>No projects found for this client.</small>}
                  </div>
                </>
              )}


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

export default CreateTimesheet;
