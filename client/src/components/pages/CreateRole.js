import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { startOfWeek, addDays, format } from 'date-fns';
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
  const { roleId } = useParams();
  const navigate = useNavigate();

  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [color, setColor] = useState('Blue');

  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [weekDays, setWeekDays] = useState([]);
  const [schedule, setSchedule] = useState({});

  // Define the list of colors. Adjust the values if you use hex codes or other color formats.
  const colors = ['Blue', 'Red', 'Green', 'Yellow', 'Purple'];

  useEffect(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    setWeekDays(days);
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/roles/${roleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data;
        setRoleName(data.roleName || '');
        setRoleDescription(data.roleDescription || '');
        setColor(data.color || 'Blue');
        setSelectedEmployees(data.assignedEmployees || []);

        // Format schedule as object for day-wise access (using day keys based on the schedule object)
        const formattedSchedule = {};
        (data.schedule || []).forEach((entry) => {
          // Here we assume entry.day is stored as a full date string.
          // If you store day keys like 'Monday', adjust accordingly.
          formattedSchedule[entry.day] = {
            from: entry.startTime || '',
            to: entry.endTime || ''
          };
        });
        setSchedule(formattedSchedule);
      } catch (err) {
        console.error('Failed to fetch role:', err);
      }
    };

    if (roleId) fetchRole();
  }, [roleId]);

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

  const handleSubmit = async () => {
    if (!roleName || !roleDescription) {
      return alert('Please fill in all required fields');
    }

    const scheduleArray = weekDays.map((day) => {
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

      // Check if a role with the same name already exists (exclude current if editing)
      const checkRes = await axios.get('http://localhost:5000/api/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const existingRole = checkRes.data.find(
        r => r.roleName.toLowerCase() === roleName.toLowerCase() && r._id !== roleId
      );

      if (existingRole) {
        // If a different role with the same name exists
        return alert('Role name already exists. Please choose a unique name.');
      }

      if (roleId) {
        // If editing an existing role
        await axios.put(`http://localhost:5000/api/roles/${roleId}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Role updated successfully!');
      } else {
        // Creating new role
        await axios.post('http://localhost:5000/api/roles', data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Role created successfully!');
      }

      navigate('/rosterpage');
    } catch (err) {
      console.error('Error submitting role:', err.response?.data || err.message);
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

        <div className="form-group schedule-container">
          <label>
            <FontAwesomeIcon icon={faCalendar} /> Schedule
          </label>
          <div className="day-wise-times">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              return (
                <div key={dayStr} className="time-row">
                  <label>{format(day, 'EEE')}</label>
                  <input
                    type="time"
                    value={schedule[dayStr]?.from || ''}
                    onChange={(e) =>
                      handleTimeChange(dayStr, 'from', e.target.value)
                    }
                  />
                  <span style={{ margin: '0 8px' }}>to</span>
                  <input
                    type="time"
                    value={schedule[dayStr]?.to || ''}
                    onChange={(e) =>
                      handleTimeChange(dayStr, 'to', e.target.value)
                    }
                  />
                </div>
              );
            })}
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
