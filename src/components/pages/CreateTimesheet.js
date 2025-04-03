import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import { connect } from 'react-redux';
import { getEmployees } from '../../redux/actions/employeeActions';
import { getClients } from '../../redux/actions/clientActions';
import { getProjects } from '../../redux/actions/projectActions';
import axios from 'axios';
import '../../styles/CreateForms.scss';

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

  // Initial form state
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
  });

  // Edit mode flag
  const [isEditing, setIsEditing] = useState(false);

  // Determine if a leave type is selected (other than "None")
  const isLeaveSelected = [
    'Annual',
    'Public Holiday',
    'Paid',
    'Sick',
    'Unpaid',
  ].includes(formData.leaveType);

  // Fetch employees and clients on mount
  useEffect(() => {
    getEmployees();
    getClients();
  }, [getEmployees, getClients]);

  // Fetch projects when clientId changes
  useEffect(() => {
    if (formData.clientId) {
      getProjects(formData.clientId);
    }
  }, [formData.clientId, getProjects]);

  // If editing, prefill data from location.state.timesheet
  useEffect(() => {
    if (location.state?.timesheet) {
      const timesheet = location.state.timesheet;
      console.log('Timesheet Data:', timesheet);

      const formatTime = (timeString) => {
        if (!timeString) return '00:00';
        if (timeString.includes('AM') || timeString.includes('PM')) {
          const [datePart, timePart, period] = timeString.split(' ');
          let [hours, minutes] = timePart.split(':');
          hours = parseInt(hours);
          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return `${String(hours).padStart(2, '0')}:${minutes}`;
        }
        const date = new Date(timeString);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      setFormData({
        employeeId: timesheet.employeeId?._id || '',
        clientId: timesheet.clientId?._id || '', // in case clientId is an object
        projectId: timesheet.projectId?._id || '',
        date: timesheet.date
          ? new Date(timesheet.date).toISOString().split('T')[0]
          : '',
        startTime: formatTime(timesheet.startTime),
        endTime: formatTime(timesheet.endTime),
        lunchBreak: timesheet.lunchBreak || 'No',
        lunchDuration: timesheet.lunchDuration || '00:00',
        leaveType: timesheet.leaveType || 'None',
        description: timesheet.description || '',
        hourlyWage: timesheet.hourlyWage || '',
        totalHours: timesheet.totalHours || 0,
        notes: timesheet.notes || '',
      });
      setIsEditing(true);
    }
  }, [location.state]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    // For employee selection, update hourly wage accordingly
    if (name === 'employeeId') {
      const selectedEmp = employees.find((emp) => emp._id === value);
      setFormData((prev) => ({
        ...prev,
        employeeId: value,
        hourlyWage: selectedEmp ? selectedEmp.wage || 'N/A' : 'N/A',
      }));
      return;
    }

    // For leave type selection, clear work-related fields if leave is selected
    if (name === 'leaveType') {
      const isLeave = [
        'Annual',
        'Public Holiday',
        'Paid',
        'Sick',
        'Unpaid',
      ].includes(value);
      setFormData((prev) => ({
        ...prev,
        leaveType: value,
        startTime: isLeave ? '' : prev.startTime,
        endTime: isLeave ? '' : prev.endTime,
        lunchBreak: isLeave ? 'No' : prev.lunchBreak,
        lunchDuration: isLeave ? '00:00' : prev.lunchDuration,
        totalHours: isLeave ? 0 : prev.totalHours,
        // Keep empty string in state to avoid select warnings
        clientId: isLeave ? '' : prev.clientId,
        projectId: isLeave ? '' : prev.projectId,
      }));
      return;
    }

    // For date, convert to UTC date string (YYYY-MM-DD)
    if (name === 'date') {
      const utcDate = new Date(value).toISOString().split('T')[0];
      setFormData((prev) => ({ ...prev, date: utcDate }));
      return;
    }

    // For time fields, convert to UTC time string (HH:MM)
    if (['startTime', 'endTime'].includes(name)) {
      const [hours, minutes] = value.split(':').map(Number);
      const utcTime = new Date(Date.UTC(1970, 0, 1, hours, minutes));
      const formattedTime = utcTime.toISOString().split('T')[1].slice(0, 5);
      setFormData((prev) => ({
        ...prev,
        [name]: formattedTime,
      }));
      calculateHours({ ...formData, [name]: formattedTime });
      return;
    }

    // For all other fields, update state normally
    setFormData((prev) => ({ ...prev, [name]: value || '' }));

    // Recalculate total hours if lunch duration changes
    if (name === 'lunchDuration') {
      calculateHours({ ...formData, [name]: value });
    }
  };

  // Calculate total hours: difference between start and end minus lunch duration (if applicable)
  const calculateHours = (updatedForm = formData) => {
    const { startTime, endTime, lunchBreak, lunchDuration } = updatedForm;
    if (startTime && endTime) {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      const start = new Date(Date.UTC(1970, 0, 1, startHour, startMinute));
      const end = new Date(Date.UTC(1970, 0, 1, endHour, endMinute));
      if (end <= start) {
        setFormData((prev) => ({ ...prev, totalHours: 0 }));
        return;
      }
      let total = (end - start) / (1000 * 60 * 60);
      if (lunchBreak === 'Yes' && lunchDuration) {
        const [lunchH, lunchM] = lunchDuration.split(':').map(Number);
        total -= lunchH + lunchM / 60;
      }
      setFormData((prev) => ({
        ...prev,
        totalHours: total > 0 ? total.toFixed(2) : 0,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You are not logged in! Please log in first.');
      return;
    }

    // Always require Employee and Date
    if (!formData.employeeId || !formData.date) {
      alert('Employee and Date fields are required.');
      return;
    }

    // If it's a leave entry, require a description
    if (isLeaveSelected) {
      if (!formData.description) {
        alert('Please provide a leave description.');
        return;
      }
    } else {
      // For work timesheets, require Client & Project
      if (!formData.clientId || !formData.projectId) {
        alert('Please select a valid Client and Project.');
        return;
      }

      // Ensure startTime is before endTime
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const [endHour, endMin] = formData.endTime.split(':').map(Number);
      if (
        endHour < startHour ||
        (endHour === startHour && endMin <= startMin)
      ) {
        alert('Start Time must be before End Time.');
        return;
      }
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      // Build request payload:
      // For leave entries, send null for clientId and projectId; otherwise, send them as strings.
      const requestData = {
        ...formData,
        clientId: isLeaveSelected ? null : String(formData.clientId),
        projectId: isLeaveSelected ? null : String(formData.projectId),
      };

      if (isEditing) {
        await axios.put(
          `http://localhost:5000/api/timesheets/${location.state.timesheet._id}`,
          requestData,
          config
        );
        alert('Timesheet updated successfully!');
      } else {
        await axios.post(
          'http://localhost:5000/api/timesheets',
          requestData,
          config
        );
        alert('Timesheet created successfully!');
      }
      navigate('/timesheet');
    } catch (error) {
      console.error(
        'Error submitting timesheet:',
        error.response?.data || error.message
      );
      alert(
        error?.response?.data?.message ||
          'Failed to submit timesheet. Please try again.'
      );
    }
  };

  return (
    <div className='create-timesheet-container'>
      <div className='timesheet-header'>
        <h1>
          <FontAwesomeIcon icon={faPen} /> {isEditing ? 'Edit' : 'Create'}{' '}
          Timesheet
        </h1>
      </div>

      <div className='breadcrumb'>
        <Link
          to='/dashboard'
          className='breadcrumb-link'
        >
          Dashboard
        </Link>
        <span> / </span>
        <Link
          to='/timesheet'
          className='breadcrumb-link'
        >
          Timesheet
        </Link>
        <span> / </span>
        <span>{isEditing ? 'Edit' : 'Create'} Timesheet</span>
      </div>

      <div className='form-container'>
        <form onSubmit={handleSubmit}>
          {/* Employee Field */}
          <div className='form-group'>
            <label>Employee</label>
            <select
              name='employeeId'
              value={formData.employeeId}
              onChange={handleChange}
              required
              disabled={isEditing}
            >
              <option value=''>Select Employee</option>
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <option
                    key={emp._id}
                    value={emp._id}
                  >
                    {emp.name}
                  </option>
                ))
              ) : (
                <option>No Employees Found</option>
              )}
            </select>
          </div>

          {/* Client Field */}
          <div className='form-group'>
            <label>Client</label>
            <select
              name='clientId'
              value={formData.clientId || ''}
              onChange={handleChange}
              disabled={isLeaveSelected}
            >
              <option value=''>Select Client</option>
              {clients.length > 0 ? (
                clients.map((client) => (
                  <option
                    key={client._id}
                    value={client._id}
                  >
                    {client.name}
                  </option>
                ))
              ) : (
                <option>No Clients Found</option>
              )}
            </select>
          </div>

          {/* Project Field */}
          <div className='form-group'>
            <label>Project</label>
            <select
              name='projectId'
              value={formData.projectId || ''}
              onChange={handleChange}
              disabled={isLeaveSelected}
            >
              <option value=''>Select Project</option>
              {projects.length > 0 ? (
                projects
                  .filter((project) => {
                    if (
                      project.clientId &&
                      typeof project.clientId === 'object'
                    ) {
                      return project.clientId._id === formData.clientId;
                    }
                    return project.clientId === formData.clientId;
                  })
                  .map((project) => (
                    <option
                      key={project._id}
                      value={project._id}
                    >
                      {project.name}
                    </option>
                  ))
              ) : (
                <option>No Projects Found</option>
              )}
            </select>
          </div>

          {/* Date Field */}
          <div className='form-group'>
            <label>Date</label>
            <input
              type='date'
              name='date'
              value={formData.date}
              onChange={handleChange}
              required
              disabled={isEditing}
            />
          </div>

          {/* Time Fields (hidden when leave is selected) */}
          {!isLeaveSelected && (
            <>
              <div className='form-group'>
                <label>Start Time</label>
                <input
                  type='time'
                  name='startTime'
                  value={formData.startTime}
                  onChange={handleChange}
                  step='60'
                  required
                />
              </div>
              <div className='form-group'>
                <label>End Time</label>
                <input
                  type='time'
                  name='endTime'
                  value={formData.endTime}
                  onChange={handleChange}
                  step='60'
                  required
                />
              </div>
            </>
          )}

          {/* Lunch Break */}
          {!isLeaveSelected && (
            <div className='form-group'>
              <label>Lunch Break</label>
              <select
                name='lunchBreak'
                value={formData.lunchBreak}
                onChange={handleChange}
              >
                <option value='No'>No</option>
                <option value='Yes'>Yes</option>
              </select>
            </div>
          )}

          {formData.lunchBreak === 'Yes' && !isLeaveSelected && (
            <div className='form-group'>
              <label>Lunch Break Duration (HH:MM)</label>
              <select
                name='lunchDuration'
                value={formData.lunchDuration}
                onChange={handleChange}
                required
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

          {/* Leave Type */}
          <div className='form-group'>
            <label>Leave Type</label>
            <select
              name='leaveType'
              value={formData.leaveType}
              onChange={handleChange}
            >
              <option value='None'>None</option>
              <option value='Annual'>Annual</option>
              <option value='Sick'>Sick</option>
              <option value='Public Holiday'>Public Holiday</option>
              <option value='Paid'>Paid</option>
              <option value='Unpaid'>Unpaid</option>
            </select>
          </div>

          {/* Leave Description */}
          {formData.leaveType !== 'None' && (
            <div className='form-group'>
              <label>Leave Description</label>
              <textarea
                name='description'
                value={formData.description}
                onChange={handleChange}
                placeholder='Provide reason for leave'
                required
              />
            </div>
          )}

          {/* Notes */}
          <div className='form-group'>
            <label>Notes</label>
            <textarea
              name='notes'
              value={formData.notes}
              onChange={handleChange}
              placeholder='Add any work-related notes'
              disabled={formData.leaveType !== 'None'}
            />
          </div>

          {/* Hourly Wage */}
          <div className='form-group'>
            <label>Hourly Wage</label>
            <input
              type='text'
              name='hourlyWage'
              value={formData.hourlyWage}
              readOnly
            />
          </div>

          {/* Total Hours */}
          <div className='summary'>
            <strong>Total Hours Worked:</strong> {formData.totalHours} hours
          </div>

          {/* Submit and Cancel Buttons */}
          <div className='form-buttons'>
            <button
              type='submit'
              className='submit-btn'
            >
              <FontAwesomeIcon icon={faSave} />{' '}
              {isEditing ? 'Save Changes' : 'Save Timesheet'}
            </button>
            <button
              type='button'
              className='cancel-btn'
              onClick={() => navigate('/timesheet')}
            >
              <FontAwesomeIcon icon={faTimes} /> Cancel
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
  projects: state.project?.projects || [],
});

export default connect(mapStateToProps, {
  getEmployees,
  getClients,
  getProjects,
})(CreateTimesheet);
