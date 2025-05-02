import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  startOfWeek,
  addWeeks,
  addDays,
  format,
  endOfWeek,
  isEqual,
  parseISO, 
} from 'date-fns';

// Redux Imports
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from '../../redux/slices/employeeSlice';
import { fetchRoles, deleteRole, deleteRoleScheduleEntry, updateRole, selectAllRoles, selectRoleStatus, selectRoleError, clearRoleError } from '../../redux/slices/roleSlice'; // Added updateRole
import { fetchSchedules, bulkCreateSchedules, deleteSchedule, deleteSchedulesByDateRange, selectAllSchedules, selectScheduleStatus, selectScheduleError, clearScheduleError } from '../../redux/slices/scheduleSlice';
import { selectAuthUser } from '../../redux/slices/authSlice';
import { setAlert } from '../../redux/slices/alertSlice'; 
import Alert from '../layout/Alert'; 

// Styles and Icons
import '../../styles/Forms.scss';
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
  faTimes,
  faSave,
  faTrash,
  faSpinner, // Added for loading states
  faExclamationCircle, // Added for error states
} from '@fortawesome/free-solid-svg-icons';

// Helper Components (ShiftCard, RoleCard - kept as is from your code)
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
                {/* <FontAwesomeIcon icon={faEye} className="action-icon view" title="View Details (Not Implemented)" /> */}
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
        key={role._id + (scheduleEntry ? scheduleEntry._id : '')} // Use scheduleEntry._id for uniqueness
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
        {userRole === 'employer' && scheduleEntry && (
            <div className='role-actions'>
                 {/* <FontAwesomeIcon icon={faEye} className="action-icon view" title="View Details (Not Implemented)" /> */}
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


// Main Component
const RosterPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux State
  const user = useSelector(selectAuthUser);
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employeeError = useSelector(selectEmployeeError);
  const roles = useSelector(selectAllRoles);
  const roleStatus = useSelector(selectRoleStatus);
  const roleError = useSelector(selectRoleError);
  const schedules = useSelector(selectAllSchedules);
  const scheduleStatus = useSelector(selectScheduleStatus);
  const scheduleError = useSelector(selectScheduleError);

  // Local State
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  // const [error, setError] = useState(null); // Replaced by Redux alerts

  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState({});
  const [endTime, setEndTime] = useState({});

  // State for Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // Function to run on confirm
  const [confirmTitle, setConfirmTitle] = useState('Confirm Action');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmButtonText, setConfirmButtonText] = useState('Confirm');
  const [confirmButtonClass, setConfirmButtonClass] = useState('btn-danger');

  // Combined Loading and Error States from Redux
  const isDataLoading = useMemo(() =>
    employeeStatus === 'loading' || roleStatus === 'loading' || scheduleStatus === 'loading',
    [employeeStatus, roleStatus, scheduleStatus]
  );

  const combinedError = useMemo(() =>
    employeeError || roleError || scheduleError,
    [employeeError, roleError, scheduleError]
  );

  // Update local loading/error based on Redux state
  useEffect(() => {
    setIsLoading(isDataLoading);
    // Show alerts for fetch errors
    if (combinedError) {
      dispatch(setAlert(combinedError, 'danger'));
      // Optionally clear the specific error after showing
      // if (employeeError) dispatch(clearEmployeeError()); etc.
    }
  }, [isDataLoading, combinedError, dispatch]);

  // Define weekDays based on currentWeekStart
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  const maxAllowedWeek = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    1
  );

  // Time Formatting Functions
  const formatTimeUTCtoLocal = (timeStr, dateStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':') || !dateStr) return '--:--';
    try {
        const utcDateTime = DateTime.fromISO(`${dateStr}T${timeStr}:00Z`, { zone: 'utc' });
        if (!utcDateTime.isValid) return '--:--';
        return utcDateTime.toLocal().toFormat('hh:mm a');
    } catch (error) {
        console.error("Error formatting UTC time to local:", error);
        return '--:--';
    }
  };

  const convertLocalTimeToUTC = (localTimeStr, dateStr) => {
    if (!localTimeStr || !dateStr) return '00:00';
    try {
        const localDateTime = DateTime.fromISO(`${dateStr}T${localTimeStr}`, { zone: 'local' });
         if (!localDateTime.isValid) return '00:00';
        return localDateTime.toUTC().toFormat('HH:mm');
    } catch (error) {
         console.error("Error converting local time to UTC:", error);
         return '00:00';
    }
  };

  // Data Fetching Effect using Redux
  useEffect(() => {
    // Fetch employees only if needed
    if (employeeStatus === 'idle') {
      dispatch(fetchEmployees());
    }
    // Fetch roles and schedules for the current week
    dispatch(fetchRoles());
    dispatch(fetchSchedules({ weekStart: format(currentWeekStart, 'yyyy-MM-dd') }));

    // Clear errors on week change
    return () => {
        dispatch(clearRoleError());
        dispatch(clearScheduleError());
        };
    // Removed fetchAllData() call here
  }, [currentWeekStart, dispatch, employeeStatus]); // Updated dependencies

  // Event Handlers
  const handlePrevWeek = () =>
    setCurrentWeekStart((prev) => addWeeks(prev, -1));

  const handleNextWeek = () => {
    const nextWeek = addWeeks(currentWeekStart, 1);
    if (!isEqual(currentWeekStart, maxAllowedWeek)) {
        setCurrentWeekStart(nextWeek);
    }
  };

  const getSchedulesForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
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
            entry.startTime &&
            entry.endTime &&
            entry.startTime.trim() !== '' &&
            entry.endTime.trim() !== ''
        )
    );
  };

  // --- Confirmation Modal Logic ---
  const handleConfirmAction = useCallback(() => {
    if (typeof confirmAction === 'function') {
      confirmAction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  }, [confirmAction]);

  const handleCancelAction = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };
  // --- End Confirmation Modal Logic ---

  const handleDeleteScheduleFromRoleClick = (roleId, scheduleEntryId, roleName, day) => {
    if (!scheduleEntryId) {
        console.error("Cannot delete role schedule entry without an ID.");
        return;
    }
    setConfirmTitle('Confirm Role Schedule Deletion');
    setConfirmMessage(`Are you sure you want to remove the schedule entry for role "${roleName}" on ${format(parseISO(day), 'EEE, MMM d')}?`);
    setConfirmButtonText('Remove Entry');
    setConfirmButtonClass('btn-danger');
    setConfirmAction(() => () => executeDeleteScheduleFromRole(roleId, scheduleEntryId)); // Wrap execute logic
    setShowConfirmModal(true);
  };

  const executeDeleteScheduleFromRole = (roleId, scheduleEntryId) => {
    dispatch(clearRoleError()); // Clear previous Redux errors

    dispatch(deleteRoleScheduleEntry({ roleId, scheduleEntryId }))
      .unwrap()
      .then(() => {
        dispatch(setAlert('Role schedule entry removed.', 'success'));
        // State updates automatically via reducer
      })
      .catch((err) => {
        dispatch(setAlert(`Failed to remove role entry: ${err}`, 'danger'));
      });
  };

  const handleDeleteRoleClick = (roleId, roleName) => {
    setConfirmTitle('Confirm Role Deletion');
    setConfirmMessage(`Are you sure you want to delete the role "${roleName}" and ALL its associated schedule entries? This action cannot be undone.`);
    setConfirmButtonText('Delete Role');
    setConfirmButtonClass('btn-danger');
    setConfirmAction(() => () => executeDeleteRole(roleId, roleName)); // Wrap execute logic
    setShowConfirmModal(true);
  };

  const executeDeleteRole = (roleId, roleName) => {
    dispatch(clearRoleError());
    // Actual deletion logic moved here

    dispatch(deleteRole(roleId))
      .unwrap()
      .then(() => {
        dispatch(setAlert('Role deleted successfully.', 'success'));
      })
      .catch((error) => {
        dispatch(setAlert(`Failed to delete role: ${error}`, 'danger'));
        console.error('Failed to delete role:', error.response?.data?.message || error.message); // Keep inside catch
      });
  };

  const handleRolloutClick = () => {
    setConfirmTitle('Confirm Schedule Rollout');
    setConfirmMessage(`This will DELETE all schedules in the next week (${format(addWeeks(currentWeekStart, 1), 'MMM d')} onwards) and copy the current week's schedule. Are you sure?`);
    setConfirmButtonText('Confirm Rollout');
    setConfirmButtonClass('btn-warning'); // Use warning color for potentially destructive copy action
    setConfirmAction(() => executeRollout); // Set the action to execute
    setShowConfirmModal(true);
  };

  const executeRollout = async () => {
    setIsLoading(true); // Indicate loading during rollout
    // Actual rollout logic moved here
    dispatch(clearScheduleError());
    dispatch(clearRoleError());

    try {
      const nextWeekStart = addWeeks(currentWeekStart, 1);
      const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd');
      const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
      const nextWeekEndStr = format(nextWeekEnd, 'yyyy-MM-dd');

      // 1. Delete existing schedules in the *next* week range
      await dispatch(deleteSchedulesByDateRange({ startDate: nextWeekStartStr, endDate: nextWeekEndStr })).unwrap();

       // 2. Clean role schedule entries *only within the next week*
       await Promise.all(
         roles.map(async (role) => {
           const currentEntries = role.schedule?.filter(entry =>
                entry.day < nextWeekStartStr || entry.day > nextWeekEndStr
             ) || [];
            // Dispatch updateRole with only the schedule field
            await dispatch(updateRole({ id: role._id, roleData: { schedule: currentEntries } })).unwrap();
         })
       );

      // 3. Create new employee schedules for the next week
      const newEmployeeSchedules = schedules
        .map((sch) => {
            try {
                const dateObj = DateTime.fromISO(sch.date).toJSDate();
                const dayIndex = (dateObj.getDay() + 6) % 7;
                const nextDate = addDays(nextWeekStart, dayIndex);
                if (!sch.employee?._id || !sch.startTime || !sch.endTime) return null;
                return {
                    employee: sch.employee._id,
                    role: sch.role?._id || null,
                    startTime: sch.startTime,
                    endTime: sch.endTime,
                    date: format(nextDate, 'yyyy-MM-dd'),
                };
            } catch(e) { return null; }
        })
        .filter(Boolean);

      if (newEmployeeSchedules.length > 0) {
        await dispatch(bulkCreateSchedules(newEmployeeSchedules)).unwrap();
      }

      // 4. Clone role schedule entries to the next week
      await Promise.all(
        roles.map(async (role) => {
          const currentWeekEntries = role.schedule?.filter(entry =>
              entry.day >= format(currentWeekStart, 'yyyy-MM-dd') &&
              entry.day <= format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd') &&
              entry.startTime && entry.endTime
          ) || [];

          if (currentWeekEntries.length === 0) return;

          const clonedEntries = currentWeekEntries.map((entry) => {
            const newDay = addDays(DateTime.fromISO(entry.day).toJSDate(), 7);
            return {
              day: format(newDay, 'yyyy-MM-dd'),
              startTime: entry.startTime,
              endTime: entry.endTime,
            };
          });

          // Get existing schedule from current Redux state
          const existingSchedule = roles.find(r => r._id === role._id)?.schedule || [];
          const updatedSchedule = [...existingSchedule, ...clonedEntries];

          // Dispatch updateRole with the combined schedule
          await dispatch(updateRole({ id: role._id, roleData: { schedule: updatedSchedule } })).unwrap();
        })
      );

      // 5. Navigate to the next week view after successful rollout
      setCurrentWeekStart(nextWeekStart);
      dispatch(setAlert("Schedule successfully rolled out to the next week!", 'success'));

    } catch (err) {
      console.error('Error during rollout:', err.response?.data || err.message, err);
      dispatch(setAlert(`Error during rollout: ${err}`, 'danger'));
    } finally {
        setIsLoading(false); // Stop loading indicator
    }
  };

  const handleEmployeeClick = (emp) => {
    setSelectedEmployee(emp);
    setSelectedDays([]);
    setStartTime({});
    setEndTime({});
    setShowModal(true);
  };

  const handleAssignShift = async () => {
    if (selectedDays.length === 0) {
        dispatch(setAlert("Please select at least one day.", 'warning'));
        return;
    }
     if (!selectedEmployee) return;

    for (const day of selectedDays) {
        if (!startTime[day] || !endTime[day]) {
            dispatch(setAlert(`Please enter both start and end times for ${day}.`, 'warning'));
            return;
        }
         if (startTime[day] >= endTime[day]) {
             dispatch(setAlert(`End time must be after start time for ${day}.`, 'warning'));
             return;
         }
    }
    dispatch(clearScheduleError()); // Clear previous Redux errors
    try {
      const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      const schedulePayloads = selectedDays.map((day) => {
        const index = dayOrder.indexOf(day);
        const date = format(addDays(currentWeekStart, index), 'yyyy-MM-dd');
        const utcStartTime = convertLocalTimeToUTC(startTime[day], date);
        const utcEndTime = convertLocalTimeToUTC(endTime[day], date);

        return {
          employee: selectedEmployee._id,
          startTime: utcStartTime,
          endTime: utcEndTime,
          date,
        };
      });

      await dispatch(bulkCreateSchedules(schedulePayloads)).unwrap();

      setShowModal(false);
      setSelectedEmployee(null);
      setSelectedDays([]);
      setStartTime({});
      setEndTime({});
      dispatch(setAlert('Shift(s) assigned successfully.', 'success'));

      // Trigger refetch after successful assignment
      dispatch(fetchSchedules({ weekStart: format(currentWeekStart, 'yyyy-MM-dd') }));


    } catch (err) {
      console.error('Error assigning/updating shift:', err.response?.data?.message || err.message);
       // setError(`Error assigning shift: ${err.response?.data?.message || err.message}`); // Handled by Alert
       dispatch(setAlert(`Error assigning shift: ${err.response?.data?.message || err.message}`, 'danger'));
    }
  };

  const handleDeleteShiftClick = (scheduleId, employeeName) => {
    setConfirmTitle('Confirm Shift Deletion');
    setConfirmMessage(`Are you sure you want to delete this shift for ${employeeName || 'this employee'}?`);
    setConfirmButtonText('Delete Shift');
    setConfirmButtonClass('btn-danger');
    setConfirmAction(() => () => executeDeleteSchedule(scheduleId)); // Wrap execute logic
    setShowConfirmModal(true);
  };

  const executeDeleteSchedule = async (scheduleId) => {
    // Actual deletion logic moved here
    dispatch(clearScheduleError());
    try {
      await dispatch(deleteSchedule(scheduleId)).unwrap();
      dispatch(setAlert('Shift deleted successfully.', 'success'));
      // State updates automatically via reducer

      // Optional: Explicitly refetch if optimistic update isn't sufficient
      // dispatch(fetchSchedules({ weekStart: format(currentWeekStart, 'yyyy-MM-dd') }));

    } catch (err) {
      console.error('Error deleting schedule:', err.response?.data?.message || err.message);
      dispatch(setAlert(`Failed to delete shift: ${err}`, 'danger'));
    }
  };

  const getAssignedEmployeeNames = (role) => {
     if (!role.assignedEmployees || role.assignedEmployees.length === 0) return 'None';
     return role.assignedEmployees
       .map(emp => typeof emp === 'object' ? emp.name : employees.find(e => e._id === emp)?.name)
       .filter(Boolean)
       .join(', ') || 'None';
   };

  // Render Logic
  const canShowSidebars = isEqual(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ||
                          isEqual(currentWeekStart, addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1));

  const canRollout = (isEqual(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ||
                     isEqual(currentWeekStart, addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -1))) &&
                     user?.role === 'employer';

  return (
    <div className='roster-page'>
      <Alert /> {/* Render Alert component here */}
      <header className='roster-header'>
        <div className='title'>
          <h2><FontAwesomeIcon icon={faCalendar} /> Rosters</h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard'>Dashboard</Link>  <span>Rosters</span>
          </div>
        </div>
        {canRollout && (
            <button
              className='btn btn-green'
              onClick={handleRolloutClick} // Updated onClick
              title={`Copy schedule from ${format(currentWeekStart, 'MMM d')} week to ${format(addWeeks(currentWeekStart, 1), 'MMM d')} week`}
              disabled={isLoading} // Disable during loading/rollout
            >
              <FontAwesomeIcon icon={isLoading ? faSpinner : faSyncAlt} spin={isLoading} className='icon-left' />
              {isLoading ? 'Processing...' : 'Rollout to Next Week'}
            </button>
          )}
      </header>

      {/* Week Navigation */}
      <div className='week-nav'>
        <button className='btn btn-blue' onClick={handlePrevWeek} disabled={isLoading}>
          <FontAwesomeIcon icon={faArrowLeft} /> Prev Week
        </button>
        <h4>
          {format(currentWeekStart, 'MMM d')} -{' '}
          {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </h4>
         <button
            className='btn btn-blue'
            onClick={handleNextWeek}
            disabled={isLoading || isEqual(currentWeekStart, maxAllowedWeek)}
          >
            Next Week <FontAwesomeIcon icon={faArrowRight} />
          </button>
      </div>

       {/* Display Global Errors */}
       {/* {error && ( // Handled by Alert component via useEffect
         <div className='error-message page-error' style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <FontAwesomeIcon icon={faExclamationCircle} />
            <p>{error}</p>
         </div>
       )} */}
       
      {/* Roster Body */}
      {/* Add conditional class for centering */}
      <div className={`roster-body ${!canShowSidebars ? 'roster-body--center-content' : ''}`}>
        {/* Roles Sidebar */}
        {canShowSidebars && (
          <aside className='roles-sidebar'>
            <div className='sidebar-header'>
              <p>Roles</p>
              {user?.role === 'employer' && (
                <button className='btn btn-green' onClick={() => navigate('/createrole')} title="Create a new role">
                  Create <FontAwesomeIcon icon={faPlus} />
                </button>
              )}
            </div>
            <div className='role-list'>
              {isLoading ? <p>Loading roles...</p> : roles.length > 0 ? roles.map((role) => (
                <div key={role._id} className={`role-card role-${role.color?.toLowerCase() || 'default'}`}>
                  <div
                    className={`role-name ${user?.role === 'employer' ? 'clickable' : ''}`}
                    onClick={() => user?.role === 'employer' && navigate(`/createrole/${role._id}`)}
                    title={user?.role === 'employer' ? "Edit Role" : ""}
                  >
                    {role.roleName}
                  </div>
                  {user?.role === 'employer' && (
                    <button
                      className='delete-btn'
                      onClick={(e) => { e.stopPropagation(); handleDeleteRoleClick(role._id, role.roleName); }} // Updated onClick
                      title='Delete Role Permanently'
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                </div>
              )) : <p>No roles created yet.</p>}
            </div>
          </aside>
        )}

        {/* Schedule Grid */}
        <div className="schedule-wrapper">
            {isLoading ? (
                 <div className='loading-indicator'>
                    <FontAwesomeIcon icon={faSpinner} spin size='2x' />
                    <p>Loading Schedule...</p>
                 </div>
            ) : (
                <div className="schedule-grid">
                    <div className='grid-header-row'>
                        {weekDays.map((day) => (
                            <div key={day.toISOString()} className='grid-header'>
                                {format(day, 'EEE, MMM d')}
                            </div>
                        ))}
                    </div>
                    <div className='grid-body'>
                        {weekDays.map((day) => {
                            const daySchedules = getSchedulesForDay(day);
                            const dayRoles = getRolesForDay(day);
                            const dayStr = format(day, 'yyyy-MM-dd');

                            return (
                                <React.Fragment key={day.toISOString()}>
                                    <div className='vertical-grid-header'>
                                        {format(day, 'EEE, MMM d')}
                                    </div>
                                    <div className='grid-cell'>
                                        {daySchedules.map((sch) => (
                                            <ShiftCard
                                                key={sch._id}
                                                schedule={sch}
                                                formatTime={formatTimeUTCtoLocal}
                                                userRole={user?.role}
                                                onDelete={(id) => handleDeleteShiftClick(id, sch.employee?.name)} // Updated onDelete
                                            />
                                        ))}
                                        {dayRoles.map((role) => {
                                            const scheduleEntry = role.schedule.find(
                                                (entry) => entry.day === dayStr && entry.startTime && entry.endTime
                                            );
                                            if (!scheduleEntry) return null;
                                            const assignedNames = getAssignedEmployeeNames(role);
                                            return (
                                                <RoleCard
                                                    key={role._id + scheduleEntry._id}
                                                    role={role}
                                                    scheduleEntry={scheduleEntry}
                                                    formatTime={formatTimeUTCtoLocal}
                                                    assignedEmployeeNames={assignedNames}
                                                    userRole={user?.role}
                                                    onDelete={(rId, sId) => handleDeleteScheduleFromRoleClick(rId, sId, role.roleName, scheduleEntry.day)} // Updated onDelete
                                                />
                                            );
                                        })}
                                        {daySchedules.length === 0 && dayRoles.length === 0 && (
                                            <p className="no-shifts-message">
                                                No shifts or roles scheduled.
                                            </p>
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        {/* Employees Sidebar */}
         {canShowSidebars && (
            <aside className='employees-sidebar'>
            <div className='sidebar-header'>
              <p>Assign Shifts</p>
            </div>
            <div className='employee-list'>
              {isLoading ? <p>Loading employees...</p> : employees.length > 0 ? employees.map((emp) => (
                <button
                  key={emp._id}
                  className={`btn btn-yellow`}
                  onClick={() => user?.role === "employer" && handleEmployeeClick(emp)}
                  disabled={user?.role !== "employer"}
                   title={user?.role === "employer" ? `Assign shift for ${emp.name}` : "Only employers can assign shifts"}
                >
                  {emp.name}
                </button>
              )) : <p>No employees found.</p>}
            </div>
          </aside>
        )}
      </div>

      {/* Assign Shift Modal */}
      {showModal && selectedEmployee && (
        // Keep modal-specific overlay and content classes
        <div className='modal-overlay' onClick={() => setShowModal(false)}>
          <div className='modal-content' onClick={e => e.stopPropagation()}>
            <h5>
              Assign Shift for {selectedEmployee.name}
              {/* Use a button with standard styling potentially, or keep simple close */}
              <button
                  id='closeModal'
                  className="modal-close-btn" // Added a class for potential styling
                  onClick={() => setShowModal(false)}
                  title="Close"
                  aria-label="Close" // Added aria-label
              >
                  &times;
              </button>
            </h5>
            <p>Select day(s) and enter times:</p>
            {/* Keep specific layout classes for day buttons */}
            <div className='schedule-buttons'>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <button
                  key={day}
                  className={`day-btn ${selectedDays.includes(day) ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedDays((prev) =>
                      prev.includes(day)
                        ? prev.filter((d) => d !== day)
                        : [...prev, day].sort((a, b) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(a) - ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(b))
                    );
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
            {selectedDays.length > 0 && (
                // Keep specific layout classes for time inputs
                <div className='day-wise-times'>
                {selectedDays.map((day) => (
                    <div key={day} className='time-row'>
                    <label htmlFor={`start-time-${day}`}>{day}</label>
                    <input
                        id={`start-time-${day}`}
                        type='time'
                        value={startTime[day] || ''}
                        onChange={(e) => setStartTime((prev) => ({ ...prev, [day]: e.target.value }))}
                        required
                        // Input styling will come from Forms.scss
                    />
                    {/* Removed inline style, use CSS for spacing */}
                    <span className="time-separator">to</span>
                    <input
                         id={`end-time-${day}`}
                        type='time'
                        value={endTime[day] || ''}
                        onChange={(e) => setEndTime((prev) => ({ ...prev, [day]: e.target.value }))}
                         required
                         // Input styling will come from Forms.scss
                    />
                    </div>
                ))}
                </div>
            )}
            {/* Use standard button classes from Forms.scss */}
            <div className='modal-footer'>
              {/* Removed inline style, use CSS for spacing */}
              <button type="button" className='btn btn-danger' onClick={() => setShowModal(false)}>
                {/* Added Icon for consistency */}
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button
                type="button"
                className='btn btn-success' // Changed from btn-green
                disabled={selectedDays.length === 0 || selectedDays.some(day => !startTime[day] || !endTime[day])}
                onClick={handleAssignShift}
              >
                {/* Added Icon for consistency */}
                <FontAwesomeIcon icon={faSave} /> Confirm Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
          <div className="logout-confirm-overlay"> {/* Re-use styles */}
            <div className="logout-confirm-dialog">
              <h4>{confirmTitle}</h4>
              <p>{confirmMessage}</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={handleCancelAction} disabled={isLoading}>Cancel</button>
                <button className={confirmButtonClass} onClick={handleConfirmAction} disabled={isLoading}>
                  {isLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Processing...</> : confirmButtonText}
                </button>
              </div>
            </div>
          </div>
      )}

    </div>
  );
};

export default RosterPage;

