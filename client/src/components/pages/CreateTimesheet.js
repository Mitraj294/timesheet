import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchClients, selectAllClients } from '../../redux/slices/clientSlice';
import { fetchEmployees, selectAllEmployees } from '../../redux/slices/employeeSlice';
import {
  fetchProjects,
  clearProjects,
  selectProjectsByClientId,
  selectProjectStatus,
  selectProjectError,
  selectProjectItems
} from '../../redux/slices/projectSlice';
import axios from 'axios';
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
import { DateTime } from 'luxon';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const CreateTimesheet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const timesheetToEdit = location?.state?.timesheet;
  const isEditing = Boolean(timesheetToEdit?._id);

  const [formData, setFormData] = useState({
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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredProjects, setFilteredProjects] = useState([]);

  const employees = useSelector(selectAllEmployees);
  const clients = useSelector(selectAllClients);
  const allProjects = useSelector(selectProjectItems);
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);

  const isLeaveSelected = formData.leaveType !== 'None';

  const calculateHours = useCallback((currentFormData) => {
    const { startTime, endTime, lunchBreak, lunchDuration, leaveType } = currentFormData;
    const isLeave = leaveType !== 'None';

    const timeFormatRegex = /^\d{2}:\d{2}$/;
    if (isLeave || !startTime || !endTime || !timeFormatRegex.test(startTime) || !timeFormatRegex.test(endTime)) {
      setFormData(prev => (prev.totalHours !== 0 ? { ...prev, totalHours: 0 } : prev));
      return 0;
    }

    try {
      const baseDate = '1970-01-01';
      const startDateTime = DateTime.fromISO(`${baseDate}T${startTime}`, { zone: 'local' });
      const endDateTime = DateTime.fromISO(`${baseDate}T${endTime}`, { zone: 'local' });

      if (!startDateTime.isValid || !endDateTime.isValid || endDateTime <= startDateTime) {
        setFormData(prev => (prev.totalHours !== 0 ? { ...prev, totalHours: 0 } : prev));
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
            setError("Invalid Lunch Duration format. Please use HH:MM.");
            setFormData(prev => (prev.totalHours !== 0 ? { ...prev, totalHours: 0 } : prev));
            return 0;
        }
      }

      const totalHoursCalculated = totalMinutes > 0 ? totalMinutes / 60 : 0;
      const roundedTotalHours = parseFloat(totalHoursCalculated.toFixed(2));

      setFormData(prev => (prev.totalHours !== roundedTotalHours ? { ...prev, totalHours: roundedTotalHours } : prev));
      return roundedTotalHours;

    } catch (e) {
      setError("An error occurred while calculating hours.");
      setFormData(prev => (prev.totalHours !== 0 ? { ...prev, totalHours: 0 } : prev));
      return 0;
    }
  }, [setError]);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchClients());
  }, [dispatch]);

  useEffect(() => {
    if (formData.clientId && !isLeaveSelected) {
      dispatch(fetchProjects(formData.clientId));
    } else {
      dispatch(clearProjects());
    }
    setFormData(prev => ({ ...prev, projectId: '' }));
  }, [formData.clientId, isLeaveSelected, dispatch]);

  useEffect(() => {
    if (formData.clientId && allProjects && allProjects.length > 0) {
      const clientProjects = allProjects.filter(p => (p.clientId?._id || p.clientId) === formData.clientId);
      setFilteredProjects(clientProjects);
    } else {
      setFilteredProjects([]);
    }
  }, [allProjects, formData.clientId]);


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

      const initialFormData = {
        timezone: entryTimezone,
        employeeId: timesheetToEdit.employeeId?._id || '',
        clientId: timesheetToEdit.clientId?._id || '',
        projectId: timesheetToEdit.projectId?._id || '',
        date: timesheetToEdit.date,
        startTime: utcToLocalTimeInput(timesheetToEdit.startTime),
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

      if (initialFormData.clientId) {
          dispatch(fetchProjects(initialFormData.clientId));
      }

      setTimeout(() => calculateHours(initialFormData), 0);
    }
  }, [timesheetToEdit, calculateHours, dispatch]);


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
                    lunchDuration: '00:30', clientId: '', projectId: '', notes: '', totalHours: 0,
                };
            } else if (!isNowLeave && wasLeave) {
                updated.description = '';
            }
        } else if (name === 'lunchBreak' && value === 'No') {
            updated.lunchDuration = '00:30';
        }
        return updated;
    });
    if (error) setError(null);
  };

  useEffect(() => {
      if (formData.leaveType === 'None') {
          calculateHours(formData);
      } else {
          setFormData(prev => (prev.totalHours !== 0 ? { ...prev, totalHours: 0 } : prev));
      }
  }, [formData.startTime, formData.endTime, formData.lunchBreak, formData.lunchDuration, formData.leaveType, calculateHours]);

  const validateForm = () => {
    if (!formData.employeeId) return 'Employee is required.';
    if (!formData.date) return 'Date is required.';

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
    setError(null);

    const calculatedHoursValue = calculateHours(formData);

    if (!isLeaveSelected && parseFloat(calculatedHoursValue) <= 0) {
         if (formData.startTime && formData.endTime) {
             setError('Total Hours calculation resulted in zero or less. Check times/lunch.');
         } else {
             setError('Total Hours must be greater than zero for work entries.');
         }
         return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        setError('Authentication required. Please log in.');
        navigate('/login');
        return;
     }

    setIsLoading(true);

    try {
      const config = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

      if (!isEditing) {
        try {
          const checkRes = await axios.get(`${API_URL}/timesheets/check`, {
            params: { employee: formData.employeeId, date: formData.date },
            headers: { Authorization: `Bearer ${token}` },
          });
          if (checkRes.data.exists) {
            setError('A timesheet for this employee on this date already exists.');
            setIsLoading(false);
            return;
          }
        } catch (checkErr) {
            console.error('Error checking for duplicate timesheet:', checkErr);
        }
      }


      const localTimeToUtcISO = (timeStr) => {
        if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
        if (!formData.date) return null;

        let conversionTimezone = formData.timezone;
        if (!conversionTimezone || !DateTime.local().setZone(conversionTimezone).isValid) {
            conversionTimezone = 'UTC';
        }

        try {
          const localDT = DateTime.fromISO(`${formData.date}T${timeStr}`, { zone: conversionTimezone });
          if (!localDT.isValid) return null;
          return localDT.toUTC().toISO();
        } catch (err) { return null; }
      };

      const startTimeUTC = !isLeaveSelected ? localTimeToUtcISO(formData.startTime) : null;
      const endTimeUTC = !isLeaveSelected ? localTimeToUtcISO(formData.endTime) : null;

      if (!isLeaveSelected && (!startTimeUTC || !endTimeUTC)) {
          setError("Failed to convert start or end time for saving. Check date/time inputs.");
          setIsLoading(false);
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
        lunchDuration: !isLeaveSelected && formData.lunchBreak === 'Yes' ? formData.lunchDuration : null,
        leaveType: formData.leaveType,
        description: isLeaveSelected ? formData.description : null,
        notes: !isLeaveSelected ? formData.notes : null,
        hourlyWage: parseFloat(formData.hourlyWage) || 0,
        timezone: timezoneToSend,
      };

      if (isEditing) {
        await axios.put(`${API_URL}/timesheets/${timesheetToEdit._id}`, requestData, config);
      } else {
        await axios.post(`${API_URL}/timesheets`, requestData, config);
      }

      navigate('/timesheet');

    } catch (apiError) {
      setError(apiError?.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} timesheet.`);
      if (apiError.response?.status === 401) navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const isProjectLoading = projectStatus === 'loading';

  return (
    <div className='vehicles-page'>
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={isEditing ? faPen : faClock} />{' '}
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
          {(error || projectError) && (
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error || projectError}
            </div>
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
            <label htmlFor='leaveType'><FontAwesomeIcon icon={faSignOutAlt} /> Entry Type</label>
            <select id='leaveType' name='leaveType' value={formData.leaveType} onChange={handleChange} disabled={isLoading}>
              <option value='None'>Work Entry</option>
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
                  <label htmlFor='lunchDuration'>Lunch Duration (HH:MM)</label>
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
            <button type='button' className='btn btn-danger' onClick={() => navigate('/timesheet')} disabled={isLoading}>
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
