import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';
import { connect } from 'react-redux';
import { getEmployees } from '../../redux/actions/employeeActions';
import { getClients } from '../../redux/actions/clientActions';
import { getProjects } from '../../redux/actions/projectActions';
import axios from 'axios';
import '../../styles/CreateTimesheet.scss';
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
    timezone: '',
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
      console.log('Editing timesheet:', timesheet);



console.log("Timesheet being edited (from backend):", timesheet);

const toLocalTime = (isoStr) => {
  return isoStr
    ? DateTime.fromISO(isoStr, { zone: 'utc' }).toLocal().toFormat('HH:mm')
    : '';
};


setFormData({
  employeeId: timesheet.employeeId?._id || '',
  clientId: timesheet.clientId?._id || '',
  projectId: timesheet.projectId?._id || '',
  date: timesheet.date || '',
  startTime: toLocalTime(timesheet.startTime),
  endTime: toLocalTime(timesheet.endTime),  
  lunchBreak: timesheet.lunchBreak || 'No',
  lunchDuration: timesheet.lunchDuration || '00:00',
  leaveType: timesheet.leaveType || 'None',
  description: timesheet.description || '',
  hourlyWage: timesheet.hourlyWage || '',
  totalHours: timesheet.totalHours || 0,
  notes: timesheet.notes || '',
  timezone: timesheet.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, // fallback
});

calculateHours({
  startTime: timesheet.startTime,
  endTime: timesheet.endTime,
  lunchBreak: timesheet.lunchBreak || 'No',
  lunchDuration: timesheet.lunchDuration || '00:00'
});

      setIsEditing(true);
    }
  }, [location.state]);
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setFormData(fd => ({ ...fd, timezone: tz }));
  }, []);
  
  
  
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
    if (name === 'date') {
      setFormData(prev => ({ ...prev, date: value }));
      return;
    }
    
    if (['startTime','endTime'].includes(name)) {
      setFormData(prev => ({ ...prev, [name]: value }));
      calculateHours({ ...formData, [name]: value });
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
  
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
  
    const start = new Date(2000, 0, 1, sh, sm);  // local time
    const end   = new Date(2000, 0, 1, eh, em);  // local time
  
    if (end <= start) {
      setFormData((prev) => ({ ...prev, totalHours: 0 }));
      return;
    }
  
    let total = (end - start) / 36e5;
  
    if (lunchBreak === 'Yes' && lunchDuration) {
      const [lh, lm] = lunchDuration.split(':').map(Number);
      total -= lh + lm / 60;
    }
  
    setFormData((prev) => ({
      ...prev,
      totalHours: total > 0 ? total.toFixed(2) : 0,
    }));
  };
  

  // Submit handler with duplicate check
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You are not logged in! Please log in first.');
      return;
    }
  
    if (!formData.employeeId || !formData.date) {
      if (!isEditing) {
        alert('Employee and Date fields are required.');
        return;
      }
    }
  
    // Disallow submission if totalHours exceed 9 and it's not a leave
    if (!isLeaveSelected && parseFloat(formData.totalHours) > 9) {
      alert('Total working hours cannot exceed 9 hours.');
      return;
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
      const [sh, sm] = formData.startTime.split(':').map(Number);
      const [eh, em] = formData.endTime.split(':').map(Number);
      if (eh < sh || (eh === sh && em <= sm)) {
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
  
      // Check for duplicates if not editing


if (!isEditing) {
  try {
    const chk = await axios.get(
      `${API_URL}/timesheets/check`, // Use API_URL here
      {
        params: {
          employee: formData.employeeId,
          date: formData.date,
          timezone: formData.timezone, // 🆕 Add timezone parameter
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
  } catch (err) {
    console.error('Error checking timesheet:', err);
    alert('There was an issue checking the timesheet. Please try again.');
  }
}

      // Payload
      const requestData = {
        ...formData,
        timezone: formData.timezone,   // ← NEW
        clientId: isLeaveSelected ? null : String(formData.clientId),
        projectId: isLeaveSelected ? null : String(formData.projectId),
      };
  
      // Create or Update
      if (isEditing) {
        try {
          await axios.put(
            `${API_URL}/timesheets/${location.state.timesheet._id}`, // Use API_URL here
            requestData,
            config
          );
          alert('Timesheet updated successfully!');
        } catch (err) {
          console.error('Error updating timesheet:', err);
          alert('Failed to update timesheet. Please try again.');
        }
      } else {
        try {
          await axios.post(
            `${API_URL}/timesheets`, // Use API_URL here
            requestData,
            config
          );
          alert('Timesheet created successfully!');
        } catch (err) {
          console.error('Error creating timesheet:', err);
          alert('Failed to create timesheet. Please try again.');
        }
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
        </Link><span> / </span><Link to='/timesheet' className='breadcrumb-link'>
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
            { "       " }
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

