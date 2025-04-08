import React, { useState, useEffect } from 'react';
import axios from 'axios';

import '../../styles/CreateRole.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faTimes,
  faPalette,
  faCalendar,
  faXmark,
  faClock
} from '@fortawesome/free-solid-svg-icons';

const CreateRole = ({ onClose = () => {} }) => {
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [color, setColor] = useState('Blue');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedDays, setSelectedDays] = useState([]);
  const [schedule, setSchedule] = useState({});

  const colors = ['Blue', 'Red', 'Green', 'Yellow', 'Purple'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/employees', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setEmployees(res.data);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    };

    fetchEmployees();
  }, []);

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );

    if (!schedule[day]) {
      setSchedule((prev) => ({
        ...prev,
        [day]: { from: '', to: '' },
      }));
    }
  };

  const handleTimeChange = (day, type, value) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value,
      },
    }));
  };

  const handleAddEmployee = (e) => {
    const empId = e.target.value;
    if (empId && !selectedEmployees.includes(empId)) {
      setSelectedEmployees([...selectedEmployees, empId]);
    }
  };

  const removeEmployee = (empId) => {
    setSelectedEmployees(selectedEmployees.filter((id) => id !== empId));
  };

  const handleSubmit = async () => {
    const data = {
      roleName,
      roleDescription,
      color,
      assignedEmployees: selectedEmployees,
      schedule: selectedDays.map((day) => ({
        day,
        from: schedule[day]?.from || '',
        to: schedule[day]?.to || '',
      })),
    };
  
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/roles', data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Role created successfully!');
      onClose(); 
    } catch (err) {
      console.error('Error creating role:', err.response?.data || err.message);
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal-box create-role">
        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faUser} /> Create/Assign New Role
          </h2>
          <button type="button" className="btn-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="form-group">
          <label>Role Name*</label>
          <input
            type="text"
            className="input"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Enter role name"
          />
        </div>

        <div className="form-group">
          <label>Role Description*</label>
          <textarea
            className="input"
            rows="3"
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            placeholder="Enter description"
          />
        </div>

        <div className="form-group">
          <label>
            <FontAwesomeIcon icon={faPalette} /> Color*
          </label>
          <select
            className="dropdown"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          >
            {colors.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Employees*</label>
          <div className="custom-multiselect">
            <div className="selected-tags">
              {selectedEmployees.map((empId) => {
                const emp = employees.find((e) => e._id === empId);
                return (
                  <span key={empId} className="tag">
                    {emp?.name}
                    <FontAwesomeIcon
                      icon={faXmark}
                      className="remove-icon"
                      onClick={() => removeEmployee(empId)}
                    />
                  </span>
                );
              })}
            </div>
            <select onChange={handleAddEmployee} className="dropdown">
              <option value="">Select Employee</option>
              {employees
                .filter((e) => !selectedEmployees.includes(e._id))
                .map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>
            <FontAwesomeIcon icon={faCalendar} /> Schedules
          </label>
          <div className="day-buttons">
            {days.map((day) => (
              <button
                key={day}
                type="button"
                className={`day-btn ${selectedDays.includes(day) ? 'active' : ''}`}
                onClick={() => toggleDay(day)}
              >
                {day}
              </button>
            ))}
          </div>

          <div className="schedule-grid">
            {days.map((day) => (
              <div
                key={day}
                className="schedule-row"
                style={{
                  opacity: selectedDays.includes(day) ? 1 : 0.3,
                  pointerEvents: selectedDays.includes(day) ? 'auto' : 'none',
                }}
              >
                <span className="day-label">{day}</span>
                <div className="time-inputs">
                  <input
                    type="time"
                    value={schedule[day]?.from || ''}
                    onChange={(e) => handleTimeChange(day, 'from', e.target.value)}
                  />
                  <span className="to-text">to</span>
                  <input
                    type="time"
                    value={schedule[day]?.to || ''}
                    onChange={(e) => handleTimeChange(day, 'to', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-footer">
          <button className="btn btn-primary" onClick={handleSubmit}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRole;
