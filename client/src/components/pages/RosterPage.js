import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import {
  startOfWeek,
  addWeeks,
  addDays,
  format,
  endOfWeek,
  isEqual,
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
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

const RosterPage = () => {
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth); // Get logged-in user
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

  // Using objects for times to allow different times per day (for modal)
  const [startTime, setStartTime] = useState({});
  const [endTime, setEndTime] = useState({});

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i)
  );
  const maxAllowedWeek = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    1
  );

  // Convert backend UTC time (stored as "HH:mm" string) plus date into a local time string.
  const formatTimeUTCtoLocal = (timeStr, dateStr) => {
    if (!timeStr || !timeStr.includes(':') || !dateStr) return '--';
    // Create a Date object in UTC using dateStr and timeStr
    const utcDate = new Date(`${dateStr}T${timeStr}:00Z`);
    return format(utcDate, 'hh:mm a'); // Formats as local time
  };

  // Convert a local time input (HH:mm) for a given date (yyyy-MM-dd) into a UTC time string (HH:mm).
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
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Employees fetched:', res.data);
        setEmployees(res.data);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
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
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Roles fetched:', res.data);
        setRoles(res.data);
      } catch (err) {
        console.error('Failed to fetch roles:', err);
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
          `http://localhost:5000/api/schedules?weekStart=${format(
            currentWeekStart,
            'yyyy-MM-dd'
          )}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Schedules fetched:', res.data);
        setSchedules(res.data);
      } catch (err) {
        console.error('Failed to fetch schedules:', err);
      }
    };
    fetchSchedules();
  }, [currentWeekStart]);

  const handlePrevWeek = () =>
    setCurrentWeekStart((prev) => addWeeks(prev, -1));
  const handleNextWeek = () => {
    const next = addWeeks(currentWeekStart, 1);
    if (!isEqual(currentWeekStart, maxAllowedWeek)) setCurrentWeekStart(next);
  };

  // Return schedules for a specific day (compared by date string)
  const getSchedulesForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return schedules.filter(
      (s) => format(new Date(s.date), 'yyyy-MM-dd') === dayStr
    );
  };

  // For roles: Compare each role's schedule entry's day with the grid day.
  const getRolesForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const rolesForDay = roles.filter(
      (role) =>
        role.schedule &&
        role.schedule.some(
          (entry) =>
            entry.day === dayStr &&
            entry.startTime &&
            entry.endTime &&
            entry.startTime.trim() !== ''
        )
    );
    return rolesForDay;
  };

  const handleDeleteScheduleFromRole = async (roleId, scheduleId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/roles/${roleId}/schedule/${scheduleId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Refresh roles after deletion
      const res = await axios.get('http://localhost:5000/api/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(res.data);
    } catch (err) {
      console.error(
        'Error deleting schedule from role:',
        err.response || err.message
      );
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this role? This action cannot be undone.'
      )
    ) {
      console.warn('Deletion canceled for role:', roleId);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/roles/${roleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Role deleted successfully:', roleId);
      setRoles((prevRoles) => prevRoles.filter((role) => role._id !== roleId));
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  const handleRolloutToNextWeek = async () => {
    try {
      const token = localStorage.getItem('token');
      const nextWeekStart = addWeeks(currentWeekStart, 1);
      const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd');
      const nextWeekEndStr = format(addDays(nextWeekStart, 6), 'yyyy-MM-dd');

      await axios.delete(
        'http://localhost:5000/api/schedules/deleteByDateRange',
        {
          data: { startDate: nextWeekStartStr, endDate: nextWeekEndStr },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await Promise.all(
        roles.map(async (role) => {
          const cleanedSchedule =
            role.schedule?.filter(
              (entry) =>
                entry.day < nextWeekStartStr || entry.day > nextWeekEndStr
            ) || [];
          await axios.put(
            `http://localhost:5000/api/roles/${role._id}`,
            {
              ...role,
              schedule: cleanedSchedule,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        })
      );

      const newEmployeeSchedules = schedules.map((sch) => {
        const dateObj = new Date(sch.date);
        const dayIndex = (dateObj.getDay() + 6) % 7;
        const nextDate = addDays(nextWeekStart, dayIndex);
        return {
          employee: sch.employee._id || sch.employee,
          role: sch.role?._id || sch.role,
          startTime: sch.startTime,
          endTime: sch.endTime,
          date: format(nextDate, 'yyyy-MM-dd'),
        };
      });

      await axios.post(
        'http://localhost:5000/api/schedules/bulk',
        newEmployeeSchedules,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await Promise.all(
        roles.map(async (role) => {
          if (!role.schedule || role.schedule.length === 0) return;
          const clonedEntries = role.schedule.map((entry) => {
            const newDay = addDays(new Date(entry.day), 7);
            return {
              day: format(newDay, 'yyyy-MM-dd'),
              startTime: entry.startTime,
              endTime: entry.endTime,
            };
          });
          const updatedRole = {
            ...role,
            assignedEmployees: role.assignedEmployees.map((emp) =>
              typeof emp === 'object' ? emp._id : emp
            ),
            schedule: [...role.schedule, ...clonedEntries],
          };
          await axios.put(
            `http://localhost:5000/api/roles/${role._id}`,
            updatedRole,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        })
      );

      const scheduleRes = await axios.get(
        `http://localhost:5000/api/schedules?weekStart=${nextWeekStartStr}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSchedules(scheduleRes.data);
      setCurrentWeekStart(nextWeekStart);

      const roleRes = await axios.get('http://localhost:5000/api/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(roleRes.data);
    } catch (err) {
      console.error('Error during rollout:', err.response?.data || err.message);
    }
  };
  // When clicking an employee, open the modal with that employee's info.
  const handleEmployeeClick = (emp) => {
    setSelectedEmployee(emp);
    setSelectedDays([]);
    setSelectedRole('');
    setStartTime({});
    setEndTime({});
    setShowModal(true);
  };

  // Confirm assignment: for each selected day, update or create a schedule.
  const handleAssignShift = async () => {
    try {
      const token = localStorage.getItem('token');
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      // For each selected day, check if a schedule for the same employee and date exists.
      // If one or more already exist, delete extras and update the remaining one.
      const schedulePromises = selectedDays.map(async (day) => {
        const index = dayOrder.indexOf(day);
        const date = format(addDays(currentWeekStart, index), 'yyyy-MM-dd');
        const utcStartTime = convertLocalTimeToUTC(startTime[day], date);
        const utcEndTime = convertLocalTimeToUTC(endTime[day], date);

        const scheduleData = {
          employee: selectedEmployee._id,
          role: selectedRole || null,
          startTime: utcStartTime,
          endTime: utcEndTime,
          date,
        };

        // Find all existing schedules for the same employee and date.
        const existingSchedules = schedules.filter(
          (s) =>
            s.employee._id === selectedEmployee._id &&
            format(new Date(s.date), 'yyyy-MM-dd') === date
        );

        if (existingSchedules.length > 0) {
          // If more than one exists, delete all but the first.
          if (existingSchedules.length > 1) {
            for (let i = 1; i < existingSchedules.length; i++) {
              await axios.delete(
                `http://localhost:5000/api/schedules/${existingSchedules[i]._id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );
            }
          }
          // Update the first existing schedule with the new data.
          return axios.put(
            `http://localhost:5000/api/schedules/${existingSchedules[0]._id}`,
            scheduleData,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        } else {
          // If no existing schedule is found, create a new one.
          return axios.post(
            'http://localhost:5000/api/schedules/bulk',
            [scheduleData],
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }
      });

      await Promise.all(schedulePromises);

      setShowModal(false);
      setSelectedEmployee(null);
      setSelectedDays([]);
      setSelectedRole('');
      setStartTime({});
      setEndTime({});

      const res = await axios.get(
        `http://localhost:5000/api/schedules?weekStart=${format(
          currentWeekStart,
          'yyyy-MM-dd'
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchedules(res.data);
    } catch (err) {
      console.error(
        'Error assigning/updating shift:',
        err.response || err.message
      );
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await axios.get(
        `http://localhost:5000/api/schedules?weekStart=${format(
          currentWeekStart,
          'yyyy-MM-dd'
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchedules(res.data);
    } catch (err) {
      console.error('Error deleting schedule:', err);
    }
  };

  return (
    <div className='roster-page'>
      <header className='roster-header'>
        <div className='title'>
          <h2>
            <FontAwesomeIcon icon={faCalendar} /> Rosters
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard'>Dashboard</Link> / <span>Rosters</span>
          </div>
        </div>

        {(isEqual(
          currentWeekStart,
          startOfWeek(new Date(), { weekStartsOn: 1 })
        ) ||
          isEqual(
            currentWeekStart,
            addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -1)
          )) &&
          user?.role === 'employer' && (
            <button
              className='btn btn-green'
              onClick={handleRolloutToNextWeek}
            >
              <FontAwesomeIcon
                icon={faSyncAlt}
                className='icon-left'
              />
              Rollout Schedules to Next Week
            </button>
          )}
      </header>

      <div className='week-nav'>
        <button
          className='btn btn-blue'
          onClick={handlePrevWeek}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Prev Week
        </button>
        <h4>
          {format(currentWeekStart, 'MMM d')} -{' '}
          {format(
            endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
            'MMM d, yyyy'
          )}
        </h4>
        {!isEqual(currentWeekStart, maxAllowedWeek) && (
          <button
            className='btn btn-blue'
            onClick={handleNextWeek}
          >
            Next Week <FontAwesomeIcon icon={faArrowRight} />
          </button>
        )}
      </div>

      <div className='roster-body'>
        {(isEqual(
          currentWeekStart,
          startOfWeek(new Date(), { weekStartsOn: 1 })
        ) ||
          isEqual(
            currentWeekStart,
            addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1)
          )) && (
          <aside className='roles-sidebar'>
            <div className='sidebar-header'>
              <p>Roles</p>
              {user?.role === 'employer' && (
                <button
                  className='btn btn-green'
                  onClick={() => navigate('/createrole')}
                >
                  Create <FontAwesomeIcon icon={faPlus} />
                </button>
              )}
            </div>
            <div className='role-list'>
              {roles.map((role) => (
                <div
                  key={role._id}
                  className={`role-card role-${
                    role.color?.toLowerCase() || 'default'
                  }`}
                >
                  <div
                    className={`role-name ${
                      user?.role === 'employer' ? 'clickable' : ''
                    }`}
                    onClick={() => {
                      if (user?.role === 'employer') {
                        navigate(`/createrole/${role._id}`);
                      }
                    }}
                  >
                    {role.roleName}
                  </div>

                  {user?.role === 'employer' && (
                    <button
                      className='delete-btn'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role._id);
                      }}
                      title='Delete Role'
                    >
                      <FontAwesomeIcon
                        icon={faTrash}
                        color='red'
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        )}

        <section className='schedule-grid'>
          <div className='grid-header-row'>
            {weekDays.map((day) => (
              <div
                key={day}
                className='grid-header'
              >
                {format(day, 'EEE, MMM d')}
              </div>
            ))}
          </div>
          <div className='grid-body'>
            {weekDays.map((day) => (
              <div
                key={day}
                className='grid-cell'
              >
                {/* Show Shift Cards */}
                {getSchedulesForDay(day).map((sch) => (
                  <div
                    key={sch._id}
                    className='shift-card'
                  >
                    <p className='shift-time'>
                      {formatTimeUTCtoLocal(sch.startTime, sch.date)} -{' '}
                      {formatTimeUTCtoLocal(sch.endTime, sch.date)}
                    </p>
                    {sch.employee && (
                      <p className='shift-employee'>{sch.employee.name}</p>
                    )}
                    {user?.role === 'employer' && (
                      <div className='shift-actions'>
                        <FontAwesomeIcon icon={faEye} />
                        <FontAwesomeIcon
                          icon={faTrash}
                          onClick={() => handleDeleteSchedule(sch._id)}
                          className='clickable-icon'
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Show Role Cards with extra details */}
                {getRolesForDay(day).map((role) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  // Find the schedule entry for this day from the role.
                  const scheduleEntry = role.schedule.find(
                    (entry) => entry.day === dayStr
                  );
                  const timeDisplay =
                    scheduleEntry &&
                    scheduleEntry.startTime &&
                    scheduleEntry.endTime
                      ? `${formatTimeUTCtoLocal(
                          scheduleEntry.startTime,
                          scheduleEntry.day
                        )} - ${formatTimeUTCtoLocal(
                          scheduleEntry.endTime,
                          scheduleEntry.day
                        )}`
                      : '-- --';

                  // Updated mapping for assigned employees:
                  const assignedEmployeeNames =
                    role.assignedEmployees && role.assignedEmployees.length > 0
                      ? role.assignedEmployees
                          .map((emp) => {
                            if (typeof emp === 'object' && emp.name) {
                              return emp.name;
                            }
                            const found = employees.find((e) => e._id === emp);
                            return found ? found.name : null;
                          })
                          .filter((name) => name)
                          .join(', ')
                      : '-- --';

                  return (
                    <div
                      key={role._id}
                      className={`role-card role-${
                        role.color?.toLowerCase() || 'default'
                      }`}
                    >
                      <p className='role-time'>{timeDisplay}</p>
                      <p className='role-name'>{role.roleName || '-- --'}</p>
                      <p className='role-employee'>
                        {assignedEmployeeNames || '-- --'}
                      </p>
                      {user?.role === 'employer' && (
                        <div className='role-actions'>
                          <FontAwesomeIcon icon={faEye} />
                          <FontAwesomeIcon
                            icon={faTrash}
                            onClick={() =>
                              scheduleEntry &&
                              handleDeleteScheduleFromRole(
                                role._id,
                                scheduleEntry._id
                              )
                            }
                            className='clickable-icon'
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>
        
        {(isEqual(
          currentWeekStart,
          startOfWeek(new Date(), { weekStartsOn: 1 })
        ) ||
          isEqual(
            currentWeekStart,
            addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1)
          )) && (
            <aside className='employees-sidebar'>
            <div className='sidebar-header'>
              <p>Employees</p>
            </div>
            <div className='employee-list'>
              {employees.map((emp) => (
                <button
                  key={emp._id}
                  className={`btn ${user?.role === "employer" ? "btn-blue" : "btn-yellow"}`} // Different styling based on role
                  onClick={() => handleEmployeeClick(emp)}
                  disabled={user?.role !== "employer"}  // Disable for non-employers
                >
                  {emp.name}
                </button>
              ))}
            </div>
          </aside>
          
        )}
      </div>

      {showModal && selectedEmployee && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            <h5>
              Assign Shift{' '}
              <button
                id='closeModal'
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </h5>
            <p>
              Employee: <strong>{selectedEmployee.name}</strong>
            </p>

            <p>Schedules</p>
            <div className='schedule-buttons'>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <button
                  key={day}
                  className={`day-btn ${
                    selectedDays.includes(day) ? 'active' : ''
                  }`}
                  onClick={() => {
                    setSelectedDays((prev) =>
                      prev.includes(day)
                        ? prev.filter((d) => d !== day)
                        : [...prev, day]
                    );
                  }}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className='day-wise-times'>
              {selectedDays.map((day) => (
                <div
                  key={day}
                  className='time-row'
                >
                  <label>{day}</label>
                  <input
                    type='time'
                    value={startTime[day] || ''}
                    onChange={(e) =>
                      setStartTime((prev) => ({
                        ...prev,
                        [day]: e.target.value,
                      }))
                    }
                  />
                  <span style={{ margin: '0 8px' }}>to</span>
                  <input
                    type='time'
                    value={endTime[day] || ''}
                    onChange={(e) =>
                      setEndTime((prev) => ({ ...prev, [day]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className='modal-footer'>
              <button
                className='btn btn-green'
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
