// /home/digilab/timesheet/client/src/components/pages/CreateTimesheet.js
import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

// --- UPDATED IMPORTS ---
import { fetchClients, selectAllClients } from '../../redux/slices/clientSlice';
import { fetchEmployees, selectAllEmployees } from '../../redux/slices/employeeSlice';
// Import from projectSlice instead of projectActions
import {
  fetchProjects,
  clearProjects, // Action to clear projects when client changes
  selectProjectsByClientId, // Selector to get projects for the selected client
  selectProjectStatus,
  selectProjectError
} from '../../redux/slices/projectSlice';
// Remove old project action import
// import { getProjects } from '../../redux/actions/projectActions';
// --- END UPDATED IMPORTS ---

import axios from 'axios'; // Keep axios for direct API calls if needed elsewhere
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faSave,
  faTimes,
  faSpinner,
  faExclamationCircle,
  faClock,
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

  // --- State ---
  const [formData, setFormData] = useState({
    employeeId: '',
    clientId: '',
    projectId: '',
    date: DateTime.now().toFormat('yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    lunchBreak: 'No',
    lunchDuration: '00:00',
    leaveType: 'None',
    description: '',
    hourlyWage: '',
    totalHours: 0,
    notes: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [isLoading, setIsLoading] = useState(false); // Local loading for submission
  const [error, setError] = useState(null); // Local error for form validation/submission

  // --- Selectors ---
  const employees = useSelector(selectAllEmployees);
  const clients = useSelector(selectAllClients);
  // Select projects based on the currently selected client ID in the form
  const projectsForSelectedClient = useSelector((state) =>
    selectProjectsByClientId(state, formData.clientId)
  );
  const projectStatus = useSelector(selectProjectStatus); // Get project loading status
  const projectError = useSelector(selectProjectError); // Get project fetch error

  const isLeaveSelected = [
    'Annual',
    'Public Holiday',
    'Paid',
    'Sick',
    'Unpaid',
  ].includes(formData.leaveType);

  // --- Effects ---
  // Fetch employees and clients on mount
  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchClients());
  }, [dispatch]);

  // Fetch projects when the selected client ID changes
  useEffect(() => {
    if (formData.clientId) {
      // Dispatch fetchProjects thunk with the selected clientId
      dispatch(fetchProjects(formData.clientId));
    } else {
      // Clear projects if no client is selected
      dispatch(clearProjects());
    }
    // Reset projectId when client changes
    setFormData(prev => ({ ...prev, projectId: '' }));

  }, [formData.clientId, dispatch]);

  // Populate form if editing
  useEffect(() => {
    if (timesheetToEdit) {
      console.log('Editing timesheet:', timesheetToEdit);

      const toLocalTime = (isoStr) => {
        return isoStr
          ? DateTime.fromISO(isoStr, { zone: 'utc' }).toLocal().toFormat('HH:mm')
          : '';
      };

      const initialFormData = {
        employeeId: timesheetToEdit.employeeId?._id || '',
        clientId: timesheetToEdit.clientId?._id || '',
        projectId: timesheetToEdit.projectId?._id || '',
        date: timesheetToEdit.date ? DateTime.fromISO(timesheetToEdit.date).toFormat('yyyy-MM-dd') : '',
        startTime: toLocalTime(timesheetToEdit.startTime),
        endTime: toLocalTime(timesheetToEdit.endTime),
        lunchBreak: timesheetToEdit.lunchBreak || 'No',
        lunchDuration: timesheetToEdit.lunchDuration || '00:00',
        leaveType: timesheetToEdit.leaveType || 'None',
        description: timesheetToEdit.description || '',
        hourlyWage: timesheetToEdit.hourlyWage || '',
        totalHours: timesheetToEdit.totalHours || 0,
        notes: timesheetToEdit.notes || '',
        timezone: timesheetToEdit.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      setFormData(initialFormData);
      calculateHours(initialFormData); // Recalculate hours based on loaded data
    }
  }, [timesheetToEdit]); // Only run when timesheetToEdit changes

  // --- Functions (calculateHours, handleChange, validateForm, handleSubmit) ---
  const calculateHours = (currentFormData = formData) => {
    const { startTime, endTime, lunchBreak, lunchDuration, leaveType } = currentFormData;
    const isLeave = leaveType !== 'None';

    if (!startTime || !endTime || isLeave) {
      setFormData((prev) => ({ ...prev, totalHours: 0 }));
      return;
    }

    try {
        const startDateTime = DateTime.fromISO(`1970-01-01T${startTime}:00`, { zone: 'local' });
        const endDateTime = DateTime.fromISO(`1970-01-01T${endTime}:00`, { zone: 'local' });

        if (!startDateTime.isValid || !endDateTime.isValid || endDateTime <= startDateTime) {
            setFormData((prev) => ({ ...prev, totalHours: 0 }));
            return;
        }

        let diff = endDateTime.diff(startDateTime, 'hours').toObject();
        let total = diff.hours || 0;

        if (lunchBreak === 'Yes' && lunchDuration) {
            const [lh, lm] = lunchDuration.split(':').map(Number);
            const lunchHours = lh + lm / 60;
            total -= lunchHours;
        }

        setFormData((prev) => ({
            ...prev,
            totalHours: total > 0 ? parseFloat(total.toFixed(2)) : 0,
        }));
    } catch (e) {
        console.error("Error calculating hours:", e);
        setFormData((prev) => ({ ...prev, totalHours: 0 }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updatedFormData = { ...formData, [name]: value };

    if (name === 'employeeId') {
      const selectedEmployee = employees.find((emp) => emp._id === value);
      updatedFormData.hourlyWage = selectedEmployee ? selectedEmployee.wage || '' : '';
    }

    if (name === 'leaveType') {
      const isLeave = value !== 'None';
      updatedFormData = {
        ...updatedFormData,
        startTime: isLeave ? '' : formData.startTime,
        endTime: isLeave ? '' : formData.endTime,
        lunchBreak: isLeave ? 'No' : formData.lunchBreak,
        lunchDuration: isLeave ? '00:00' : formData.lunchDuration,
        clientId: isLeave ? '' : formData.clientId,
        projectId: isLeave ? '' : formData.projectId,
        notes: isLeave ? '' : formData.notes,
        description: !isLeave ? '' : formData.description,
      };
      // If switching to leave, clear client/project and recalculate hours
      if (isLeave) {
          dispatch(clearProjects()); // Clear projects from Redux state
      }
      calculateHours(updatedFormData);
    }

    // If client changes, projectId needs to be reset (handled in useEffect for clientId)
    // If time/lunch changes, recalculate hours
    if (['startTime', 'endTime', 'lunchBreak', 'lunchDuration'].includes(name)) {
      calculateHours(updatedFormData);
    }

    setFormData(updatedFormData);
    // Clear local error on change
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.employeeId) return 'Employee is required.';
    if (!formData.date) return 'Date is required.';

    if (isLeaveSelected) {
      if (!formData.description.trim()) return 'Leave Description is required when Leave Type is selected.';
    } else {
      if (!formData.clientId) return 'Client is required for work entries.';
      if (!formData.projectId) return 'Project is required for work entries.';
      if (!formData.startTime) return 'Start Time is required for work entries.';
      if (!formData.endTime) return 'End Time is required for work entries.';
      if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
        return 'End Time must be after Start Time.';
      }
      if (parseFloat(formData.totalHours) <= 0) {
          return 'Total Hours must be greater than zero for work entries.';
      }
      if (parseFloat(formData.totalHours) > 9) { // Example validation
        return 'Total working hours cannot exceed 9 hours.';
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous local errors

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required. Please log in.');
      // navigate('/login'); // Consider redirecting
      return;
    }

    setIsLoading(true); // Start local submission loading

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      // Check for duplicates only when creating a new entry
      if (!isEditing) {
        try {
          const checkRes = await axios.get(`${API_URL}/timesheets/check`, {
            params: {
              employee: formData.employeeId,
              date: formData.date,
              timezone: formData.timezone,
            },
            headers: { Authorization: `Bearer ${token}` },
          });

          if (checkRes.data.exists) {
            setError('A timesheet for this employee on this date already exists. You can edit the existing entry.');
            setIsLoading(false);
            return;
          }
        } catch (checkErr) {
          // Log error but allow submission to proceed if check fails
          console.error('Error checking for duplicate timesheet:', checkErr);
        }
      }

      // Prepare data for API request
      const requestData = {
        ...formData,
        clientId: isLeaveSelected ? null : String(formData.clientId),
        projectId: isLeaveSelected ? null : String(formData.projectId),
        description: isLeaveSelected ? formData.description : '',
        notes: !isLeaveSelected ? formData.notes : '',
        totalHours: parseFloat(formData.totalHours) || 0,
        hourlyWage: parseFloat(formData.hourlyWage) || 0,
      };

      // Make API call to create or update
      if (isEditing) {
        await axios.put(
          `${API_URL}/timesheets/${timesheetToEdit._id}`,
          requestData,
          config
        );
      } else {
        await axios.post(
          `${API_URL}/timesheets`,
          requestData,
          config
        );
      }

      navigate('/timesheet'); // Navigate on success

    } catch (apiError) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} timesheet:`, apiError.response || apiError);
      // Set local error state based on API response
      setError(
        apiError?.response?.data?.message ||
        `Failed to ${isEditing ? 'update' : 'create'} timesheet. Please try again.`
      );
    } finally {
      setIsLoading(false); // Stop local submission loading
    }
  };


  // --- JSX ---
  const isProjectLoading = projectStatus === 'loading'; // Loading state for project dropdown

  return (
    <div className='vehicles-page'> {/* Consider renaming class */}
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={isEditing ? faPen : faClock} />{' '}
            {isEditing ? 'Edit' : 'Create'} Timesheet
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'>
              Dashboard
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/timesheet' className='breadcrumb-link'>
              Timesheet
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>
              {isEditing ? 'Edit Timesheet' : 'Create Timesheet'}
            </span>
          </div>
        </div>
      </div>

      <div className='form-container'>
        <form onSubmit={handleSubmit} className='employee-form' noValidate>
          {/* Display local form error OR project fetch error */}
          {(error || projectError) && (
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error || projectError}
            </div>
          )}

          {/* Employee Select */}
          <div className='form-group'>
            <label htmlFor='employeeId'>Employee*</label>
            <select
              id='employeeId'
              name='employeeId'
              value={formData.employeeId}
              onChange={handleChange}
              required
              disabled={isEditing || isLoading} // Disable if editing or submitting
            >
              <option value=''>-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Input */}
          <div className='form-group'>
            <label htmlFor='date'>Date*</label>
            <input
              id='date'
              type='date'
              name='date'
              value={formData.date}
              onChange={handleChange}
              required
              disabled={isEditing || isLoading} // Disable if editing or submitting
            />
          </div>

          {/* Leave Type Select */}
          <div className='form-group'>
            <label htmlFor='leaveType'>Leave Type</label>
            <select
              id='leaveType'
              name='leaveType'
              value={formData.leaveType}
              onChange={handleChange}
              disabled={isLoading} // Disable only if submitting
            >
              <option value='None'>None </option>
              <option value='Annual'>Annual Leave</option>
              <option value='Sick'>Sick Leave</option>
              <option value='Public Holiday'>Public Holiday</option>
              <option value='Paid'>Other Paid Leave</option>
              <option value='Unpaid'>Unpaid Leave</option>
            </select>
          </div>

          {/* Conditional Leave Description */}
          {isLeaveSelected && (
            <div className='form-group'>
              <label htmlFor='description'>Leave Description*</label>
              <textarea
                id='description'
                name='description'
                value={formData.description}
                onChange={handleChange}
                placeholder='Provide reason for leave'
                required={isLeaveSelected}
                disabled={isLoading} // Disable only if submitting
                rows='3'
              />
            </div>
          )}

          {/* Conditional Work Fields */}
          {!isLeaveSelected && (
            <>
              {/* Client Select */}
              <div className='form-group'>
                <label htmlFor='clientId'>Client*</label>
                <select
                  id='clientId'
                  name='clientId'
                  value={formData.clientId || ''}
                  onChange={handleChange}
                  required={!isLeaveSelected}
                  disabled={isLoading} // Disable only if submitting
                >
                  <option value=''>-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Select */}
              <div className='form-group'>
                <label htmlFor='projectId'>Project*</label>
                <select
                  id='projectId'
                  name='projectId'
                  value={formData.projectId || ''}
                  onChange={handleChange}
                  required={!isLeaveSelected}
                  // Disable if submitting, projects are loading, or no client selected
                  disabled={isLoading || isProjectLoading || !formData.clientId}
                >
                  <option value=''>
                    {isProjectLoading ? 'Loading projects...' : '-- Select Project --'}
                  </option>
                  {/* Use projects filtered by the selected client */}
                  {projectsForSelectedClient.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                 {!formData.clientId && !isProjectLoading && <small>Please select a client first.</small>}
                 {formData.clientId && !isProjectLoading && projectsForSelectedClient.length === 0 && <small>No projects found for this client.</small>}
              </div>

              {/* Start Time */}
              <div className='form-group'>
                <label htmlFor='startTime'>Start Time*</label>
                <input
                  id='startTime'
                  type='time'
                  name='startTime'
                  value={formData.startTime}
                  onChange={handleChange}
                  step='60' // 1 minute increments
                  required={!isLeaveSelected}
                  disabled={isLoading} // Disable only if submitting
                />
              </div>

              {/* End Time */}
              <div className='form-group'>
                <label htmlFor='endTime'>End Time*</label>
                <input
                  id='endTime'
                  type='time'
                  name='endTime'
                  value={formData.endTime}
                  onChange={handleChange}
                  step='60' // 1 minute increments
                  required={!isLeaveSelected}
                  disabled={isLoading} // Disable only if submitting
                />
              </div>

              {/* Lunch Break Select */}
              <div className='form-group'>
                <label htmlFor='lunchBreak'>Lunch Break</label>
                <select
                  id='lunchBreak'
                  name='lunchBreak'
                  value={formData.lunchBreak}
                  onChange={handleChange}
                  disabled={isLoading} // Disable only if submitting
                >
                  <option value='No'>No</option>
                  <option value='Yes'>Yes</option>
                </select>
              </div>

              {/* Conditional Lunch Duration */}
              {formData.lunchBreak === 'Yes' && (
                <div className='form-group'>
                  <label htmlFor='lunchDuration'>Lunch Duration (HH:MM)</label>
                  <select
                    id='lunchDuration'
                    name='lunchDuration'
                    value={formData.lunchDuration}
                    onChange={handleChange}
                    required={formData.lunchBreak === 'Yes'}
                    disabled={isLoading} // Disable only if submitting
                  >
                    <option value='00:00'>00:00</option>
                    <option value='00:15'>00:15</option>
                    <option value='00:30'>00:30</option>
                    <option value='00:45'>00:45</option>
                    <option value='01:00'>01:00</option>
                    <option value='01:30'>01:30</option>
                    <option value='02:00'>02:00</option>
                  </select>
                </div>
              )}

              {/* Work Notes */}
              <div className='form-group'>
                <label htmlFor='notes'>Work Notes</label>
                <textarea
                  id='notes'
                  name='notes'
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder='Add any work-related notes'
                  disabled={isLoading} // Disable only if submitting
                  rows='3'
                />
              </div>
            </>
          )}

          {/* Hourly Wage (Read-only) */}
          <div className='form-group'>
            <label>Hourly Wage (Read-only)</label>
            <input
              type='text'
              value={formData.hourlyWage ? `$${formData.hourlyWage}` : 'N/A'}
              readOnly
              disabled
            />
          </div>

          {/* Total Hours Calculated */}
          {!isLeaveSelected && (
             <div className='form-group summary'>
                <strong>Total Hours Calculated:</strong> {formData.totalHours} hours
             </div>
          )}

          {/* Form Footer */}
          <div className='form-footer'>
            <button
              type='button'
              className='btn btn-danger'
              onClick={() => navigate('/timesheet')}
              disabled={isLoading} // Disable only if submitting
            >
               <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button
              type='submit'
              className='btn btn-success'
              disabled={isLoading} // Disable only if submitting
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={isEditing ? faPen : faSave} />{' '}
                  {isEditing ? 'Update Timesheet' : 'Save Timesheet'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTimesheet;
