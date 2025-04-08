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

      const formatTime = (timeString) => {
        if (!timeString) return '00:00';
        if (timeString.includes('AM') || timeString.includes('PM')) {
          const [_, timePart, period] = timeString.split(' ');
          let [hours, minutes] = timePart.split(':').map(Number);
          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        const date = new Date(timeString);
        return `${String(date.getHours()).padStart(2, '0')}:${String(
          date.getMinutes()
        ).padStart(2, '0')}`;
      };

      setFormData({
        employeeId: timesheet.employeeId?._id || '',
        clientId: timesheet.clientId?._id || '',
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

    // Employee selection → update wage
    if (name === 'employeeId') {
      const sel = employees.find((emp) => emp._id === value);
      setFormData((prev) => ({
        ...prev,
        employeeId: value,
        hourlyWage: sel ? sel.wage || 'N/A' : 'N/A',
      }));
      return;
    }

    // Leave type selection → clear work fields
    if (name === 'leaveType') {
      const leave = ['Annual','Public Holiday','Paid','Sick','Unpaid'].includes(value);
      setFormData((prev) => ({
        ...prev,
        leaveType: value,
        startTime: leave ? '' : prev.startTime,
        endTime: leave ? '' : prev.endTime,
        lunchBreak: leave ? 'No' : prev.lunchBreak,
        lunchDuration: leave ? '00:00' : prev.lunchDuration,
        totalHours: leave ? 0 : prev.totalHours,
        clientId: leave ? '' : prev.clientId,
        projectId: leave ? '' : prev.projectId,
      }));
      return;
    }

    // Date → UTC string
    if (name === 'date') {
      const utcDate = new Date(value).toISOString().split('T')[0];
      setFormData((prev) => ({ ...prev, date: utcDate }));
      return;
    }

    // Time fields → UTC HH:MM
    if (['startTime','endTime'].includes(name)) {
      const [h,m] = value.split(':').map(Number);
      const utc = new Date(Date.UTC(1970,0,1,h,m)).toISOString().substr(11,5);
      setFormData((prev) => ({ ...prev, [name]: utc }));
      calculateHours({ ...formData, [name]: utc });
      return;
    }

    // Other fields
    setFormData((prev) => ({ ...prev, [name]: value || '' }));
    if (name === 'lunchDuration') {
      calculateHours({ ...formData, [name]: value });
    }
  };

  // Calculate total hours
  const calculateHours = (fd = formData) => {
    const { startTime, endTime, lunchBreak, lunchDuration } = fd;
    if (!startTime || !endTime) return;
    const [sh,sm] = startTime.split(':').map(Number);
    const [eh,em] = endTime.split(':').map(Number);
    const start = new Date(Date.UTC(1970,0,1,sh,sm));
    const end   = new Date(Date.UTC(1970,0,1,eh,em));
    if (end <= start) {
      setFormData((prev) => ({ ...prev, totalHours: 0 }));
      return;
    }
    let total = (end - start) / 36e5;
    if (lunchBreak==='Yes' && lunchDuration) {
      const [lh,lm] = lunchDuration.split(':').map(Number);
      total -= lh + lm/60;
    }
    setFormData((prev) => ({ ...prev, totalHours: total>0 ? total.toFixed(2) : 0 }));
  };

  // Submit handler with duplicate check
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You are not logged in! Please log in first.');
      return;
    }

    // Basic validations
    if (!formData.employeeId || !formData.date) {
      if (!isEditing) {
        alert('Employee and Date fields are required.');
        return;
      }
    }
    
    
    if (isLeaveSelected) {
      if (!formData.description) {
        alert('Please provide a leave description.');
        return;
      }
    } else {
      if (!formData.clientId || !formData.projectId) {
        alert('Please select a valid Client and Project.');
        return;
      }
      const [sh,sm] = formData.startTime.split(':').map(Number);
      const [eh,em] = formData.endTime.split(':').map(Number);
      if (eh<sh || (eh===sh && em<=sm)) {
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

      // ❗️ Prevent duplicates when creating
      if (!isEditing) {
        const chk = await axios.get(
          'http://localhost:5000/api/timesheets/check',
          {
            params: {
              employee: formData.employeeId,
              date: formData.date,
            },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (chk.data.exists) {
          alert(
            'A timesheet for this employee on that date already exists. Redirecting to edit.'
          );
          return navigate('/timesheet/create', {
            state: { timesheet: chk.data.timesheet },
          });
        }
      }

      // Build payload
      const requestData = {
        ...formData,
        clientId: isLeaveSelected ? null : String(formData.clientId),
        projectId: isLeaveSelected ? null : String(formData.projectId),
      };

      // Create or Update
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
      console.error('Error submitting timesheet:', error.response || error);
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
          <FontAwesomeIcon icon={faPen} />{' '}
          {isEditing ? 'Edit' : 'Create'} Timesheet
        </h1>
      </div>

      <div className='breadcrumb'>
        <Link to='/dashboard' className='breadcrumb-link'>
          Dashboard
        </Link>
        <span> / </span>
        <Link to='/timesheet' className='breadcrumb-link'>
          Timesheet
        </Link>
        <span> / </span>
        <span>{isEditing ? 'Edit' : 'Create'} Timesheet</span>
      </div>

      <div className='form-container'>
        <form onSubmit={handleSubmit}>
          {/* Employee */}
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
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* Client */}
          <div className='form-group'>
            <label>Client</label>
            <select
              name='clientId'
              value={formData.clientId || ''}
              onChange={handleChange}
              disabled={isLeaveSelected}
            >
              <option value=''>Select Client</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div className='form-group'>
            <label>Project</label>
            <select
              name='projectId'
              value={formData.projectId || ''}
              onChange={handleChange}
              disabled={isLeaveSelected}
            >
              <option value=''>Select Project</option>
              {projects
                .filter((p) =>
                  typeof p.clientId === 'object'
                    ? p.clientId._id === formData.clientId
                    : p.clientId === formData.clientId
                )
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Date */}
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

          {/* Time Fields */}
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

          {/* Submit / Cancel */}
          <div className='form-buttons'>
            <button type='submit' className='submit-btn'>
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