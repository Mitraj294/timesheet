import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { startOfWeek, addDays, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import '../../styles/CreateRole.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faTimes,
  faPalette,
  faCalendar,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

const CreateRole = () => {
  const navigate = useNavigate();

  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [color, setColor] = useState('Blue');

  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [weekDays, setWeekDays] = useState([]);
  const [schedule, setSchedule] = useState({});

  const colors = ['Blue', 'Red', 'Green', 'Yellow', 'Purple'];

  useEffect(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Week starts on Monday
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    setWeekDays(days);
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/employees', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEmployees(res.data);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  const handleAddEmployee = (e) => {
    const empId = e.target.value;
    if (empId && !selectedEmployees.includes(empId)) {
      setSelectedEmployees([...selectedEmployees, empId]);
    }
  };

  const removeEmployee = (empId) => {
    setSelectedEmployees(selectedEmployees.filter((id) => id !== empId));
  };

  const handleTimeChange = (dayStr, type, value) => {
    setSchedule((prev) => ({
      ...prev,
      [dayStr]: {
        ...prev[dayStr],
        [type]: value,
      },
    }));
  };

  const handleSubmit = async () => {const scheduleArray = weekDays.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return {
      day: dayStr,
      startTime: schedule[dayStr]?.from || '',
      endTime: schedule[dayStr]?.to || '',
    };
  });
  

    const data = {
      roleName,
      roleDescription,
      color,
      assignedEmployees: selectedEmployees,
      schedule: scheduleArray,
    };

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/schedules/bulk', {
        schedules: schedulesArray, // <-- this should be an object with a `schedules` key
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Role created successfully!');
      navigate('/rosterpage');
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
          <button
            type="button"
            className="btn-close"
            onClick={() => navigate('/rosterpage')}
          >
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
              <option key={col} value={col}>
                {col}
              </option>
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

        {/* Weekly Schedule Grid */}
        <div className="form-group schedule-container">
          <label>
            <FontAwesomeIcon icon={faCalendar} /> Weekly Schedule
          </label>
          <div className="schedule-grid">
            <div className="grid-header-row">
              {weekDays.map((day) => (
                <div key={format(day, 'yyyy-MM-dd')} className="grid-header">
                  {format(day, 'EEE, MMM d')}
                </div>
              ))}
            </div>
            <div className="grid-body-row">
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                return (
                  <div key={dayStr} className="grid-cell">
                    <input
                      type="time"
                      value={schedule[dayStr]?.from || ''}
                      onChange={(e) => handleTimeChange(dayStr, 'from', e.target.value)}
                    />
                    <span className="to-text">to</span>
                    <input
                      type="time"
                      value={schedule[dayStr]?.to || ''}
                      onChange={(e) => handleTimeChange(dayStr, 'to', e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
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
