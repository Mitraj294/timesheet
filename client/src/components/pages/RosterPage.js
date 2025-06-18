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

import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from '../../redux/slices/employeeSlice';
import { fetchRoles, deleteRole, deleteRoleScheduleEntry, updateRole, selectAllRoles, selectRoleStatus, selectRoleError, clearRoleError } from '../../redux/slices/roleSlice'; // Added sendRoleUpdateNotificationEmail
import { fetchSchedules, bulkCreateSchedules, deleteSchedule, deleteSchedulesByDateRange, selectAllSchedules, selectScheduleStatus, selectScheduleError, clearScheduleError } from '../../redux/slices/scheduleSlice'; // Added sendScheduleUpdateNotificationEmail
import { selectAuthUser } from '../../redux/slices/authSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';

// Styles and Icons
import '../../styles/Timesheet.scss';
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
 
  faTimes,
  faSave,
  faTrash,
  faSpinner, // Added for loading states

} from '@fortawesome/free-solid-svg-icons';

// ShiftCard: Shows a single employee shift
const ShiftCard = ({ schedule, formatTime, userRole, onDelete }) => (
  <div key={schedule._id} className='shift-card'>
    <p className='shift-time'>
      {formatTime(schedule.startTime, schedule.date)} - {formatTime(schedule.endTime, schedule.date)}
    </p>
    {schedule.employee && <p className='shift-employee'>{schedule.employee.name}</p>}
    {userRole === 'employer' && (
      <div className='shift-actions'>
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

// RoleCard: Shows a role's schedule entry
const RoleCard = ({ role, scheduleEntry, formatTime, assignedEmployeeNames, userRole, onDelete }) => (
  <div
    key={role._id + (scheduleEntry ? scheduleEntry._id : '')}
    className={`role-card role-${role.color?.toLowerCase() || 'default'}`}
  >
    <p className='role-time'>
      {scheduleEntry && scheduleEntry.startTime && scheduleEntry.endTime
        ? `${formatTime(scheduleEntry.startTime, scheduleEntry.day)} - ${formatTime(scheduleEntry.endTime, scheduleEntry.day)}`
        : 'Time not set'}
    </p>
    <p className='role-name'>{role.roleName || 'Unnamed Role'}</p>
    <p className='role-employee'>Assigned: {assignedEmployeeNames || 'None'}</p>
    {userRole === 'employer' && scheduleEntry && (
      <div className='role-actions'>
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

// Main RosterPage component
const RosterPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state selectors
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

  // Local component state
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
);
  const [isLoading, setIsLoading] = useState(true); // General loading state for async operations
  const [isAssigningShift, setIsAssigningShift] = useState(false); // Specific loading state for assigning shift

  // Find the Employee record for the logged-in user if their role is 'employee'
  const loggedInEmployeeRecord = useMemo(() => {
    if (user?.role === 'employee' && Array.isArray(employees) && user?._id) {
      return employees.find(emp => emp.userId === user._id);
    }
    return null;
  }, [employees, user]);

  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState({});
  const [endTime, setEndTime] = useState({});

  // State for the confirmation modal (used for delete/rollout actions)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // Function to run on confirm
  const [confirmTitle, setConfirmTitle] = useState('Confirm Action');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmButtonText, setConfirmButtonText] = useState('Confirm');
  const [confirmButtonClass, setConfirmButtonClass] = useState('btn-danger');

  // Derived loading state from Redux statuses for initial data fetch
  const isDataLoading = useMemo(() =>
    employeeStatus === 'loading' || roleStatus === 'loading' || scheduleStatus === 'loading',
    [employeeStatus, roleStatus, scheduleStatus]
  );

  const combinedError = useMemo(() =>
    employeeError || roleError || scheduleError,
    [employeeError, roleError, scheduleError]
  );

  // Effects
  // Updates local loading state and displays Redux errors as alerts
  useEffect(() => {
    setIsLoading(isDataLoading);
    if (combinedError) {
      dispatch(setAlert(combinedError, 'danger'));
      console.error("[RosterPage] Redux error:", combinedError);
    }
  }, [isDataLoading, combinedError, dispatch]);

  // Memoized array of date objects for the current week view
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  // Defines the furthest week into the future a user can navigate
  const maxAllowedWeek = addWeeks(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    1
  );

  // Format UTC time string to local time string
  const formatTimeUTCtoLocal = (timeStr, dateStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':') || !dateStr) return '--:--';
    try {
      const utcDateTime = DateTime.fromISO(`${dateStr}T${timeStr}:00Z`, { zone: 'utc' });
      if (!utcDateTime.isValid) return '--:--';
      return utcDateTime.toLocal().toFormat('hh:mm a');
    } catch {
      return '--:--';
    }
  };

  // Convert local time string to UTC time string
  const convertLocalTimeToUTC = (localTimeStr, dateStr) => {
    if (!localTimeStr || !dateStr) return '00:00';
    try {
      const localDateTime = DateTime.fromISO(`${dateStr}T${localTimeStr}`, { zone: 'local' });
      if (!localDateTime.isValid) return '00:00';
      return localDateTime.toUTC().toFormat('HH:mm');
    } catch {
      return '00:00';
    }
  };

  // Fetches necessary data (employees, roles, schedules) when the component mounts or currentWeekStart changes
  useEffect(() => {
    if (employeeStatus === 'idle') {
      dispatch(fetchEmployees());
    }
    dispatch(fetchRoles());
    dispatch(fetchSchedules({ weekStart: format(currentWeekStart, 'yyyy-MM-dd') }));

    // Cleanup: clear role and schedule errors when dependencies change
    return () => {
        dispatch(clearRoleError());
        dispatch(clearScheduleError());
    };
  }, [currentWeekStart, dispatch, employeeStatus]);

  // Event Handlers
  const handlePrevWeek = () =>
    setCurrentWeekStart((prev) => addWeeks(prev, -1));

  const handleNextWeek = () => {
    const nextWeek = addWeeks(currentWeekStart, 1);
    if (!isEqual(currentWeekStart, maxAllowedWeek)) {
        setCurrentWeekStart(nextWeek);
    }
  };
  
  const getSchedulesForDay = useCallback((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    let daySchedules = schedules.filter(
      (s) =>
        s.date &&
        format(DateTime.fromISO(s.date).toJSDate(), 'yyyy-MM-dd') === dayStr &&
        s.employee // Ensure the employee field is populated (not null)
    );
    if (user?.role === 'employee' && loggedInEmployeeRecord) {
        daySchedules = daySchedules.filter(s => s.employee?._id === loggedInEmployeeRecord._id);
    }
    return daySchedules;
  }, [schedules, user, loggedInEmployeeRecord]);

  const getRolesForDay = useCallback((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    let relevantRoles = roles;
    if (user?.role === 'employee' && loggedInEmployeeRecord) {
        relevantRoles = roles.filter(role =>
            role.assignedEmployees &&
            role.assignedEmployees.some(empId => (typeof empId === 'object' ? empId._id : empId) === loggedInEmployeeRecord._id)
        );
    }
    return relevantRoles.filter(
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
  }, [roles, user, loggedInEmployeeRecord]);

  // Confirmation Modal Logic
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

  // Initiates deletion of a specific schedule entry from a role
  const handleDeleteScheduleFromRoleClick = (roleId, scheduleEntryId, roleName, day) => {
    if (!scheduleEntryId) {
        console.error("[RosterPage] Cannot delete role schedule entry without an ID.");
        return;
    }
    setConfirmTitle('Confirm Role Schedule Deletion');
    setConfirmMessage(`Are you sure you want to remove the schedule entry for role "${roleName}" on ${format(parseISO(day), 'EEE, MMM d')}?`);
    setConfirmButtonText('Remove Entry');
    setConfirmButtonClass('btn-danger');
    setConfirmAction(() => () => executeDeleteScheduleFromRole(roleId, scheduleEntryId));
    setShowConfirmModal(true);
  };

  // Executes the deletion of a role's schedule entry
  const executeDeleteScheduleFromRole = (roleId, scheduleEntryId) => {
    dispatch(clearRoleError());
    dispatch(deleteRoleScheduleEntry({ roleId, scheduleEntryId }))
      .unwrap()
      .then(() => {
        dispatch(setAlert('Role schedule entry removed.', 'success'));
      })
      .catch((err) => {
        dispatch(setAlert(`Failed to remove role entry: ${err}`, 'danger'));
        console.error("[RosterPage] Failed to remove role entry:", err);
      });
  };

  // Initiates deletion of an entire role
  const handleDeleteRoleClick = (roleId, roleName) => {
    setConfirmTitle('Confirm Role Deletion');
    setConfirmMessage(`Are you sure you want to delete the role "${roleName}" and ALL its associated schedule entries? This action cannot be undone.`);
    setConfirmButtonText('Delete Role');
    setConfirmButtonClass('btn-danger');
    setConfirmAction(() => () => executeDeleteRole(roleId, roleName));
    setShowConfirmModal(true);
  };

  // Executes the deletion of a role
  const executeDeleteRole = (roleId, roleName) => {
    dispatch(clearRoleError());
    dispatch(deleteRole(roleId))
      .unwrap()
      .then(() => {
        dispatch(setAlert('Role deleted successfully.', 'success'));
      })
      .catch((error) => {
        dispatch(setAlert(`Failed to delete role: ${error}`, 'danger'));
        console.error('[RosterPage] Failed to delete role:', error.response?.data?.message || error.message);
      });
  };

  // Initiates the schedule rollout process (copying current week to next week)
  const handleRolloutClick = () => {
    setConfirmTitle('Confirm Schedule Rollout');
    setConfirmMessage(`This will DELETE all schedules in the next week (${format(addWeeks(currentWeekStart, 1), 'MMM d')} onwards) and copy the current week's schedule. Are you sure?`);
    setConfirmButtonText('Confirm Rollout');
    setConfirmButtonClass('btn-warning');
    setConfirmAction(() => executeRollout);
    setShowConfirmModal(true);
  };

  // Updated executeRollout function to fix nextWeek ReferenceError and separate alerts
  const executeRollout = async () => {
    setIsLoading(true);
    dispatch(clearScheduleError());
    dispatch(clearRoleError());

    try {
      const nextWeekStart = addWeeks(currentWeekStart, 1);
      const nextWeekStartStr = format(nextWeekStart, 'yyyy-MM-dd');
      const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
      const nextWeekEndStr = format(nextWeekEnd, 'yyyy-MM-dd');

      // Delete existing employee schedules in the next week range
      await dispatch(deleteSchedulesByDateRange({ startDate: nextWeekStartStr, endDate: nextWeekEndStr })).unwrap();


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
            } catch(e) {
                console.error("[RosterPage] Error processing schedule for rollout:", e);
                return null;
            }
        })
        .filter(Boolean);

      if (newEmployeeSchedules.length > 0) {
        await dispatch(bulkCreateSchedules(newEmployeeSchedules)).unwrap();
      }

      // Process Role Schedules for Rollout
      await Promise.all(
        roles.map(async (role) => {
          const originalRoleSchedule = role.schedule || [];

          // 1. Filter out entries that are *within* the next week from the original schedule.
          // These are the entries from other weeks that we want to keep.
          const scheduleForOtherWeeks = originalRoleSchedule.filter(entry =>
            entry.day < nextWeekStartStr || entry.day > nextWeekEndStr
          );

          // 2. Identify entries from the *current* week to be cloned.
          const currentWeekEntriesToClone = originalRoleSchedule.filter(entry =>
              entry.day >= format(currentWeekStart, 'yyyy-MM-dd') &&
              entry.day <= format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd') &&
              entry.startTime && entry.endTime
          );

          if (currentWeekEntriesToClone.length === 0) {
            // If no entries in current week to clone, just ensure the role schedule
            // only contains entries from other weeks (effectively cleaning the next week if it had entries).
            // This handles the case where a role might have had future entries manually added to the next week
            // which now need to be cleared because nothing is being rolled out from the current week for this role.
            if (originalRoleSchedule.length !== scheduleForOtherWeeks.length) {
                 await dispatch(updateRole({ id: role._id, roleData: { schedule: scheduleForOtherWeeks } })).unwrap();
            }
            return; // Nothing to clone for this role
          }

          // 3. Create cloned entries for the next week.
          const clonedEntriesForNextWeek = currentWeekEntriesToClone.map((entry) => {
            const newDay = addDays(DateTime.fromISO(entry.day).toJSDate(), 7);
            return {
              day: format(newDay, 'yyyy-MM-dd'),
              startTime: entry.startTime,
              endTime: entry.endTime,
              // _id will be generated by MongoDB if not provided, which is fine for new entries
            };
          });

          // 4. Combine the kept entries from other weeks with the new cloned entries for the next week.
          const newFullScheduleForRole = [...scheduleForOtherWeeks, ...clonedEntriesForNextWeek];

          await dispatch(updateRole({ id: role._id, roleData: { schedule: newFullScheduleForRole } })).unwrap();

          // 5. Notify assigned employees about the rolled-out role schedule
          if (clonedEntriesForNextWeek.length > 0 && role.assignedEmployees && role.assignedEmployees.length > 0) {
          }
        })
      );

      // Navigate to the next week view and show success message
      setCurrentWeekStart(nextWeekStart);
      dispatch(setAlert("Schedule successfully rolled out to the next week!", 'success'));
    } catch (err) {
      // Show a user-friendly alert if email is disabled
      if (
        err?.message?.includes("Email notifications are currently disabled") ||
        err?.response?.data?.message?.includes("Email notifications are currently disabled")
      ) {
        dispatch(setAlert("Email notifications are currently disabled on the server. Please contact your administrator.", "warning"));
      } else {
        dispatch(setAlert("Error sending email notifications. Please check the server logs.", "error"));
      }
      console.error("[RosterPage] Error sending email notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Opens the modal to assign a shift to an employee
  const handleEmployeeClick = (emp) => {
    setSelectedEmployee(emp);
    setSelectedDays([]);
    setStartTime({});
    setEndTime({});
    setShowModal(true);
  };

  // Handles submission of the assign shift modal
  const handleAssignShift = async () => {
    if (isAssigningShift) return;
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
    setIsAssigningShift(true);
    dispatch(clearScheduleError());
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

      dispatch(fetchSchedules({ weekStart: format(currentWeekStart, 'yyyy-MM-dd') }));

    } catch (err) {
      console.error('Error assigning/updating shift:', err.response?.data?.message || err.message);
      dispatch(setAlert(`Error assigning shift: ${err.response?.data?.message || err.message}`, 'danger'));
    } finally {
      setIsAssigningShift(false);
    }
  };

  // Initiates deletion of an employee's shift
  const handleDeleteShiftClick = (scheduleId, employeeName) => {
    setConfirmTitle('Confirm Shift Deletion');
    setConfirmMessage(`Are you sure you want to delete this shift for ${employeeName || 'this employee'}?`);
    setConfirmButtonText('Delete Shift');
    setConfirmButtonClass('btn-danger');
    setConfirmAction(() => () => executeDeleteSchedule(scheduleId));
    setShowConfirmModal(true);
  };

  const executeDeleteSchedule = async (scheduleId) => {
    dispatch(clearScheduleError());
    try {
      await dispatch(deleteSchedule(scheduleId)).unwrap();
      dispatch(setAlert('Shift deleted successfully.', 'success'));
    } catch (err) {
      console.error('Error deleting schedule:', err.response?.data?.message || err.message);
      dispatch(setAlert(`Failed to delete shift: ${err}`, 'danger'));
    }
  };

  // Get assigned employee names for a role
  const getAssignedEmployeeNames = useCallback((role) => {
    if (user?.role === 'employee' && loggedInEmployeeRecord) {
      return loggedInEmployeeRecord.name;
    }
    if (!role.assignedEmployees || role.assignedEmployees.length === 0) return 'None';
    return role.assignedEmployees
      .map(emp => {
        const empId = typeof emp === 'object' && emp !== null ? emp._id : emp;
        const employeeDetail = employees.find(e => e._id === empId);
        return employeeDetail ? employeeDetail.name : null;
      })
      .filter(Boolean)
      .join(', ') || 'None';
  }, [user, loggedInEmployeeRecord, employees]);

  // --- Render ---
  // Only show sidebars for current/next week and for employers
  const canShowSidebarsForDate = isEqual(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ||
    isEqual(currentWeekStart, addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1));
  const shouldDisplaySidebars = user?.role === 'employer' && canShowSidebarsForDate;

  // Show rollout button for current or previous week (employer only)
  const canRollout = user?.role === 'employer' && (
    isEqual(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 })) ||
    isEqual(currentWeekStart, addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -1))
  );

  return (
    <div className='roster-page'>
      <Alert />
      <header className='roster-header'>
        <div className='title'>
          <h2><FontAwesomeIcon icon={faCalendar} /> Rosters</h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard'>Dashboard</Link> <span>Rosters</span>
          </div>
        </div>
        {canRollout && (
          <button
            className='ts-page-header__action-button ts-page-header__action-button--create'
            onClick={handleRolloutClick}
            title={`Copy this week's schedule (${format(currentWeekStart, 'MMM d')}) to next week (${format(addWeeks(currentWeekStart, 1), 'MMM d')})`}
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={isLoading ? faSpinner : faSyncAlt} spin={isLoading} className='icon-left' />
            {isLoading ? 'Processing...' : 'Rollout to Next Week'}
          </button>
        )}
      </header>

      <div className='week-nav'>
        <div className="week-nav__btn-group">
          <button className='timesheet-nav__button' onClick={handlePrevWeek} disabled={isLoading}>
            <FontAwesomeIcon icon={faArrowLeft} /> Prev Week
          </button>
        </div>
        <div className="week-nav__period">
          <h4>
            {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
          </h4>
        </div>
        <div className="week-nav__btn-group">
          <button
            className='timesheet-nav__button'
            onClick={handleNextWeek}
            disabled={isLoading || isEqual(currentWeekStart, maxAllowedWeek)}
          >
            Next Week <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
      </div>

      {/* Main roster content area */}
      <div className={`roster-body ${!shouldDisplaySidebars ? 'roster-body--center-content' : ''}`}>
        {shouldDisplaySidebars && (
          <aside className='roles-sidebar'>
            <div className='sidebar-header'>
              <p>Roles</p>
              {user?.role === 'employer' && (
                <button
                  className='ts-page-header__action-button ts-page-header__action-button--create'
                  onClick={() => navigate('/createrole')}
                  title="Create a new role"
                >
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
                      onClick={(e) => { e.stopPropagation(); handleDeleteRoleClick(role._id, role.roleName); }}
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

        {/* Main schedule grid displaying shifts and roles */}
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

        {/* Sidebar for assigning shifts to employees */}
         {shouldDisplaySidebars && (
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

      {/* Modal for assigning a new shift to an employee */}
      {showModal && selectedEmployee && (
        <div className='modal-overlay' onClick={() => setShowModal(false)}>
          <div className='modal-content' onClick={e => e.stopPropagation()}>
            <h5>
              Assign Shift for {selectedEmployee.name}
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
                    />
                    <span className="time-separator">to</span>
                    <input
                         id={`end-time-${day}`}
                        type='time'
                        value={endTime[day] || ''}
                        onChange={(e) => setEndTime((prev) => ({ ...prev, [day]: e.target.value }))}
                         required
                    />
                    </div>
                ))}
                </div>
            )}
            <div className='modal-footer'>
              <button type="button" className='btn btn-danger' onClick={() => setShowModal(false)}>
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button
                type="button" // Ensure this is type="button" if not submitting a form
                className='btn btn-green'
            disabled={isAssigningShift || selectedDays.length === 0 || selectedDays.some(day => !startTime[day] || !endTime[day])}
                onClick={handleAssignShift}
              >
            <FontAwesomeIcon icon={isAssigningShift ? faSpinner : faSave} spin={isAssigningShift} /> 
            {isAssigningShift ? 'Assigning...' : 'Confirm Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* General confirmation modal for delete/rollout actions */}
      {showConfirmModal && (
          <div className="logout-confirm-overlay">
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