// /home/digilab/timesheet/client/src/components/pages/CreateTimesheet.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchClients, selectAllClients, selectClientStatus } from '../../redux/slices/clientSlice'; // Added selectClientStatus
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus } from '../../redux/slices/employeeSlice'; // Added selectEmployeeStatus
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
    fetchTimesheetById,
    selectTimesheetCheckStatus,
    selectTimesheetCheckResult,
    selectTimesheetCheckError,
    selectTimesheetCreateStatus,
    selectTimesheetCreateError,
    selectTimesheetUpdateStatus,
    selectTimesheetUpdateError,
    selectCurrentTimesheet,
    selectCurrentTimesheetStatus, clearCheckStatus, clearCreateStatus, clearUpdateStatus, clearCurrentTimesheet // Added clearCurrentTimesheet
} from "../../redux/slices/timesheetSlice";
import { selectAuthUser } from '../../redux/slices/authSlice'; // Import selectAuthUser
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
import { setAlert } from "../../redux/slices/alertSlice";
import { selectEmployerSettings, fetchEmployerSettings, selectSettingsStatus } from '../../redux/slices/settingsSlice'; // Import settings
import Alert from '../layout/Alert';
import { DateTime } from 'luxon';

const DEFAULT_FORM_DATA = {
  employeeId: '',
  clientId: '',
  projectId: '',
  date: DateTime.now().toFormat('yyyy-MM-dd'),
  startTime: '',
  endTime: '',
  lunchBreak: 'No',
  lunchDuration: '00:30',
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
  // useParams will get { timesheetId: "someValue" } if the route is /timesheet/create/:timesheetId
  const { clientId: clientIdFromUrl, projectId: projectIdFromUrl, timesheetId: timesheetIdForEdit } = useParams();

  const isEditing = Boolean(timesheetIdForEdit);
  const user = useSelector(selectAuthUser); // Get logged-in user from authSlice
  const navigationState = location.state || {};
  const { clientId: preselectedClientId, projectId: preselectedProjectId, source } = navigationState;

  const [formData, setFormData] = useState({
    ...DEFAULT_FORM_DATA,
    clientId: clientIdFromUrl || preselectedClientId || '',
    projectId: projectIdFromUrl || preselectedProjectId || ''
  });
  const [error, setError] = useState(null);
  const [filteredProjects, setFilteredProjects] = useState([]);

  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus); // For checking if employees are loaded
  const clients = useSelector(selectAllClients);
  const clientStatus = useSelector(selectClientStatus); // For checking if clients are loaded
  const allProjects = useSelector(selectProjectItems);
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);

  const checkStatus = useSelector(selectTimesheetCheckStatus);
  const checkError = useSelector(selectTimesheetCheckError);
  const createStatus = useSelector(selectTimesheetCreateStatus);
  const createError = useSelector(selectTimesheetCreateError);
  const updateStatus = useSelector(selectTimesheetUpdateStatus);
  const updateError = useSelector(selectTimesheetUpdateError);
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

  const calculateHoursPure = useCallback((currentFormData) => {
    const { startTime, endTime, lunchBreak, lunchDuration, leaveType } = currentFormData;
    const isLeave = leaveType !== 'None';
    const timeFormatRegex = /^\d{2}:\d{2}$/;

    if (isLeave || !startTime || !endTime || !timeFormatRegex.test(startTime) || !timeFormatRegex.test(endTime)) {
      return 0;
    }
    try {
      const baseDate = '1970-01-01';
      const startDateTime = DateTime.fromISO(`${baseDate}T${startTime}`, { zone: 'local' });
      const endDateTime = DateTime.fromISO(`${baseDate}T${endTime}`, { zone: 'local' });
      if (!startDateTime.isValid || !endDateTime.isValid || endDateTime <= startDateTime) return 0;
      let totalMinutes = endDateTime.diff(startDateTime, 'minutes').minutes;
      if (lunchBreak === 'Yes' && lunchDuration && timeFormatRegex.test(lunchDuration)) {
        const [lunchHours, lunchMinutes] = lunchDuration.split(':').map(Number);
        const lunchDurationInMinutes = (lunchHours * 60) + lunchMinutes;
        totalMinutes -= lunchDurationInMinutes;
      } else if (lunchBreak === 'Yes' && (!lunchDuration || !timeFormatRegex.test(lunchDuration))) {
        throw new Error("Invalid Lunch Duration format. Please use HH:MM.");
      }
      const totalHoursCalculated = totalMinutes > 0 ? totalMinutes / 60 : 0;
      return parseFloat(totalHoursCalculated.toFixed(2));
    } catch (e) {
      throw new Error(`Calculation Error: ${e.message}`);
    }
  }, []);

  const isLoading = useMemo(() =>
    checkStatus === 'loading' ||
    createStatus === 'loading' ||
    updateStatus === 'loading' ||
    (isEditing && currentTimesheetStatus === 'loading'),
    [checkStatus, createStatus, updateStatus, isEditing, currentTimesheetStatus]
  );

  useEffect(() => {
    const reduxError = projectError || checkError || createError || updateError || (isEditing && currentTimesheetStatus === 'failed' && !timesheetToEdit ? "Failed to load timesheet for editing." : null);
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [projectError, checkError, createError, updateError, isEditing, currentTimesheetStatus, timesheetToEdit, dispatch]);

  // Fetch settings if not already loaded
  useEffect(() => {
    if (settingsStatus === 'idle') {
      dispatch(fetchEmployerSettings());
    }
  }, [dispatch, settingsStatus]);

  // Fetches initial data: employees, clients.
  // Fetches the specific timesheet if in edit mode and it hasn't been fetched or has changed.
  useEffect(() => {
    if (employeeStatus === 'idle') dispatch(fetchEmployees());
    if (clientStatus === 'idle') dispatch(fetchClients());

    if (isEditing && timesheetIdForEdit) {
      // Only fetch if the current timesheet in store is not the one we need,
      // or if the status is idle (initial load for this ID),
      // and we are not currently loading, and the last attempt for *this* ID didn't fail.
      if (currentTimesheetStatus !== 'loading') {
        if (timesheetToEdit?._id !== timesheetIdForEdit) {
          // If the ID has changed or no timesheet is loaded, clear previous and fetch new.
          // Also, only fetch if the previous attempt for *this specific ID* didn't fail.
          // This check `currentTimesheetStatus !== 'failed'` is crucial.
          // If timesheetToEdit is null and status is 'failed', it means the fetch for timesheetIdForEdit failed.
          if (!(timesheetToEdit === null && currentTimesheetStatus === 'failed')) {
            dispatch(clearCurrentTimesheet()); // Clear any old timesheet data before fetching new
            dispatch(fetchTimesheetById(timesheetIdForEdit));
          }
        } else if (currentTimesheetStatus === 'idle') {
          // If status is 'idle' (e.g., first time loading this component for this ID), fetch.
          dispatch(fetchTimesheetById(timesheetIdForEdit));
        }
      }
    } else if (!isEditing) {
      // If switching from edit mode to create mode, clear any existing timesheetToEdit
      if (timesheetToEdit) {
        dispatch(clearCurrentTimesheet());
      }
    }
  }, [dispatch, isEditing, timesheetIdForEdit, employeeStatus, clientStatus, currentTimesheetStatus, timesheetToEdit?._id]);


  useEffect(() => {
    if (formData.clientId && !isLeaveSelected) {
      dispatch(fetchProjects(formData.clientId));
    } else if (!isLeaveSelected) {
      dispatch(clearProjects());
      setFilteredProjects([]);
    }
    if (formData.clientId !== (clientIdFromUrl || preselectedClientId)) {
        setFormData(prev => ({ ...prev, projectId: '' }));
    }
  }, [formData.clientId, isLeaveSelected, dispatch, clientIdFromUrl, preselectedClientId]);

  useEffect(() => {
    if (formData.clientId && allProjects && allProjects.length > 0) {
      const clientProjects = allProjects.filter(p => (p.clientId?._id || p.clientId) === formData.clientId);
      setFilteredProjects(clientProjects);
    } else {
      setFilteredProjects([]);
    }
  }, [allProjects, formData.clientId]);

  // Effect to initialize form data for create mode or populate/reset for edit mode
  useEffect(() => {
    if (isEditing) {
      if (currentTimesheetStatus === 'succeeded' && timesheetToEdit && timesheetToEdit._id === timesheetIdForEdit) {
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
          clientId: timesheetToEdit.clientId?._id || timesheetToEdit.clientId || '',
          projectId: timesheetToEdit.projectId?._id || timesheetToEdit.projectId || '',
          date: formattedDate,
          startTime: utcToLocalTimeInput(timesheetToEdit.startTime),
          endTime: utcToLocalTimeInput(timesheetToEdit.endTime),
          lunchBreak: timesheetToEdit.lunchBreak || 'No',
          lunchDuration: /^\d{2}:\d{2}$/.test(timesheetToEdit.lunchDuration) ? timesheetToEdit.lunchDuration : '00:30',
          leaveType: timesheetToEdit.leaveType || 'None',
          description: timesheetToEdit.description || '',
          hourlyWage: employeeForWage?.wage || timesheetToEdit.hourlyWage || '',
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
      } else if (currentTimesheetStatus !== 'loading' && currentTimesheetStatus !== 'idle') {
        // If not loading and not idle (e.g., failed or for a different timesheet), reset.
        setFormData(prev => ({
          ...DEFAULT_FORM_DATA,
          employeeId: '', clientId: '', projectId: '',
          date: DateTime.now().toFormat('yyyy-MM-dd'),
          startTime: '', endTime: '', hourlyWage: '', totalHours: 0,
          notes: '', description: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }));
      }
    } else { // Create mode
      // Wait for settings and employee record (if applicable) to be loaded
      if (settingsStatus === 'succeeded' && (user?.role !== 'employee' || (user?.role === 'employee' && loggedInEmployeeRecord))) {
        const defaultLunchBreakFromSettings = employerSettings?.timesheetIsLunchBreakDefault === true ? 'Yes' : 'No';
        let initialCreateData = {
          ...DEFAULT_FORM_DATA,
          lunchBreak: defaultLunchBreakFromSettings,
          lunchDuration: defaultLunchBreakFromSettings === 'Yes' ? (employerSettings?.timesheetDefaultLunchDuration || '00:30') : '00:30', // Assuming you might add timesheetDefaultLunchDuration
          clientId: clientIdFromUrl || preselectedClientId || '',
          projectId: projectIdFromUrl || preselectedProjectId || '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        if (user?.role === 'employee' && loggedInEmployeeRecord) {
          initialCreateData.employeeId = loggedInEmployeeRecord._id;
          initialCreateData.hourlyWage = loggedInEmployeeRecord.wage || '';
        }
        setFormData(initialCreateData);
      } else if (settingsStatus === 'idle' || settingsStatus === 'loading' || (user?.role === 'employee' && !loggedInEmployeeRecord && employeeStatus !== 'failed')) {
        // Settings or essential data are still loading.
        // formData will use DEFAULT_FORM_DATA initially and update when settings arrive due to dependency change.
      }
    }
  }, [
      isEditing, currentTimesheetStatus, timesheetToEdit, timesheetIdForEdit,
      clientIdFromUrl, preselectedClientId, projectIdFromUrl, preselectedProjectId,
      calculateHoursPure, dispatch, employees, user, loggedInEmployeeRecord, // Added user, loggedInEmployeeRecord
      settingsStatus, employerSettings // Added settings dependencies
    ]);
  
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
          if (error && error.startsWith("Calculation Error:")) setError(null);
      } catch (calcError) {
        // console.error("Calculation Error in useEffect:", calcError.message);
      }
  }, [formData.startTime, formData.endTime, formData.lunchBreak, formData.lunchDuration, formData.leaveType, calculateHoursPure, error]);
  
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
            const wasLeave = prev.leaveType !== 'None';
            if (isNowLeave && !wasLeave) {
                updated = {
                    ...updated,
                    startTime: '', endTime: '', lunchBreak: 'No',
                    lunchDuration: '00:30',
                    clientId: clientIdFromUrl || preselectedClientId || '',
                    projectId: projectIdFromUrl || preselectedProjectId || '',
                    notes: '', totalHours: 0,
                };
            } else if (!isNowLeave && wasLeave) {
                updated.description = '';
                updated.clientId = clientIdFromUrl || preselectedClientId || '';
                updated.projectId = projectIdFromUrl || preselectedProjectId || '';
            }
        } else if (name === 'lunchBreak' && value === 'No') {
            updated.lunchDuration = '00:30';
        } else if (name === 'clientId') {
            updated.projectId = '';
        }
        return updated;
    });
    if (error) setError(null);
  };

  const validateForm = (dataToValidate) => { // Accept data to validate
    if (!dataToValidate.employeeId) return 'Employee is required.';
    if (!dataToValidate.date || !/^\d{4}-\d{2}-\d{2}$/.test(dataToValidate.date)) return 'Date is required (YYYY-MM-DD).';

    const isLeave = dataToValidate.leaveType !== 'None'; // Use dataToValidate

    if (isLeave) {
      if (!dataToValidate.description.trim()) return 'Leave Description is required.';
    } else {
      // Client and Project requirements based on settings
      if (employerSettings?.timesheetIsProjectClientRequired && !dataToValidate.clientId) return 'Client is required.';
      if (employerSettings?.timesheetIsProjectClientRequired && dataToValidate.clientId && !dataToValidate.projectId) {
        return 'Project is required.';
      }
      if (!dataToValidate.startTime) return 'Start Time is required.';
      if (!dataToValidate.endTime) return 'End Time is required.';
      if (!/^\d{2}:\d{2}$/.test(dataToValidate.startTime) || !/^\d{2}:\d{2}$/.test(dataToValidate.endTime)) {
        return 'Invalid Start or End Time format (HH:MM).';
      }
      try {
        const startDateTime = DateTime.fromISO(`1970-01-01T${dataToValidate.startTime}`, { zone: 'local' });
        const endDateTime = DateTime.fromISO(`1970-01-01T${dataToValidate.endTime}`, { zone: 'local' });
        if (!startDateTime.isValid || !endDateTime.isValid || endDateTime <= startDateTime) {
          return 'End Time must be after Start Time.';
        }
      } catch (e) { return 'Error validating time inputs.'; }
      if (dataToValidate.lunchBreak === 'Yes' && !/^\d{2}:\d{2}$/.test(dataToValidate.lunchDuration)) {
          return 'Invalid Lunch Duration format (HH:MM).';
      }
      if (parseFloat(dataToValidate.totalHours) > 16) {
        return 'Total hours seem high (> 16). Please verify.';
      }
      if (parseFloat(dataToValidate.totalHours) <= 0 && dataToValidate.startTime && dataToValidate.endTime) {
        return 'Total hours cannot be zero or less for a work entry. Check times/lunch.';
      }
      if (employerSettings?.timesheetAreNotesRequired && !dataToValidate.notes.trim()) return 'Work Notes are required.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearCheckStatus());
    dispatch(clearCreateStatus());
    dispatch(clearUpdateStatus());
    setError(null);

    let finalFormData = { ...formData }; // Create a mutable copy for this submission
    try {
        const calculatedHoursValue = calculateHoursPure(finalFormData);
        finalFormData.totalHours = calculatedHoursValue; // Update the copy
    } catch (calcError) {
        setError(calcError.message);
        dispatch(setAlert(calcError.message, 'danger'));
        return;
    }

    const validationError = validateForm(finalFormData); // Validate the copy

    if (validationError) {
      setError(validationError);
      dispatch(setAlert(validationError, 'danger')); // Ensure 'danger' for blocking errors
      return;
    }

    try {
      if (!isEditing) {
        const checkAction = await dispatch(checkTimesheetExists({
          employee: finalFormData.employeeId,
          date: finalFormData.date
        })).unwrap();
        if (checkAction.exists) {
          dispatch(setAlert('A timesheet for this employee on this date already exists.', 'warning'));
          setError('A timesheet for this employee on this date already exists.');
          return;
        }
      }

      const localTimeToUtcISO = (timeStr) => {
        if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr) || !finalFormData.date || !/^\d{4}-\d{2}-\d{2}$/.test(finalFormData.date)) return null;
        let conversionTimezone = finalFormData.timezone;
        if (!conversionTimezone || !DateTime.local().setZone(conversionTimezone).isValid) {
            conversionTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        try {
          const localDT = DateTime.fromISO(`${finalFormData.date}T${timeStr}`, { zone: conversionTimezone });
          if (!localDT.isValid) throw new Error(`Invalid local time parse: ${finalFormData.date}T${timeStr}`);
          return localDT.toUTC().toISO();
        } catch (err) { throw new Error(`UTC Conversion Error: ${err.message}`); }
      };

      const currentIsLeaveSelected = finalFormData.leaveType !== 'None';
      const startTimeUTC = !currentIsLeaveSelected ? localTimeToUtcISO(finalFormData.startTime) : null;
      const endTimeUTC = !currentIsLeaveSelected ? localTimeToUtcISO(finalFormData.endTime) : null;

      // Explicitly check if start/end times are null for work entries after conversion
      // This guards against potential issues in time conversion or validation bypass
      if (!currentIsLeaveSelected && (!startTimeUTC || !endTimeUTC)) {
          setError("Start and End times are required for work entries.");
          dispatch(setAlert("Start and End times are required for work entries.", "warning"));
          return; // Stop submission
      }

      if (!currentIsLeaveSelected && (finalFormData.startTime && !startTimeUTC || finalFormData.endTime && !endTimeUTC)) {
          setError("Failed to convert start or end time for saving. Check date/time inputs and timezone.");
          dispatch(setAlert("Failed to convert start or end time. Check inputs.", "danger"));
          return;
      }

      const timezoneToSend = finalFormData.timezone && DateTime.local().setZone(finalFormData.timezone).isValid
                             ? finalFormData.timezone
                             : Intl.DateTimeFormat().resolvedOptions().timeZone;

      const requestData = {
        employeeId: finalFormData.employeeId,
        clientId: !currentIsLeaveSelected ? (finalFormData.clientId || null) : null,
        projectId: !currentIsLeaveSelected ? (finalFormData.projectId || null) : null,
        date: finalFormData.date,
        startTime: startTimeUTC,
        endTime: endTimeUTC,
        lunchBreak: !currentIsLeaveSelected ? finalFormData.lunchBreak : 'No',
        lunchDuration: !currentIsLeaveSelected && finalFormData.lunchBreak === 'Yes' ? finalFormData.lunchDuration : '00:30',
        leaveType: finalFormData.leaveType,
        description: currentIsLeaveSelected ? finalFormData.description : "",
        notes: !currentIsLeaveSelected ? finalFormData.notes : "",
        hourlyWage: parseFloat(finalFormData.hourlyWage) || 0,
        totalHours: finalFormData.totalHours, // Use the totalHours from finalFormData
        timezone: timezoneToSend,
      };

      if (isEditing) {
        await dispatch(updateTimesheet({ id: timesheetIdForEdit, timesheetData: requestData })).unwrap();
        dispatch(setAlert('Timesheet updated successfully!', 'success'));
      } else {
        await dispatch(createTimesheet(requestData)).unwrap();
        dispatch(setAlert('Timesheet created successfully!', 'success'));
      }

      const finalNavClientId = clientIdFromUrl || preselectedClientId || timesheetToEdit?.clientId?._id || timesheetToEdit?.clientId;
      const finalNavProjectId = projectIdFromUrl || preselectedProjectId || timesheetToEdit?.projectId?._id || timesheetToEdit?.projectId;

      if (source === 'projectTimesheet' && finalNavClientId && finalNavProjectId) {
          navigate(`/clients/view/${finalNavClientId}/project/${finalNavProjectId}`);
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
    const finalNavClientId = clientIdFromUrl || preselectedClientId || timesheetToEdit?.clientId?._id || timesheetToEdit?.clientId;
    const finalNavProjectId = projectIdFromUrl || preselectedProjectId || timesheetToEdit?.projectId?._id || timesheetToEdit?.projectId;

    if (source === 'projectTimesheet' && finalNavClientId && finalNavProjectId) {
        navigate(`/clients/view/${finalNavClientId}/project/${finalNavProjectId}`);
    } else {
        navigate('/timesheet');
    }
  };

  const isProjectLoading = projectStatus === 'loading';

  const clientName = useMemo(() => {
    const targetClientId = clientIdFromUrl || preselectedClientId;
    return clients.find(c => c._id === targetClientId)?.name || (targetClientId ? 'Loading Client...' : 'N/A');
  }, [clients, clientIdFromUrl, preselectedClientId]);

  const projectName = useMemo(() => {
    const targetProjectId = projectIdFromUrl || preselectedProjectId;
    return allProjects.find(p => p._id === targetProjectId)?.name || (targetProjectId ? 'Loading Project...' : 'N/A');
  }, [allProjects, projectIdFromUrl, preselectedProjectId]);

  return (
    <div className='vehicles-page'> {/* Consider renaming class if not generic */}
      <Alert />
      <div className='vehicles-header'> {/* Consider renaming class */}
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
              {source !== 'projectTimesheet' && (
                <>
                  <div className='form-group'>
                    <label htmlFor='clientId'>
                      <FontAwesomeIcon icon={faBuilding} /> Client
                      {!isLeaveSelected && employerSettings?.timesheetIsProjectClientRequired && '*'}
                    </label>
                    <select id='clientId' name='clientId' value={formData.clientId || ''} onChange={handleChange} disabled={isLoading}>
                      <option value=''>-- Select Client --</option>
                      {clients.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
                    </select>
                  </div>
                  <div className='form-group'>
                    <label htmlFor='projectId'>
                      <FontAwesomeIcon icon={faProjectDiagram} /> Project
                      {/* Project might be considered required if a client is selected and the main setting is true */}
                      {/* For simplicity, we'll just mark it if the main setting is true and a client is selected */}
                      {!isLeaveSelected && employerSettings?.timesheetIsProjectClientRequired && formData.clientId && '*'}
                    </label>
                    <select id='projectId' name='projectId' value={formData.projectId || ''} onChange={handleChange} disabled={isLoading || isProjectLoading || !formData.clientId}>
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

        <div className='form-actions-bar'>
  <button type='button' className='form-action-button form-action-button--cancel' onClick={handleCancel} disabled={isLoading}>
    <FontAwesomeIcon icon={faTimes} /> Cancel
  </button>
  <button type='submit' className='form-action-button form-action-button--submit' disabled={isLoading || (projectStatus === 'loading' && !isLeaveSelected)}>
    {isLoading ? (<><FontAwesomeIcon icon={faSpinner} spin /> Saving...</>) : (<><FontAwesomeIcon icon={isEditing ? faPen : faSave} /> {isEditing ? 'Update Timesheet' : 'Save Timesheet'}</>)}
  </button>
</div>

        </form>
      </div>
    </div>
  );
};

export default CreateTimesheet;
