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
import { DateTime } from 'luxon';
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
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedDays, setSelectedDays] = useState([]); // e.g., ['Mon', 'Wed']

  // Using objects for times to allow different times per day
  const [startTime, setStartTime] = useState({});
  const [endTime, setEndTime] = useState({});

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const maxAllowedWeek = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);

  // Convert backend UTC time (stored as "HH:mm") plus date into a local time string.
  const formatTimeUTCtoLocal = (timeStr, dateStr) => {
    if (!timeStr || !timeStr.includes(':') || !dateStr) return '--';
    // Create a date-time in UTC using dateStr and timeStr
    const utcDate = new Date(`${dateStr}T${timeStr}:00Z`);
    return format(utcDate, 'hh:mm a'); // date-fns' format will output in local time
  };

  // Function to convert a local time input (HH:mm) for a given date (yyyy-MM-dd) into UTC (HH:mm)
  const convertLocalTimeToUTC = (localTimeStr, dateStr) => {
    if (!localTimeStr || !dateStr) return '00:00';
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = localTimeStr.split(':').map(Number);
    const localDateTime = DateTime.fromObject(
      { year, month, day, hour, minute },
      { zone: 'local' }
    );
    return localDateTime.toUTC().toFormat('HH:mm');
  };

  // Fetch Employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/employees', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Employees fetched:", res.data);
        setEmployees(res.data);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
        if (err.response?.status === 401) navigate('/login');
      }
    };
    fetchEmployees();
  }, [navigate]);

  // Fetch Roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/roles', {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Roles fetched:", res.data);
        setRoles(res.data);
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      }
    };
    fetchRoles();
  }, []);

  // Fetch Schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `http://localhost:5000/api/schedules?weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Schedules fetched:', res.data);
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
    if (!isEqual(currentWeekStart, maxAllowedWeek)) setCurrentWeekStart(next);
  };

  const getSchedulesForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return schedules.filter(s => format(new Date(s.date), 'yyyy-MM-dd') === dayStr);
  };

  // Define getRolesForDay to filter roles based on the day.
  const getRolesForDay = (day) => {
    const weekdayName = format(day, 'EEEE'); // e.g., "Monday", "Tuesday"
    const rolesForDay = roles.filter(role => role.schedule && role.schedule[weekdayName]);
    console.log(`Roles for ${weekdayName}:`, rolesForDay);
    return rolesForDay;
  };

  // When clicking an employee, open the modal with that employee's information.
  const handleEmployeeClick = (emp) => {
    setSelectedEmployee(emp);
    setSelectedDays([]);
    setSelectedRole('');
    setStartTime({});
    setEndTime({});
    setShowModal(true);
  };

  // Confirm assignment: For each selected day, check if a schedule exists.
  // If it exists, update it. Otherwise, create a new schedule.
  const handleAssignShift = async () => {
    try {
      const token = localStorage.getItem('token');
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      // Create promises for each selected day
      const schedulePromises = selectedDays.map(async (day) => {
        const index = dayOrder.indexOf(day);
        const date = format(addDays(currentWeekStart, index), 'yyyy-MM-dd');
        const utcStartTime = convertLocalTimeToUTC(startTime[day], date);
        const utcEndTime = convertLocalTimeToUTC(endTime[day], date);

        // Find if there is already a schedule for this employee on this date
        const existing = schedules.find(s =>
          s.employee._id === selectedEmployee._id &&
          format(new Date(s.date), 'yyyy-MM-dd') === date
        );

        const scheduleData = {
          employee: selectedEmployee._id,
          role: selectedRole || null,
          startTime: utcStartTime,
          endTime: utcEndTime,
          date
        };

        if (existing) {
          // Update existing schedule
          return axios.put(`http://localhost:5000/api/schedules/${existing._id}`, scheduleData, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } else {
          // Create new schedule
          return axios.post('http://localhost:5000/api/schedules', scheduleData, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      });

      await Promise.all(schedulePromises);

      // Reset modal and reload schedules
      setShowModal(false);
      setSelectedEmployee(null);
      setSelectedDays([]);
      setSelectedRole('');
      setStartTime({});
      setEndTime({});

      const res = await axios.get(
        `http://localhost:5000/api/schedules?weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchedules(res.data);
    } catch (err) {
      console.error("Error assigning/updating shift:", err.response || err.message);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Re-fetch schedules after deleting
      const res = await axios.get(
        `http://localhost:5000/api/schedules?weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchedules(res.data);
    } catch (err) {
      console.error('Error deleting schedule:', err);
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
        <button className="btn btn-green">
          <FontAwesomeIcon icon={faSyncAlt} className="icon-left" />
          Rollout Schedules to Next Week
        </button>
      </header>

      <div className="week-nav">
        <button className="btn btn-blue" onClick={handlePrevWeek}>
          <FontAwesomeIcon icon={faArrowLeft} /> Prev Week
        </button>
        <h4>
          {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </h4>
        {!isEqual(currentWeekStart, maxAllowedWeek) && (
          <button className="btn btn-blue" onClick={handleNextWeek}>
            Next Week <FontAwesomeIcon icon={faArrowRight} />
          </button>
        )}
      </div>

      <div className="roster-body">
        <aside className="roles-sidebar">
          <div className="sidebar-header">
            <p>Roles</p>
            <button className="btn btn-green" onClick={() => navigate('/createrole')}>
              Create <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
          <div className="role-list">
            {roles.map(role => (
              <button
                key={role._id}
                className="role-badge"
                onClick={() => navigate(`/createrole/${role._id}`)}
                style={{ backgroundColor: role.color }}
              >
                {role.roleName}
              </button>
            ))}
          </div>
        </aside>

        <section className="schedule-grid">
          <div className="grid-header-row">
            {weekDays.map(day => (
              <div key={day} className="grid-header">
                {format(day, 'EEE, MMM d')}
              </div>
            ))}
          </div>
          <div className="grid-body">
            {weekDays.map(day => (
              <div key={day} className="grid-cell">
                {/* Show Schedules */}
                {getSchedulesForDay(day).map(sch => (
                  <div key={sch._id} className="shift-card">
                    <p className="shift-time">
                      {formatTimeUTCtoLocal(sch.startTime, sch.date)} - {formatTimeUTCtoLocal(sch.endTime, sch.date)}
                    </p>
                    {sch.employee && <p className="shift-employee">{sch.employee.name}</p>}
                    <div className="shift-actions">
                      <FontAwesomeIcon icon={faEye} />
                      <FontAwesomeIcon
                        icon={faTrash}
                        onClick={() => handleDeleteSchedule(sch._id)}
                        className="clickable-icon"
                      />
                    </div>
                  </div>
                ))}

                {/* Show Role Cards on the grid */}
                {getRolesForDay(day).map(role => (
                  <div
                    key={role._id}
                    className={`role-card role-${role.color.toLowerCase()}`}
                  >
                    <p className="role-name">{role.roleName}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <aside className="employees-sidebar">
          <div className="sidebar-header">
            <p>Employees</p>
          </div>
          <div className="employee-list">
            {employees.map(emp => (
              <button
                key={emp._id}
                className="btn btn-yellow"
                onClick={() => handleEmployeeClick(emp)}
              >
                {emp.name}
              </button>
            ))}
          </div>
        </aside>
      </div>

      {showModal && selectedEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h5>
              Assign Shift <button id="closeModal" onClick={() => setShowModal(false)}>×</button>
            </h5>
            <p>Employee: <strong>{selectedEmployee.name}</strong></p>

            <p>Schedules</p>
            <div className="schedule-buttons">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <button
                  key={day}
                  className={`day-btn ${selectedDays.includes(day) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedDays(prev =>
                      prev.includes(day)
                        ? prev.filter(d => d !== day)
                        : [...prev, day]
                    );
                  }}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="day-wise-times">
              {selectedDays.map(day => (
                <div key={day} className="time-row">
                  <label>{day}</label>
                  <input
                    type="time"
                    value={startTime[day] || ''}
                    onChange={(e) =>
                      setStartTime(prev => ({ ...prev, [day]: e.target.value }))
                    }
                  />
                  <span style={{ margin: '0 8px' }}>to</span>
                  <input
                    type="time"
                    value={endTime[day] || ''}
                    onChange={(e) =>
                      setEndTime(prev => ({ ...prev, [day]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-green"
                disabled={selectedDays.length === 0}
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
