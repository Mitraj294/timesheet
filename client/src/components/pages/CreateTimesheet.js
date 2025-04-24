import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { connect } from 'react-redux'; // Keep connect for Redux
import { getEmployees } from '../../redux/actions/employeeActions';
import { getClients } from '../../redux/actions/clientActions';
import { getProjects } from '../../redux/actions/projectActions';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faSave,
  faTimes,
  faSpinner,
  faExclamationCircle,
  faClock, // Use a relevant icon for timesheet
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/EmployeeForms.scss'; // Import shared form styles
import { DateTime } from 'luxon';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const CreateTimesheet = ({
  employees,
  clients,
  projects,
  getEmployees,
  getClients,
  getProjects,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const timesheetToEdit = location.state?.timesheet; // Get potential timesheet data for editing
  const isEditing = Boolean(timesheetToEdit?._id); // Determine edit mode

  const [formData, setFormData] = useState({
    employeeId: '',
    clientId: '',
    projectId: '',
    date: '',
    startTime: '',
    endTime: '',
    lunchBreak: 'No',
    lunchDuration: '00:00',
    leaveType: 'None',
    description: '',
    hourlyWage: '',
    totalHours: 0,
    notes: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Set initial timezone
  });

  const [isLoading, setIsLoading] = useState(false); // Loading state for submission
  const [error, setError] = useState(null); // Error state for validation/submission
  const [filteredProjects, setFilteredProjects] = useState([]); // State for projects filtered by client

  const isLeaveSelected = [
    'Annual',
    'Public Holiday',
    'Paid',
    'Sick',
    'Unpaid',
  ].includes(formData.leaveType);

  // Fetch initial data
  useEffect(() => {
    getEmployees();
    getClients();
  }, [getEmployees, getClients]);

  // Fetch projects when clientId changes
  useEffect(() => {
    if (formData.clientId) {
      getProjects(formData.clientId); // Assuming getProjects fetches by client ID
    } else {
      setFilteredProjects([]); // Clear projects if no client selected
    }
  }, [formData.clientId, getProjects]);

  // Update filtered projects when the main projects list or clientId changes
  useEffect(() => {
    if (formData.clientId && projects.length > 0) {
      setFilteredProjects(
        projects.filter((p) =>
          typeof p.clientId === 'object'
            ? p.clientId._id === formData.clientId
            : p.clientId === formData.clientId
        )
      );
    } else {
      setFilteredProjects([]);
    }
  }, [projects, formData.clientId]);


  // Pre-fill form if editing
  useEffect(() => {
    if (timesheetToEdit) {
      console.log('Editing timesheet:', timesheetToEdit);

      const toLocalTime = (isoStr) => {
        return isoStr
          ? DateTime.fromISO(isoStr, { zone: 'utc' }).toLocal().toFormat('HH:mm')
          : '';
      };

      setFormData({
        employeeId: timesheetToEdit.employeeId?._id || '',
        clientId: timesheetToEdit.clientId?._id || '',
        projectId: timesheetToEdit.projectId?._id || '',
        date: timesheetToEdit.date ? DateTime.fromISO(timesheetToEdit.date).toFormat('yyyy-MM-dd') : '', // Format date correctly
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
      });

      // Recalculate hours based on pre-filled times
      calculateHours({
        startTime: toLocalTime(timesheetToEdit.startTime),
        endTime: toLocalTime(timesheetToEdit.endTime),
        lunchBreak: timesheetToEdit.lunchBreak || 'No',
        lunchDuration: timesheetToEdit.lunchDuration || '00:00'
      });
    } else {
        // Set default date for new entries
        setFormData(prev => ({ ...prev, date: DateTime.now().toFormat('yyyy-MM-dd') }));
    }
  }, [timesheetToEdit]);

  const calculateHours = (currentFormData = formData) => {
    const { startTime, endTime, lunchBreak, lunchDuration } = currentFormData;

    if (!startTime || !endTime || isLeaveSelected) {
      setFormData((prev) => ({ ...prev, totalHours: 0 })); // Reset hours if times missing or leave selected
      return;
    }

    try {
        // Use Luxon for robust time difference calculation
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
            totalHours: total > 0 ? parseFloat(total.toFixed(2)) : 0, // Ensure it's a number
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
        notes: isLeave ? '' : formData.notes, // Clear notes if leave selected
        description: !isLeave ? '' : formData.description, // Clear description if not leave
      };
       // Recalculate hours when leave type changes
      calculateHours(updatedFormData);
    }

    setFormData(updatedFormData);

    // Recalculate hours if time or lunch inputs change
    if (['startTime', 'endTime', 'lunchBreak', 'lunchDuration'].includes(name)) {
      calculateHours(updatedFormData);
    }
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
      if (parseFloat(formData.totalHours) > 9) {
        return 'Total working hours cannot exceed 9 hours.';
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

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
            // Optionally navigate to edit, but showing error might be better UX first
            // navigate('/timesheet/create', { state: { timesheet: checkRes.data.timesheet } });
            setIsLoading(false);
            return;
          }
        } catch (checkErr) {
          // Log error but allow submission attempt to proceed if check fails
          console.error('Error checking for duplicate timesheet:', checkErr);
          // setError('Could not verify existing timesheets. Proceeding with submission attempt.');
        }
      }

      // Prepare payload, ensuring IDs are strings and handling leave case
      const requestData = {
        ...formData,
        clientId: isLeaveSelected ? null : String(formData.clientId),
        projectId: isLeaveSelected ? null : String(formData.projectId),
        description: isLeaveSelected ? formData.description : '', // Ensure description is empty if not leave
        notes: !isLeaveSelected ? formData.notes : '', // Ensure notes are empty if leave
        totalHours: parseFloat(formData.totalHours) || 0, // Ensure totalHours is a number
        hourlyWage: parseFloat(formData.hourlyWage) || 0, // Ensure wage is a number
      };

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

    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} timesheet:`, error.response || error);
      setError(
        error?.response?.data?.message ||
        `Failed to ${isEditing ? 'update' : 'create'} timesheet. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='form-page-container'>
      <div className='form-header'>
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
          {error && (
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error}
            </div>
          )}

          <div className='form-group'>
            <label htmlFor='employeeId'>Employee*</label>
            <select
              id='employeeId'
              name='employeeId'
              value={formData.employeeId}
              onChange={handleChange}
              required
              disabled={isEditing || isLoading}
            >
              <option value=''>-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className='form-group'>
            <label htmlFor='date'>Date*</label>
            <input
              id='date'
              type='date'
              name='date'
              value={formData.date}
              onChange={handleChange}
              required
              disabled={isEditing || isLoading}
            />
          </div>

          <div className='form-group'>
            <label htmlFor='leaveType'>Leave Type</label>
            <select
              id='leaveType'
              name='leaveType'
              value={formData.leaveType}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value='None'>None </option>
              <option value='Annual'>Annual Leave</option>
              <option value='Sick'>Sick Leave</option>
              <option value='Public Holiday'>Public Holiday</option>
              <option value='Paid'>Other Paid Leave</option>
              <option value='Unpaid'>Unpaid Leave</option>
            </select>
          </div>

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
                disabled={isLoading}
                rows='3'
              />
            </div>
          )}

          {!isLeaveSelected && (
            <>
              <div className='form-group'>
                <label htmlFor='clientId'>Client*</label>
                <select
                  id='clientId'
                  name='clientId'
                  value={formData.clientId || ''}
                  onChange={handleChange}
                  required={!isLeaveSelected}
                  disabled={isLoading}
                >
                  <option value=''>-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='form-group'>
                <label htmlFor='projectId'>Project*</label>
                <select
                  id='projectId'
                  name='projectId'
                  value={formData.projectId || ''}
                  onChange={handleChange}
                  required={!isLeaveSelected}
                  disabled={isLoading || !formData.clientId} // Disable if no client selected
                >
                  <option value=''>-- Select Project --</option>
                  {filteredProjects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                 {!formData.clientId && <small>Please select a client first.</small>}
              </div>

              <div className='form-group'>
                <label htmlFor='startTime'>Start Time*</label>
                <input
                  id='startTime'
                  type='time'
                  name='startTime'
                  value={formData.startTime}
                  onChange={handleChange}
                  step='60' // Only allow minute selection
                  required={!isLeaveSelected}
                  disabled={isLoading}
                />
              </div>

              <div className='form-group'>
                <label htmlFor='endTime'>End Time*</label>
                <input
                  id='endTime'
                  type='time'
                  name='endTime'
                  value={formData.endTime}
                  onChange={handleChange}
                  step='60'
                  required={!isLeaveSelected}
                  disabled={isLoading}
                />
              </div>

              <div className='form-group'>
                <label htmlFor='lunchBreak'>Lunch Break</label>
                <select
                  id='lunchBreak'
                  name='lunchBreak'
                  value={formData.lunchBreak}
                  onChange={handleChange}
                  disabled={isLoading}
                >
                  <option value='No'>No</option>
                  <option value='Yes'>Yes</option>
                </select>
              </div>

              {formData.lunchBreak === 'Yes' && (
                <div className='form-group'>
                  <label htmlFor='lunchDuration'>Lunch Duration (HH:MM)</label>
                  <select
                    id='lunchDuration'
                    name='lunchDuration'
                    value={formData.lunchDuration}
                    onChange={handleChange}
                    required={formData.lunchBreak === 'Yes'}
                    disabled={isLoading}
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

              <div className='form-group'>
                <label htmlFor='notes'>Work Notes</label>
                <textarea
                  id='notes'
                  name='notes'
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder='Add any work-related notes'
                  disabled={isLoading}
                  rows='3'
                />
              </div>
            </>
          )}

          <div className='form-group'>
            <label>Hourly Wage (Read-only)</label>
            <input
              type='text'
              value={formData.hourlyWage ? `$${formData.hourlyWage}` : 'N/A'}
              readOnly
              disabled
            />
          </div>

          {!isLeaveSelected && (
             <div className='form-group summary'>
                <strong>Total Hours Calculated:</strong> {formData.totalHours} hours
             </div>
          )}

          <div className='form-footer'>
            <button
              type='button'
              className='btn btn-danger'
              onClick={() => navigate('/timesheet')}
              disabled={isLoading}
            >
               <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button
              type='submit'
              className='btn btn-success'
              disabled={isLoading}
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

const mapStateToProps = (state) => ({
  employees: state.employees?.employees || [],
  clients: state.clients?.clients || [],
  projects: state.project?.projects || [], // Ensure correct path to projects
});

export default connect(mapStateToProps, {
  getEmployees,
  getClients,
  getProjects,
})(CreateTimesheet);
