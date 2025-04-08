import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  startOfWeek,
  addWeeks,
  addDays,
  format,
  endOfWeek,
  isEqual
} from 'date-fns';
import '../../styles/RosterPage.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faPlus,
  faSyncAlt,
  faCalendar,
  faEye,
  faTrash
} from '@fortawesome/free-solid-svg-icons';

const RosterPage = () => {
  const navigate = useNavigate();

  // State for current week and fetched data
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // Modal state for assigning/editing shift
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]); // e.g., ['Mon', 'Wed']
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const initialWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const maxAllowedWeek = addWeeks(initialWeek, 1); // only allow one week ahead from current

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/employees', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmployees(res.data);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
        if (err.response?.status === 401) navigate('/login');
      }
    };
    fetchEmployees();
  }, [navigate]);

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/roles', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoles(res.data);
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      }
    };
    fetchRoles();
  }, []);

  // Fetch schedules based on current week
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `http://localhost:5000/api/schedules?weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSchedules(res.data);
      } catch (err) {
        console.error("Failed to fetch schedules:", err);
      }
    };
    fetchSchedules();
  }, [currentWeekStart]);

  const handlePrevWeek = () => setCurrentWeekStart(prev => addWeeks(prev, -1));

  const handleNextWeek = () => {
    const next = addWeeks(currentWeekStart, 1);
    if (!isEqual(currentWeekStart, maxAllowedWeek)) {
      setCurrentWeekStart(next);
    }
  };

  // Build array of 7 days in the current week
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i)
  );

  const formatTime = (dateStr) => format(new Date(dateStr), 'hh:mm a');

  const getSchedulesForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return schedules.filter(
      s => format(new Date(s.date), 'yyyy-MM-dd') === dayStr
    );
  };

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setSelectedDays([]); // reset selected days on new click
    setStartTime('');
    setEndTime('');
    setShowModal(true);
  };

  // Modal: Confirm shift assignment for selected days, with start/end times
  const handleAssignShift = async () => {
    try {
      const token = localStorage.getItem('token');
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      // Define day order
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      // Build schedules array with corrected property names
      const newSchedules = selectedDays.map(day => {
        const dayIndex = dayOrder.indexOf(day);
        const date = format(addDays(currentWeekStart, dayIndex), 'yyyy-MM-dd');
        return {
          employee: selectedEmployee._id,
          startTime: startTime, // changed from 'start'
          endTime: endTime,     // changed from 'end'
          date: date,
          // Optionally include 'role' if needed, e.g., role: someRoleId,
        };
      });
      console.log('Sending schedules:', JSON.stringify(newSchedules, null, 2));
      await axios.post('http://localhost:5000/api/schedules/bulk', newSchedules, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Clear modal state & refresh schedules
      setShowModal(false);
      setSelectedEmployee(null);
      setSelectedDays([]);
      setStartTime('');
      setEndTime('');
      const res = await axios.get(`http://localhost:5000/api/schedules?weekStart=${weekStartStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(res.data);
    } catch (err) {
      console.error("Error assigning shift:", err.response || err.message);
    }
  };
  

  return (
    <div className="roster-page">
      <header className="roster-header">
        <div className="title">
          <h2>
            <FontAwesomeIcon icon={faCalendar} /> Rosters
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard">Dashboard</Link> / <span>Rosters</span>
          </div>
        </div>
        <button className="btn btn-blue">
          <FontAwesomeIcon icon={faSyncAlt} className="icon-left" />
          Rollout Schedules to Next Week
        </button>
      </header>

      <div className="week-nav">
        <button className="btn btn-purple" onClick={handlePrevWeek}>
          <FontAwesomeIcon icon={faArrowLeft} className="icon-left" /> Prev Week
        </button>
        <h4>
          {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </h4>
        {!isEqual(currentWeekStart, maxAllowedWeek) && (
          <button className="btn btn-purple" onClick={handleNextWeek}>
            Next Week <FontAwesomeIcon icon={faArrowRight} className="icon-right" />
          </button>
        )}
      </div>

      <div className="roster-body">
        <aside className="roles-sidebar">
          <div className="sidebar-header">
            <p>Roles</p>
            <button className="btn btn-green" onClick={() => navigate('/createrole')}>
              Create <FontAwesomeIcon icon={faPlus} className="icon-right" />
            </button>
          </div>
          <div className="role-list">
            {roles.length > 0 ? (
              roles.map(role => (
                <div key={role._id} className="role-badge">
                  {role.roleName}
                </div>
              ))
            ) : (
              <p>No roles found.</p>
            )}
          </div>
        </aside>

        <section className="schedule-grid">
          <div className="grid-header-row">
            {weekDays.map(day => (
              <div key={format(day, 'yyyy-MM-dd')} className="grid-header">
                {format(day, 'EEEE, MMM d')}
              </div>
            ))}
          </div>
          <div className="grid-body">
            {weekDays.map(day => {
              const daySchedules = getSchedulesForDay(day);
              return (
                <div key={format(day, 'yyyy-MM-dd')} className="grid-cell">
                  {daySchedules.map(schedule => (
                    <div key={schedule._id} className="shift-card">
                      <p className="shift-time">
                        {formatTime(schedule.start)} - {formatTime(schedule.end)}
                      </p>
                      <p className="shift-role">{schedule.role?.roleName}</p>
                      <p className="shift-employee">{schedule.employee?.name}</p>
                      <div className="shift-actions">
                        <FontAwesomeIcon icon={faEye} className="action-icon" />
                        <FontAwesomeIcon icon={faTrash} className="action-icon" />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="employees-sidebar">
          <div className="sidebar-header">
            <p>Employees</p>
          </div>
          <div className="employee-list">
            {employees.length > 0 ? (
              employees.map(emp => (
                <button key={emp._id} className="btn btn-purple" onClick={() => handleEmployeeClick(emp)}>
                  {emp.name}
                </button>
              ))
            ) : (
              <p>No employees found.</p>
            )}
          </div>
        </aside>
      </div>

      {/* Modal for assigning shift */}
      {showModal && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h5>
              Assign Shift
              <button id="closeModal" onClick={() => setShowModal(false)}>×</button>
            </h5>
            <div>
              <p>Employee Name</p>
              <h5>{selectedEmployee.name}</h5>
            </div>
            <p>Schedules</p>
            <div className="schedule-buttons">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <button
                  key={day}
                  className={`day-btn ${selectedDays.includes(day) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedDays(prev =>
                      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                    );
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
            <div className="time-inputs">
              <label>
                Start Time:
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </label>
              <label>
                End Time:
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-green"
                disabled={selectedDays.length === 0 || !startTime || !endTime}
                onClick={handleAssignShift}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterPage;
