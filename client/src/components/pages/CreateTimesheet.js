import React, { useEffect, useState, useCallback, useMemo } from 'react'; // Added useMemo
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
    selectTimesheetCheckStatus,
    selectTimesheetCheckResult,
    selectTimesheetCheckError,
    selectTimesheetCreateStatus,
    selectTimesheetCreateError,
    selectTimesheetUpdateStatus,
    selectTimesheetUpdateError,
    clearCheckStatus, clearCreateStatus, clearUpdateStatus // Import clear actions
} from '../../redux/slices/timesheetSlice'; // Import timesheet actions/selectors
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
import { setAlert } from '../../redux/slices/alertSlice'; // Import setAlert
import Alert from '../layout/Alert'; // Import Alert component
import { DateTime } from 'luxon';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Constants for default values
const DEFAULT_LUNCH_DURATION = '00:30';
const DEFAULT_FORM_DATA = {
  employeeId: '',
  clientId: '',
  projectId: '',
  date: DateTime.now().toFormat('yyyy-MM-dd'),
  startTime: '',
  endTime: '',
  lunchBreak: 'No',
  lunchDuration: DEFAULT_LUNCH_DURATION,
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

  // Check for state passed from navigation (e.g., from ProjectTimesheet)
  const navigationState = location.state || {};
  const { clientId: preselectedClientId, projectId: preselectedProjectId, source } = navigationState;

  const timesheetToEdit = location && location.state && location.state.timesheet;
  const isEditing = Boolean(timesheetToEdit && timesheetToEdit._id);

  const [formData, setFormData] = useState({...DEFAULT_FORM_DATA, clientId: preselectedClientId || '', projectId: preselectedProjectId || ''});
  // const [isLoading, setIsLoading] = useState(false); // Replaced by Redux status
  const [error, setError] = useState(null);
  const [filteredProjects, setFilteredProjects] = useState([]);

  const employees = useSelector(selectAllEmployees);
  const clients = useSelector(selectAllClients);
  const allProjects = useSelector(selectProjectItems);
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);

  // Timesheet action statuses from Redux
  const checkStatus = useSelector(selectTimesheetCheckStatus);
  const checkResult = useSelector(selectTimesheetCheckResult);
  const checkError = useSelector(selectTimesheetCheckError);
  const createStatus = useSelector(selectTimesheetCreateStatus);
  const createError = useSelector(selectTimesheetCreateError);
  const updateStatus = useSelector(selectTimesheetUpdateStatus);
  const updateError = useSelector(selectTimesheetUpdateError);

  const isLeaveSelected = formData.leaveType !== 'None';

  // Refactored: calculateHours is now a pure function, returns hours or throws error
  const calculateHoursPure = useCallback((currentFormData) => {
    const { startTime, endTime, lunchBreak, lunchDuration, leaveType } = currentFormData;
    const isLeave = leaveType !== 'None';

    const timeFormatRegex = /^\d{2}:\d{2}$/;
    if (isLeave || !startTime || !endTime || !timeFormatRegex.test(startTime) || !timeFormatRegex.test(endTime)) {
      // Return 0 if not applicable or inputs missing/invalid format
      return 0;
    }

    try {
      const baseDate = '1970-01-01';
      const startDateTime = DateTime.fromISO(`${baseDate}T${startTime}`, { zone: 'local' });
      const endDateTime = DateTime.fromISO(`${baseDate}T${endTime}`, { zone: 'local' });

      if (!startDateTime.isValid || !endDateTime.isValid || endDateTime <= startDateTime) {
        // Return 0 if times are invalid or end is not after start
        return 0;
      }

      const diffInMinutes = endDateTime.diff(startDateTime, 'minutes').minutes;
      let totalMinutes = diffInMinutes;

      if (lunchBreak === 'Yes' && lunchDuration) {
        if (timeFormatRegex.test(lunchDuration)) {
            const [lunchHours, lunchMinutes] = lunchDuration.split(':').map(Number);
            const lunchDurationInMinutes = (lunchHours * 60) + lunchMinutes;
            totalMinutes -= lunchDurationInMinutes;
        } else {
            // Throw error for invalid lunch duration format
            throw new Error("Invalid Lunch Duration format. Please use HH:MM.");
        }
      }

      const totalHoursCalculated = totalMinutes > 0 ? totalMinutes / 60 : 0;
      const roundedTotalHours = parseFloat(totalHoursCalculated.toFixed(2));

      return roundedTotalHours;

    } catch (e) {
      throw new Error(`Calculation Error: ${e.message}`); // Propagate calculation errors
    }
  }, []); // No external dependencies needed for pure calculation

  // Combined loading state
  const isLoading = useMemo(() =>
    checkStatus === 'loading' ||
    createStatus === 'loading' ||
    updateStatus === 'loading',
    [checkStatus, createStatus, updateStatus]
  );

  // Effect to show alerts for fetch or save errors from Redux state
  useEffect(() => {
    const reduxError = projectError || checkError || createError || updateError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
      // Optionally clear the Redux error after showing the alert
    }
  }, [projectError, checkError, createError, updateError, dispatch]);

  useEffect(() => {
    if (employees.length === 0) dispatch(fetchEmployees()); // Fetch only if needed
    dispatch(fetchClients());
  }, [dispatch]);

  useEffect(() => {
    if (formData.clientId && !isLeaveSelected) {
      dispatch(fetchProjects(formData.clientId));
    } else {
      // Don't clear projects if preselected, otherwise clear
      if (!preselectedProjectId) dispatch(clearProjects());
    }
    // Only reset projectId if clientId changes *and* it wasn't preselected
    if (!preselectedProjectId) setFormData(prev => ({ ...prev, projectId: '' }));
  }, [formData.clientId, isLeaveSelected, dispatch, preselectedProjectId]);

  useEffect(() => {
    if (formData.clientId && allProjects && allProjects.length > 0) {
      const clientProjects = allProjects.filter(p => (p.clientId?._id || p.clientId) === formData.clientId);
      setFilteredProjects(clientProjects);
    } else {
      setFilteredProjects([]);
    }
  }, [allProjects, formData.clientId]);


  // Effect to populate form data when editing or creating with context
  useEffect(() => {
    if (timesheetToEdit) {
      const entryTimezone = timesheetToEdit?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      const utcToLocalTimeInput = (isoStr) => {
        if (!isoStr) return '';
        try {
          return DateTime.fromISO(isoStr, { zone: 'utc' })
                         .setZone(entryTimezone)
                         .toFormat('HH:mm');
        } catch (err) { return ''; }
      };

      // Ensure date is in yyyy-MM-dd format
      let formattedDate = timesheetToEdit.date;
      if (formattedDate && !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
          try {
              formattedDate = DateTime.fromISO(formattedDate).toFormat('yyyy-MM-dd');
          } catch {
              formattedDate = DateTime.now().toFormat('yyyy-MM-dd'); // Fallback
          }
      }

      const initialFormData = {
        timezone: entryTimezone,
        employeeId: timesheetToEdit.employeeId?._id || timesheetToEdit.employeeId || '', // Handle both object and string ID
        clientId: preselectedClientId || timesheetToEdit.clientId?._id || timesheetToEdit.clientId || '', // Prioritize preselected
        projectId: preselectedProjectId || timesheetToEdit.projectId?._id || timesheetToEdit.projectId || '', // Handle object or string ID, prioritize preselected
        date: formattedDate, // Use formatted date
        startTime: utcToLocalTimeInput(timesheetToEdit.startTime),
        endTime: utcToLocalTimeInput(timesheetToEdit.endTime),
        lunchBreak: timesheetToEdit.lunchBreak || 'No',
        lunchDuration: /^\d{2}:\d{2}$/.test(timesheetToEdit.lunchDuration) ? timesheetToEdit.lunchDuration : '00:30',
        leaveType: timesheetToEdit.leaveType || 'None',
        description: timesheetToEdit.description || '', // Corrected field name if needed
        hourlyWage: timesheetToEdit.employeeId?.wage || timesheetToEdit.hourlyWage || '',
        totalHours: timesheetToEdit.totalHours || 0,
        notes: timesheetToEdit.notes || '',
      };

      setFormData(initialFormData);

      // Calculate initial hours without causing re-renders via state update in calculation
      try {
          const initialHours = calculateHoursPure(initialFormData);
          setFormData(prev => ({ ...prev, totalHours: initialHours }));
      } catch (calcError) {
          dispatch(setAlert(`Error calculating initial hours: ${calcError.message}`, 'warning'));
          setError(`Error calculating initial hours: ${calcError.message}`);
      }
    } else { setFormData(DEFAULT_FORM_DATA); } // Reset form if not editing
    // Reset form if creating and context is provided
    if (!isEditing && (preselectedClientId || preselectedProjectId)) {
        setFormData(prev => ({ ...prev, clientId: preselectedClientId || '', projectId: preselectedProjectId || '' }));
    }
  }, [timesheetToEdit, calculateHoursPure, isEditing, preselectedClientId, preselectedProjectId]); // Removed dispatch

  // Effect to fetch projects when clientId is set in formData (either initially or by user)
  // This runs *after* formData.clientId is potentially set by the effect above.
  useEffect(() => {
      if (formData.clientId && !isLeaveSelected) {
          dispatch(fetchProjects(formData.clientId));
      }
  }, [formData.clientId, isLeaveSelected, dispatch]); // Fetch projects when clientId changes

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
        let updated = { ...prev, [name]: value };
        if (name === 'employeeId') {
            const selectedEmployee = employees.find((emp) => emp._id === value);
            updated.hourlyWage = selectedEmployee ? selectedEmployee.wage || '' : '';
        } else if (name === 'leaveType') {
            const isNowLeave = value !== 'None';
            const wasLeave = prev.leaveType !== 'None';
            if (isNowLeave && !wasLeave) {
                updated = {
                    ...updated, startTime: '', endTime: '', lunchBreak: 'No',
                    lunchDuration: DEFAULT_LUNCH_DURATION, clientId: '', projectId: '', notes: '', totalHours: 0,
                };
            } else if (!isNowLeave && wasLeave) {
                updated.description = '';
            } // Corrected field name if needed
        } else if (name === 'lunchBreak' && value === 'No') {
            updated.lunchDuration = '00:30';
        }
        return updated;
    });
    if (error) setError(null);
  };

  // Effect to calculate hours
  useEffect(() => {
      // Recalculate hours whenever relevant fields change
      let calculatedHoursValue = 0;
      try {
          calculatedHoursValue = calculateHoursPure(formData);
          // Only update if the calculated value is different from the current state value (rounded comparison)
          setFormData(prev => {
              const roundedPrev = parseFloat(prev.totalHours || 0).toFixed(2);
              const roundedCurrent = calculatedHoursValue.toFixed(2);
              if (roundedPrev !== roundedCurrent) {
                  return { ...prev, totalHours: calculatedHoursValue };
              }
              return prev; // No change needed
          });
          if (error) setError(null); // Clear local error only if it was previously set
      } catch (calcError) {
          // Avoid setting state directly within the catch of the effect that might cause the error
          console.error("Calculation Error:", calcError.message); // Log error, alert will be shown by handleSubmit/validateForm if needed
      }
  }, [formData.startTime, formData.endTime, formData.lunchBreak, formData.lunchDuration, formData.leaveType, calculateHoursPure, dispatch]); // Removed error from dependencies

  const validateForm = () => {
    if (!formData.employeeId) return 'Employee is required.';
    if (!formData.date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) return 'Date is required in YYYY-MM-DD format.';

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
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Clear previous local and Redux errors before submitting
    dispatch(clearCheckStatus());
    dispatch(clearCreateStatus());
    dispatch(clearUpdateStatus());
    setError(null);

    // Re-validate calculated hours before submission
    let calculatedHoursValue = 0;
    try {
        calculatedHoursValue = calculateHoursPure(formData);
        if (!isLeaveSelected && calculatedHoursValue <= 0 && formData.startTime && formData.endTime) {
            throw new Error('Total Hours calculation resulted in zero or less. Check times/lunch.');
        }
    } catch (calcError) {
        setError(calcError.message); return;
        dispatch(setAlert(calcError.message, 'danger')); // Show calculation error via Alert
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      dispatch(setAlert(validationError, 'warning')); // <-- Add this line
      return;
    }

    try {
      // Step 1: Check for existing timesheet only if creating a new one
      if (!isEditing) {
        const checkAction = await dispatch(checkTimesheetExists({
          employee: formData.employeeId,
          date: formData.date
        })).unwrap(); // unwrap to catch potential rejections here

        if (checkAction.exists) {
          dispatch(setAlert('A timesheet for this employee on this date already exists.', 'warning'));
          setError('A timesheet for this employee on this date already exists.');
          return; // Stop submission
        }
        // If checkAction is rejected, the catch block below will handle it
      }

      // Step 2: Prepare data for saving (convert times to UTC)
      const localTimeToUtcISO = (timeStr) => {
        // Refactored slightly for clarity, added error throwing
        if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
        if (!formData.date || !/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) return null;

        let conversionTimezone = formData.timezone;
        if (!conversionTimezone || !DateTime.local().setZone(conversionTimezone).isValid) {
            console.warn(`Invalid timezone '${conversionTimezone}' detected, falling back to UTC for conversion.`);
            conversionTimezone = 'UTC';
        }

        try {
          const localDT = DateTime.fromISO(`${formData.date}T${timeStr}`, { zone: conversionTimezone });
          if (!localDT.isValid) {
              // Throw error instead of console.error
              throw new Error(`Failed to parse local time: ${formData.date}T${timeStr} in zone ${conversionTimezone}`);
          }
          return localDT.toUTC().toISO();
        } catch (err) {
            throw new Error(`Error converting local time to UTC ISO: ${err.message}`);
            return null;
        }
      };

      const startTimeUTC = !isLeaveSelected ? localTimeToUtcISO(formData.startTime) : null;
      const endTimeUTC = !isLeaveSelected ? localTimeToUtcISO(formData.endTime) : null;

      if (!isLeaveSelected && (!startTimeUTC || !endTimeUTC)) {
          // Error thrown by localTimeToUtcISO will be caught below
          // setError("Failed to convert start or end time for saving. Check date/time inputs.");
          return;
      }

      const timezoneToSend = formData.timezone && DateTime.local().setZone(formData.timezone).isValid
                             ? formData.timezone
                             : Intl.DateTimeFormat().resolvedOptions().timeZone;

      const requestData = {
        employeeId: formData.employeeId,
        clientId: !isLeaveSelected ? formData.clientId : null,
        projectId: !isLeaveSelected ? formData.projectId : null,
        date: formData.date, // Send YYYY-MM-DD string
        startTime: startTimeUTC, // Send UTC ISO string
        endTime: endTimeUTC, // Send UTC ISO string
        lunchBreak: !isLeaveSelected ? formData.lunchBreak : 'No',
        lunchDuration: !isLeaveSelected && formData.lunchBreak === 'Yes' ? formData.lunchDuration : DEFAULT_LUNCH_DURATION, // Send HH:MM string
        leaveType: formData.leaveType,
        description: isLeaveSelected ? formData.description : "",
        notes: !isLeaveSelected ? formData.notes : "",
        hourlyWage: parseFloat(formData.hourlyWage) || 0,
        timezone: timezoneToSend,
      };

      // Step 3: Dispatch create or update action
      if (isEditing) {
        await dispatch(updateTimesheet({ id: timesheetToEdit._id, timesheetData: requestData })).unwrap();
        dispatch(setAlert('Timesheet updated successfully!', 'success'));
      } else {
        await dispatch(createTimesheet(requestData)).unwrap();
        dispatch(setAlert('Timesheet created successfully!', 'success'));
      }

      // Step 4: Navigate on success - Check the source and determine correct IDs
      if (source === 'projectTimesheet') {
        // Helper to get ID robustly
        const getClientId = () => {
            if (preselectedClientId) return preselectedClientId;
            if (timesheetToEdit?.clientId?._id) return timesheetToEdit.clientId._id;
            if (typeof timesheetToEdit?.clientId === 'string') return timesheetToEdit.clientId;
            return null;
        };
        const getProjectId = () => {
            if (preselectedProjectId) return preselectedProjectId;
            if (timesheetToEdit?.projectId?._id) return timesheetToEdit.projectId._id;
            if (typeof timesheetToEdit?.projectId === 'string') return timesheetToEdit.projectId;
            return null;
        };

        const clientIdNav = getClientId();
        const projectIdNav = getProjectId();

        // console.log("Navigating back to project - Source:", source, "Client ID:", clientIdNav, "Project ID:", projectIdNav); // Debug log

        if (clientIdNav && projectIdNav) {
          navigate(`/clients/view/${clientIdNav}/project/${projectIdNav}`); // Navigate back to the specific project
          return; // Stop further execution
        }
      }
      // Default navigation if not from projectTimesheet or if IDs were missing
      navigate('/timesheet');

    } catch (apiError) {
      // Error from check, create, update, or time conversion will be caught here
      const errorMessage = typeof apiError === 'string' ? apiError : (apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} timesheet.`);
      setError(errorMessage); // Set local error for display
      dispatch(setAlert(errorMessage, 'danger')); // Also show alert
      // No need to check for 401 specifically, Redux middleware/interceptors should handle redirects
    }
  };

  // Handle Cancel button click
  const handleCancel = () => {
    // Check the source and determine correct IDs
    if (source === 'projectTimesheet') {
      const getClientId = () => {
          if (preselectedClientId) return preselectedClientId;
          if (timesheetToEdit?.clientId?._id) return timesheetToEdit.clientId._id;
          if (typeof timesheetToEdit?.clientId === 'string') return timesheetToEdit.clientId;
          return null;
      };
      const getProjectId = () => {
          if (preselectedProjectId) return preselectedProjectId;
          if (timesheetToEdit?.projectId?._id) return timesheetToEdit.projectId._id;
          if (typeof timesheetToEdit?.projectId === 'string') return timesheetToEdit.projectId;
          return null;
      };
      const clientIdNav = getClientId();
      const projectIdNav = getProjectId();
      // console.log("Canceling back to project - Source:", source, "Client ID:", clientIdNav, "Project ID:", projectIdNav); // Debug log
      if (clientIdNav && projectIdNav) {
        navigate(`/clients/view/${clientIdNav}/project/${projectIdNav}`);
        return;
      }
    }
    // Default cancel navigation
    navigate('/timesheet');
  };

  const isProjectLoading = projectStatus === 'loading';

  return (
    <div className='vehicles-page'>
      <Alert /> {/* Render Alert component here */}
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            {isEditing ? 'Edit' : 'Create'} Timesheet
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/timesheet' className='breadcrumb-link'>Timesheet</Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>{isEditing ? 'Edit Timesheet' : 'Create Timesheet'}</span>
          </div>
        </div>
      </div>

      <div className='form-container'>
        <form onSubmit={handleSubmit} className='employee-form' noValidate>
          {/* {(error || projectError || checkError || createError || updateError) && ( // Handled by Alert component
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error || projectError || checkError || createError || updateError}
            </div>
          )} */}

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
