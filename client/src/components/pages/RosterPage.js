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

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// --- Helper Components (Optional but recommended for clarity) ---

const ShiftCard = ({ schedule, formatTime, userRole, onDelete }) => (
    <div key={schedule._id} className='shift-card'>
        <p className='shift-time'>
            {formatTime(schedule.startTime, schedule.date)} -{' '}
            {formatTime(schedule.endTime, schedule.date)}
        </p>
        {schedule.employee && (
            <p className='shift-employee'>{schedule.employee.name}</p>
        )}
        {userRole === 'employer' && (
            <div className='shift-actions'>
                <FontAwesomeIcon icon={faEye} className="action-icon view" title="View Details (Not Implemented)" />
                <FontAwesomeIcon
                    icon={faTrash}
                    onClick={() => onDelete(schedule._id)}
                    className='action-icon delete'
                    title="Delete Shift"
                />
            </div>
        )}
    </div>
);

const RoleCard = ({ role, scheduleEntry, formatTime, assignedEmployeeNames, userRole, onDelete }) => (
    <div
        key={role._id + (scheduleEntry ? scheduleEntry.day : '')} // More specific key
        className={`role-card role-${role.color?.toLowerCase() || 'default'}`}
    >
        <p className='role-time'>
            {scheduleEntry && scheduleEntry.startTime && scheduleEntry.endTime
                ? `${formatTime(scheduleEntry.startTime, scheduleEntry.day)} - ${formatTime(scheduleEntry.endTime, scheduleEntry.day)}`
                : 'Time not set'}
        </p>
        <p className='role-name'>{role.roleName || 'Unnamed Role'}</p>
        <p className='role-employee'>
            Assigned: {assignedEmployeeNames || 'None'}
        </p>
        {userRole === 'employer' && scheduleEntry && ( // Only show delete if there's a schedule entry for this day
            <div className='role-actions'>
                 <FontAwesomeIcon icon={faEye} className="action-icon view" title="View Details (Not Implemented)" />
                 <FontAwesomeIcon
                    icon={faTrash}
                    onClick={() => onDelete(role._id, scheduleEntry._id)}
                    className='action-icon delete'
                    title="Delete Role Schedule Entry"
                 />
            </div>
        )}
    </div>
);


// --- Main Component ---
const RosterPage = () => {
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  // Removed selectedRole state from here as it wasn't used in the modal logic provided
  const [selectedDays, setSelectedDays] = useState([]);

  const [startTime, setStartTime] = useState({});
  const [endTime, setEndTime] = useState({});

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(currentWeekStart, i)
  );
  const maxAllowedWeek = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    1
  );

  // --- Time Formatting Functions ---
  const formatTimeUTCtoLocal = (timeStr, dateStr) => {
    // Added check for invalid time string format early
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':') || !dateStr) return '--:--';
    try {
        // Use Luxon for more robust parsing and formatting
        const utcDateTime = DateTime.fromISO(`${dateStr}T${timeStr}:00Z`, { zone: 'utc' });
        if (!utcDateTime.isValid) return '--:--';
        return utcDateTime.toLocal().toFormat('hh:mm a');
    } catch (error) {
        console.error("Error formatting UTC time to local:", error);
        return '--:--';
    }
  };

  const convertLocalTimeToUTC = (localTimeStr, dateStr) => {
    if (!localTimeStr || !dateStr) return '00:00'; // Keep default or handle error
    try {
        const localDateTime = DateTime.fromISO(`${dateStr}T${localTimeStr}`, { zone: 'local' });
         if (!localDateTime.isValid) return '00:00'; // Handle invalid input
        return localDateTime.toUTC().toFormat('HH:mm');
    } catch (error) {
         console.error("Error converting local time to UTC:", error);
         return '00:00'; // Fallback on error
    }
  };

  // --- Data Fetching Effects ---
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; } // Added token check
        const res = await axios.get(`${API_URL}/employees`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // console.log('Employees fetched:', res.data);
        setEmployees(res.data);
      } catch (err) {
        console.error('Failed to fetch employees:', err);
        if (err.response?.status === 401 || err.response?.status === 403) navigate('/login');
      }
    };
    fetchEmployees();
  }, [navigate]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('token');
         if (!token) { return; } // No need to navigate again if employees failed
        const res = await axios.get(`${API_URL}/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // console.log('Roles fetched:', res.data);
        setRoles(res.data);
      } catch (err) {
        console.error('Failed to fetch roles:', err);
         // Optionally handle 401/403 here too if needed independently
      }
    };
    fetchRoles();
  }, []); // Removed navigate dependency as it's handled in employees fetch

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { return; }
        const res = await axios.get(
          `${API_URL}/schedules?weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        // console.log('Schedules fetched:', res.data);
        setSchedules(res.data);
      } catch (err) {
        console.error('Failed to fetch schedules:', err);
         // Optionally handle 401/403 here too
      }
    };
    fetchSchedules();
  }, [currentWeekStart]); // Removed navigate dependency

  // --- Event Handlers ---
  const handlePrevWeek = () =>
    setCurrentWeekStart((prev) => addWeeks(prev, -1));

  const handleNextWeek = () => {
    // Use date-fns isBefore or isEqual for comparison
    const nextWeek = addWeeks(currentWeekStart, 1);
    // Allow going to maxAllowedWeek, but not beyond
    if (!isEqual(currentWeekStart, maxAllowedWeek)) {
        setCurrentWeekStart(nextWeek);
    }
  };

  const getSchedulesForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    // Ensure s.date is valid before formatting
    return schedules.filter(
      (s) => s.date && format(DateTime.fromISO(s.date).toJSDate(), 'yyyy-MM-dd') === dayStr
    );
  };

  const getRolesForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return roles.filter(
      (role) =>
        role.schedule &&
        role.schedule.some(
          (entry) =>
            entry.day === dayStr &&
            entry.startTime && // Check if times exist
            entry.endTime &&
            entry.startTime.trim() !== '' && // Check if times are not just empty strings
            entry.endTime.trim() !== ''
        )
    );
  };

  const handleDeleteScheduleFromRole = async (roleId, scheduleEntryId) => { // Renamed scheduleId to scheduleEntryId for clarity
    if (!scheduleEntryId) {
        console.error("Cannot delete role schedule entry without an ID.");
        return;
    }
     if (!window.confirm('Are you sure you want to remove this role schedule entry for this day?')) {
        return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }

      await axios.delete(
        `${API_URL}/roles/${roleId}/schedule/${scheduleEntryId}`, // Use scheduleEntryId
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Refetch roles to update the UI
      const res = await axios.get(`${API_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(res.data);
    } catch (err) {
      console.error(
        'Error deleting schedule entry from role:',
        err.response?.data?.message || err.message
      );
      // Add user feedback here (e.g., toast notification)
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this ENTIRE role and ALL its associated schedules? This action cannot be undone.'
      )
    ) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
       if (!token) { navigate('/login'); return; }

      await axios.delete(`${API_URL}/roles/${roleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // console.log('Role deleted successfully:', roleId);
      setRoles((prevRoles) => prevRoles.filter((role) => role._id !== roleId));
       // Optionally refetch schedules if deleting a role might affect them elsewhere
    } catch (error) {
      console.error('Failed to delete role:', error.response?.data?.message || error.message);
       // Add user feedback
    }
  };

  const handleRolloutToNextWeek = async () => {
     if (!window.confirm('This will DELETE all schedules in the next week and copy the current week\'s schedule. Are you sure?')) {
        return;
    }
    try {
      const token = localStorage.getItem('token');
       if (!token) { navigate('/login'); return; }
      const nextWeekStart = addWeeks(currentWeekStart, 1);
      const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd');
      const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 }); // Use endOfWeek for clarity
      const nextWeekEndStr = format(nextWeekEnd, 'yyyy-MM-dd');

      console.log(`Rolling out schedule from week starting ${format(currentWeekStart, 'yyyy-MM-dd')} to week starting ${nextWeekStartStr}`);

      // 1. Delete existing schedules in the *next* week range
      console.log(`Deleting schedules from ${nextWeekStartStr} to ${nextWeekEndStr}`);
      await axios.delete(
        `${API_URL}/schedules/deleteByDateRange`,
        {
          data: { startDate: nextWeekStartStr, endDate: nextWeekEndStr },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

       // 2. Delete role schedule entries *only within the next week* before cloning
       console.log(`Cleaning role schedule entries for the week starting ${nextWeekStartStr}`);
       await Promise.all(
         roles.map(async (role) => {
           const scheduleEntriesToDelete = role.schedule?.filter(entry =>
             entry.day >= nextWeekStartStr && entry.day <= nextWeekEndStr
           ) || [];

           if (scheduleEntriesToDelete.length > 0) {
             console.log(`Deleting ${scheduleEntriesToDelete.length} schedule entries for role ${role.roleName} in the next week.`);
             // Assuming a bulk delete endpoint exists or deleting one by one
             // This might require a backend change for efficiency.
             // For now, let's assume we delete them before adding new ones.
             // A safer approach might be to fetch the role, filter, and PUT back.
             const currentEntries = role.schedule?.filter(entry =>
                entry.day < nextWeekStartStr || entry.day > nextWeekEndStr
             ) || [];
              await axios.put(
                `${API_URL}/roles/${role._id}`,
                { ...role, schedule: currentEntries }, // Send only necessary fields
                { headers: { Authorization: `Bearer ${token}` } }
             );
           }
         })
       );


      // 3. Create new employee schedules for the next week based on the current week
      console.log(`Cloning employee schedules to the next week`);
      const newEmployeeSchedules = schedules
        .map((sch) => {
            try {
                const dateObj = DateTime.fromISO(sch.date).toJSDate(); // Use Luxon for parsing
                const dayIndex = (dateObj.getDay() + 6) % 7; // Monday is 0
                const nextDate = addDays(nextWeekStart, dayIndex);
                // Ensure essential fields exist
                if (!sch.employee?._id || !sch.startTime || !sch.endTime) {
                    console.warn("Skipping schedule clone due to missing data:", sch);
                    return null;
                }
                return {
                    employee: sch.employee._id,
                    role: sch.role?._id || null, // Handle optional role
                    startTime: sch.startTime,
                    endTime: sch.endTime,
                    date: format(nextDate, 'yyyy-MM-dd'),
                };
            } catch(e) {
                console.error("Error processing schedule for cloning:", sch, e);
                return null;
            }
        })
        .filter(Boolean); // Filter out any nulls from errors

      if (newEmployeeSchedules.length > 0) {
        await axios.post(
          `${API_URL}/schedules/bulk`,
          newEmployeeSchedules,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
          console.log("No valid employee schedules found in the current week to clone.");
      }

      // 4. Clone role schedule entries to the next week
      console.log(`Cloning role schedule entries to the next week`);
      await Promise.all(
        roles.map(async (role) => {
          // Filter current week's entries to clone
          const currentWeekEntries = role.schedule?.filter(entry =>
              entry.day >= format(currentWeekStart, 'yyyy-MM-dd') &&
              entry.day <= format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd') &&
              entry.startTime && entry.endTime // Ensure times exist
          ) || [];

          if (currentWeekEntries.length === 0) return; // Nothing to clone for this role

          const clonedEntries = currentWeekEntries.map((entry) => {
            const newDay = addDays(DateTime.fromISO(entry.day).toJSDate(), 7); // Use Luxon for parsing
            return {
              day: format(newDay, 'yyyy-MM-dd'),
              startTime: entry.startTime,
              endTime: entry.endTime,
            };
          });

          // Fetch the role again to get the latest state before updating
          const currentRoleStateRes = await axios.get(`${API_URL}/roles/${role._id}`, { headers: { Authorization: `Bearer ${token}` } });
          const existingSchedule = currentRoleStateRes.data.schedule || [];


          const updatedSchedule = [...existingSchedule, ...clonedEntries];

          // Prepare payload, ensuring assignedEmployees are IDs
           const assignedEmployeeIds = (currentRoleStateRes.data.assignedEmployees || []).map(emp =>
             typeof emp === 'object' ? emp._id : emp
           );

          const updatePayload = {
            // Only include fields that might change or are required
            roleName: currentRoleStateRes.data.roleName,
            color: currentRoleStateRes.data.color,
            assignedEmployees: assignedEmployeeIds,
            schedule: updatedSchedule,
          };


          await axios.put(
            `${API_URL}/roles/${role._id}`,
            updatePayload,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        })
      );

      // 5. Refetch data for the new week and update state
      console.log("Rollout complete. Fetching updated data...");
      const [scheduleRes, roleRes] = await Promise.all([
          axios.get(`${API_URL}/schedules?weekStart=${nextWeekStartStr}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/roles`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setSchedules(scheduleRes.data);
      setRoles(roleRes.data);
      setCurrentWeekStart(nextWeekStart); // Move to the next week view

      // Add success feedback
      alert("Schedule successfully rolled out to the next week!");

    } catch (err) {
      console.error('Error during rollout:', err.response?.data || err.message, err);
      // Add error feedback
       alert(`Error during rollout: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleEmployeeClick = (emp) => {
    setSelectedEmployee(emp);
    setSelectedDays([]);
    // Reset times for the new modal instance
    setStartTime({});
    setEndTime({});
    setShowModal(true);
  };

  const handleAssignShift = async () => {
    if (selectedDays.length === 0) {
        alert("Please select at least one day.");
        return;
    }
     if (!selectedEmployee) return; // Should not happen if modal is open, but good check

    // Basic validation: Check if start/end times are provided for selected days
    for (const day of selectedDays) {
        if (!startTime[day] || !endTime[day]) {
            alert(`Please enter both start and end times for ${day}.`);
            return;
        }
         if (startTime[day] >= endTime[day]) {
             alert(`End time must be after start time for ${day}.`);
             return;
         }
    }


    try {
      const token = localStorage.getItem('token');
       if (!token) { navigate('/login'); return; }
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      const schedulePayloads = selectedDays.map((day) => {
        const index = dayOrder.indexOf(day);
        const date = format(addDays(currentWeekStart, index), 'yyyy-MM-dd');
        const utcStartTime = convertLocalTimeToUTC(startTime[day], date);
        const utcEndTime = convertLocalTimeToUTC(endTime[day], date);

        return {
          employee: selectedEmployee._id,
          // role: selectedRole || null, // Role selection wasn't in the modal, assuming direct employee schedule
          startTime: utcStartTime,
          endTime: utcEndTime,
          date,
        };
      });

       // Use the bulk endpoint for simplicity, assuming it handles create/update
       // If not, you'd need the logic to check existing and decide PUT/POST per day
       await axios.post(
         `${API_URL}/schedules/bulk`, // Use bulk endpoint
         schedulePayloads,
         { headers: { Authorization: `Bearer ${token}` } }
       );


      // Close modal and reset state
      setShowModal(false);
      setSelectedEmployee(null);
      setSelectedDays([]);
      setStartTime({});
      setEndTime({});

      // Refetch schedules for the current week
      const res = await axios.get(
        `${API_URL}/schedules?weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchedules(res.data);
      // Add success feedback

    } catch (err) {
      console.error('Error assigning/updating shift:', err.response?.data?.message || err.message);
      // Add error feedback
       alert(`Error assigning shift: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
     if (!window.confirm('Are you sure you want to delete this shift?')) {
        return;
    }
    try {
      const token = localStorage.getItem('token');
       if (!token) { navigate('/login'); return; }

      await axios.delete(`${API_URL}/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Refetch schedules
      const res = await axios.get(
        `${API_URL}/schedules?weekStart=${format(currentWeekStart, 'yyyy-MM-dd')}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSchedules(res.data);
      // Add success feedback
    } catch (err) {
      console.error('Error deleting schedule:', err.response?.data?.message || err.message);
      // Add error feedback
    }
  };

  // --- Helper to get assigned employee names for Role Card ---
   const getAssignedEmployeeNames = (role) => {
     if (!role.assignedEmployees || role.assignedEmployees.length === 0) {
       return 'None';
     }
     return role.assignedEmployees
       .map((emp) => {
         // Handle both populated objects and plain IDs
         if (typeof emp === 'object' && emp?.name) {
           return emp.name;
         }
         // Find name from the main employees list if it's just an ID
         const found = employees.find((e) => e._id === emp);
         return found ? found.name : null; // Return null if ID not found
       })
       .filter(Boolean) // Remove any nulls if IDs weren't found
       .join(', ') || 'None'; // Fallback if all lookups fail
   };


  // --- Render Logic ---
  const canShowSidebars = isEqual(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ||
                          isEqual(currentWeekStart, addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1));

  const canRollout = (isEqual(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ||
                     isEqual(currentWeekStart, addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -1))) && // Can rollout from current or previous week
                     user?.role === 'employer';


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

        {canRollout && (
            <button
              className='btn btn-green'
              onClick={handleRolloutToNextWeek}
              title={`Copy schedule from ${format(currentWeekStart, 'MMM d')} week to ${format(addWeeks(currentWeekStart, 1), 'MMM d')} week`}
            >
              <FontAwesomeIcon
                icon={faSyncAlt}
                className='icon-left'
              />
              Rollout to Next Week
            </button>
          )}
      </header>

      {/* --- Week Navigation --- */}
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
        {/* Allow navigating to the max week, disable button if already there */}
         <button
            className='btn btn-blue'
            onClick={handleNextWeek}
            disabled={isEqual(currentWeekStart, maxAllowedWeek)} // Disable if on the max allowed week
          >
            Next Week <FontAwesomeIcon icon={faArrowRight} />
          </button>
      </div>

      {/* --- Roster Body (Sidebars + Grid) --- */}
      <div className='roster-body'>
        {/* Roles Sidebar */}
        {canShowSidebars && (
          <aside className='roles-sidebar'>
            <div className='sidebar-header'>
              <p>Roles</p>
              {user?.role === 'employer' && (
                <button
                  className='btn btn-green'
                  onClick={() => navigate('/createrole')}
                  title="Create a new role"
                >
                  Create <FontAwesomeIcon icon={faPlus} />
                </button>
              )}
            </div>
            <div className='role-list'>
              {roles.length > 0 ? roles.map((role) => (
                <div
                  key={role._id}
                  className={`role-card role-${
                    role.color?.toLowerCase() || 'default'
                  }`} // Applies base role-card styles + color modifier
                >
                  <div
                    className={`role-name ${ // Keep role-name class for specific styling if needed
                      user?.role === 'employer' ? 'clickable' : ''
                    }`}
                    onClick={() => {
                      if (user?.role === 'employer') {
                        navigate(`/createrole/${role._id}`);
                      }
                    }}
                     title={user?.role === 'employer' ? "Edit Role" : ""}
                  >
                    {role.roleName}
                  </div>

                  {user?.role === 'employer' && (
                    <button
                      className='delete-btn' // Specific class for the delete button within the sidebar role card
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the navigate onClick
                        handleDeleteRole(role._id);
                      }}
                      title='Delete Role Permanently'
                    >
                      <FontAwesomeIcon
                        icon={faTrash}
                        // color='red' // Color is handled by .delete-btn CSS
                      />
                    </button>
                  )}
                </div>
              )) : <p>No roles created yet.</p>}
            </div>
          </aside>
        )}

        {/* Schedule Grid */}
        <div className="schedule-wrapper">
            <div className="schedule-grid">
                {/* Horizontal Header Row (Hidden on small screens via CSS) */}
                <div className='grid-header-row'>
                    {weekDays.map((day) => (
                        <div key={day.toISOString()} className='grid-header'>
                            {format(day, 'EEE, MMM d')}
                        </div>
                    ))}
                </div>

                {/* Grid Body (Adapts to vertical layout via CSS) */}
                <div className='grid-body'>
                    {weekDays.map((day) => {
                        const daySchedules = getSchedulesForDay(day);
                        const dayRoles = getRolesForDay(day);
                        const dayStr = format(day, 'yyyy-MM-dd'); // Get day string once

                        return (
                            <React.Fragment key={day.toISOString()}> {/* Use Fragment to group vertical header + cell */}
                                {/* Vertical Header (Shown on small screens via CSS) */}
                                <div className='vertical-grid-header'>
                                    {format(day, 'EEE, MMM d')}
                                </div>

                                {/* Grid Cell Content */}
                                <div className='grid-cell'>
                                    {/* Render Employee Shifts */}
                                    {daySchedules.map((sch) => (
                                        <ShiftCard
                                            key={sch._id}
                                            schedule={sch}
                                            formatTime={formatTimeUTCtoLocal}
                                            userRole={user?.role}
                                            onDelete={handleDeleteSchedule}
                                        />
                                    ))}

                                    {/* Render Role Schedules */}
                                    {dayRoles.map((role) => {
                                        const scheduleEntry = role.schedule.find(
                                            (entry) => entry.day === dayStr && entry.startTime && entry.endTime
                                        );
                                        // Ensure scheduleEntry exists before rendering RoleCard for this day
                                        if (!scheduleEntry) return null;

                                        const assignedNames = getAssignedEmployeeNames(role);

                                        return (
                                            <RoleCard
                                                key={role._id + scheduleEntry._id} // More specific key
                                                role={role}
                                                scheduleEntry={scheduleEntry}
                                                formatTime={formatTimeUTCtoLocal}
                                                assignedEmployeeNames={assignedNames}
                                                userRole={user?.role}
                                                onDelete={handleDeleteScheduleFromRole}
                                            />
                                        );
                                    })}

                                    {/* Message for empty cells */}
                                    {daySchedules.length === 0 && dayRoles.length === 0 && (
                                        <p style={{ textAlign: 'center', color: '#999', fontSize: '0.9em', marginTop: '1rem' }}>
                                            No shifts or roles scheduled.
                                        </p>
                                    )}
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>


        {/* Employees Sidebar */}
         {canShowSidebars && (
            <aside className='employees-sidebar'>
            <div className='sidebar-header'>
              <p>Assign Shifts</p> {/* Changed header text */}
            </div>
            <div className='employee-list'>
              {employees.length > 0 ? employees.map((emp) => (
                <button
                  key={emp._id}
                  // Use btn-yellow for employee buttons to distinguish from nav/action buttons
                  className={`btn btn-yellow`}
                  onClick={() => user?.role === "employer" && handleEmployeeClick(emp)} // Only call handler if employer
                  disabled={user?.role !== "employer"} // Disable button visually and functionally
                   title={user?.role === "employer" ? `Assign shift for ${emp.name}` : "Only employers can assign shifts"}
                >
                  {emp.name}
                </button>
              )) : <p>No employees found.</p>}
            </div>
          </aside>
        )}
      </div>

      {/* --- Assign Shift Modal --- */}
      {showModal && selectedEmployee && (
        <div className='modal-overlay' onClick={() => setShowModal(false)}> {/* Close on overlay click */}
          <div className='modal-content' onClick={e => e.stopPropagation()}> {/* Prevent closing when clicking inside modal */}
            <h5>
              Assign Shift for {selectedEmployee.name}
              <button
                id='closeModal'
                onClick={() => setShowModal(false)}
                title="Close"
              >
                &times; {/* Use &times; for closing 'X' */}
              </button>
            </h5>
             {/* Removed static Employee name paragraph as it's in the title */}

            <p>Select day(s) and enter times:</p>
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
                        : [...prev, day].sort((a, b) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(a) - ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(b)) // Keep days sorted
                    );
                  }}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Only show time inputs if at least one day is selected */}
            {selectedDays.length > 0 && (
                <div className='day-wise-times'>
                {selectedDays.map((day) => (
                    <div
                    key={day}
                    className='time-row'
                    >
                    <label htmlFor={`start-time-${day}`}>{day}</label>
                    <input
                        id={`start-time-${day}`}
                        type='time'
                        value={startTime[day] || ''}
                        onChange={(e) =>
                        setStartTime((prev) => ({
                            ...prev,
                            [day]: e.target.value,
                        }))
                        }
                        required // Add basic HTML5 validation
                    />
                    <span style={{ margin: '0 8px' }}>to</span>
                    <input
                         id={`end-time-${day}`}
                        type='time'
                        value={endTime[day] || ''}
                        onChange={(e) =>
                        setEndTime((prev) => ({ ...prev, [day]: e.target.value }))
                        }
                         required // Add basic HTML5 validation
                    />
                    </div>
                ))}
                </div>
            )}

            <div className='modal-footer'>
              <button
                 type="button" // Explicitly set type
                 className='btn btn-grey' // Add a cancel/close button style
                 onClick={() => setShowModal(false)}
                 style={{ marginRight: '0.5rem' }} // Add some space
              >
                  Cancel
              </button>
              <button
                type="button" // Explicitly set type
                className='btn btn-green'
                // Disable if no days selected OR if any selected day is missing times
                disabled={selectedDays.length === 0 || selectedDays.some(day => !startTime[day] || !endTime[day])}
                onClick={handleAssignShift}
              >
                Confirm Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RosterPage;
