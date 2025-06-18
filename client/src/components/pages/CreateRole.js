import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { DateTime } from 'luxon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from '../../redux/slices/employeeSlice';
import {
    fetchRoleById, createRole, updateRole,
    selectCurrentRole, selectCurrentRoleStatus, selectCurrentRoleError,
    selectRoleStatus, selectRoleError,
    clearCurrentRole, clearRoleError
} from '../../redux/slices/roleSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';

import '../../styles/Forms.scss'; // *** Use Forms.scss ***
import {
    faUserTag, 
    faTimes,
    faPalette,
    faCalendar,
    faXmark,
    faSpinner,

    faSave, 
    faPen,
} from '@fortawesome/free-solid-svg-icons'; // Added Edit icon

const COLORS = ['Default', 'Red', 'Green', 'Yellow', 'Blue'];

// Helper function for UTC conversion (similar to RosterPage)
const convertLocalTimeToUTC = (localTimeStr, dateStr) => {
    if (!localTimeStr || !dateStr) return '';
    try {
        const localDateTime = DateTime.fromISO(`${dateStr}T${localTimeStr}`, { zone: 'local' });
        if (!localDateTime.isValid) return '';
        return localDateTime.toUTC().toFormat('HH:mm');
    } catch (error) {
        console.error("Error converting local time to UTC:", error);
        return '';
    }
};

// Helper function for Local conversion (similar to RosterPage)
const formatTimeUTCtoLocal = (timeStr, dateStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':') || !dateStr) return '';
    try {
        const utcDateTime = DateTime.fromISO(`${dateStr}T${timeStr}:00Z`, { zone: 'utc' });
        if (!utcDateTime.isValid) return '';
        return utcDateTime.toLocal().toFormat('HH:mm');
    } catch (error) {
        console.error("Error formatting UTC time to local:", error);
        return '';
    }
};


const CreateRole = () => {
    const { roleId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const isEditing = Boolean(roleId);

    // Redux state
    const allEmployees = useSelector(selectAllEmployees);
    const employeeStatus = useSelector(selectEmployeeStatus);
    const employeeError = useSelector(selectEmployeeError);
    const currentRole = useSelector(selectCurrentRole);
    const currentRoleStatus = useSelector(selectCurrentRoleStatus);
    const currentRoleError = useSelector(selectCurrentRoleError);
    const saveStatus = useSelector(selectRoleStatus); // Tracks status of create/update operations
    const saveError = useSelector(selectRoleError);   // Tracks errors from create/update operations

    // Local component state
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [schedule, setSchedule] = useState({});
    const [error, setError] = useState(null); // For local form validation errors (though currently handled by alerts)

    // Memoized week start date to prevent re-calculation on every render
    const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Effects
    useEffect(() => {
        // Fetch employees if not already loaded
        if (employeeStatus === 'idle') {
            console.log("[CreateRole] Fetching employees...");
            dispatch(fetchEmployees());
        }

        if (isEditing && roleId) {
            console.log("[CreateRole] Fetching role by id:", roleId);
            dispatch(fetchRoleById(roleId));
        } else {
            dispatch(clearCurrentRole());
            setRoleName('');
            setRoleDescription('');
            setColor(COLORS[0]);
            setSelectedEmployees([]);
            setSchedule({});
            console.log("[CreateRole] Initializing form for new role.");
        }

        return () => {
            dispatch(clearCurrentRole());
            dispatch(clearRoleError());
            console.log("[CreateRole] Cleanup: Cleared current role and errors.");
        };
    }, [roleId, isEditing, dispatch, employeeStatus]);

    // Populates the form with fetched role data when in edit mode
    useEffect(() => {
      if (isEditing && currentRoleStatus === 'succeeded' && currentRole) {
          const data = currentRole;
          const newRoleName = data.roleName || '';
          const newRoleDescription = data.roleDescription || '';
          const newColor = data.color || COLORS[0];
          const newSelectedEmployees = (data.assignedEmployees || []).map(emp => typeof emp === 'object' ? emp._id : emp);

          // Format schedule from UTC (stored) to local time for display
          const newFormattedSchedule = {};
          (data.schedule || []).forEach((entry) => {
              const dayStr = entry.day;
              if (dayStr && dayStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  try {
                      const entryWeekStart = format(startOfWeek(parseISO(dayStr), { weekStartsOn: 1 }), 'yyyy-MM-dd');
                      const currentDisplayWeekStart = format(weekStart, 'yyyy-MM-dd');
                      if (entryWeekStart === currentDisplayWeekStart) {
                          newFormattedSchedule[dayStr] = {
                              from: formatTimeUTCtoLocal(entry.startTime, dayStr),
                              to: formatTimeUTCtoLocal(entry.endTime, dayStr),
                          };
                      }
                  } catch (parseError) {
                      console.error(`Error parsing date string: ${dayStr}`, parseError);
                  }
              } else {
                  console.warn(`Invalid or missing date string in schedule entry: ${dayStr}`);
              }
          });

          // Update local form state only if fetched data differs, to prevent unnecessary re-renders
          setRoleName(prev => prev !== newRoleName ? newRoleName : prev);
          setRoleDescription(prev => prev !== newRoleDescription ? newRoleDescription : prev);
          setColor(prev => prev !== newColor ? newColor : prev);
          setSelectedEmployees(prev => JSON.stringify(prev) !== JSON.stringify(newSelectedEmployees) ? newSelectedEmployees : prev);
          setSchedule(prev => JSON.stringify(prev) !== JSON.stringify(newFormattedSchedule) ? newFormattedSchedule : prev);

          if (error) setError(null); // Clear any local validation error if data loads
      } else if (isEditing && currentRoleStatus === 'failed') {
          // Error is displayed by the alert effect below
      }
  }, [isEditing, currentRoleStatus, currentRole, currentRoleError, weekStart, error]); // Added error dependency

    // Derived loading state from Redux statuses
    const isLoading = useMemo(() =>
        employeeStatus === 'loading' ||
        currentRoleStatus === 'loading' ||
        saveStatus === 'loading',
        [employeeStatus, currentRoleStatus, saveStatus]
    );

    // This combinedError was for inline display, but alerts are now preferred.
    // const combinedError = useMemo(() =>
    //     error ||
    //     employeeError ||
    //     currentRoleError ||
    //     saveError,
    //     [error, employeeError, currentRoleError, saveError]
    // );

    // Displays errors from Redux state (fetch or save operations) as alerts
    useEffect(() => {
        const reduxError = employeeError || currentRoleError || saveError;
        if (reduxError) {
            console.error("[CreateRole] Redux error:", reduxError);
            dispatch(setAlert(reduxError, 'danger'));
        }
    }, [employeeError, currentRoleError, saveError, dispatch]);

    // Event Handlers
    const handleAddEmployee = useCallback((e) => {
        const empId = e.target.value;
        if (empId && !selectedEmployees.includes(empId)) {
            setSelectedEmployees((prev) => [...prev, empId]);
            console.log("[CreateRole] Added employee to role:", empId);
        }
        e.target.value = ""; // Reset select dropdown after adding
    }, [selectedEmployees]);

    const removeEmployee = useCallback((empIdToRemove) => {
        setSelectedEmployees((prev) => prev.filter((id) => id !== empIdToRemove));
        console.log("[CreateRole] Removed employee from role:", empIdToRemove);
    }, []);

    const handleTimeChange = useCallback((dayStr, type, value) => {
        setSchedule((prev) => {
            const currentDaySchedule = prev[dayStr] || {};
            return {
                ...prev,
                [dayStr]: {
                    ...currentDaySchedule,
                    [type]: value,
                },
            };
        });
        if (error) setError(null);
        console.log(`[CreateRole] Time changed for ${dayStr} (${type}):`, value);
    }, [error]);

    // Form Validation
    const validateInputs = () => {
        if (!roleName.trim()) return 'Role Name is required.';
        if (!roleDescription.trim()) return 'Role Description is required.';
        for (const dayStr in schedule) {
            const { from, to } = schedule[dayStr];
            if (from && to && from >= to) {
                return `End time must be after start time for ${format(parseISO(dayStr), 'EEE')}.`;
            }
        }
        return null;
    };

    // Prepares data for submission (e.g., converting schedule times to UTC)
    const prepareSubmitData = () => {
        const scheduleArray = weekDays
            .map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const daySchedule = schedule[dayStr];
                const localStart = daySchedule?.from;
                const localEnd = daySchedule?.to;

                if (!localStart && !localEnd) return null;

                const startTime = localStart ? convertLocalTimeToUTC(localStart, dayStr) : '';
                const endTime = localEnd ? convertLocalTimeToUTC(localEnd, dayStr) : '';

                 if ((localStart && !startTime) || (localEnd && !endTime)) {
                     console.warn(`Time conversion issue for ${dayStr}, localStart: ${localStart}, localEnd: ${localEnd}`);
                 }

                return { day: dayStr, startTime: startTime || '', endTime: endTime || '' };
            })
            .filter(Boolean);

        return {
            roleName: roleName.trim(),
            roleDescription: roleDescription.trim(),
            color,
            assignedEmployees: selectedEmployees,
            schedule: scheduleArray,
        };
    };

    // Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        dispatch(clearRoleError());

        const validationError = validateInputs();
        if (validationError) {
            dispatch(setAlert(validationError, 'warning'));
            console.warn("[CreateRole] Validation error:", validationError);
            return;
        }

        const roleData = prepareSubmitData();
        console.log("[CreateRole] Submitting role data:", roleData);

        try {
            if (isEditing) {
                await dispatch(updateRole({ id: roleId, roleData })).unwrap();
                dispatch(setAlert('Role updated successfully!', 'success'));
                console.log("[CreateRole] Role updated successfully.");
            } else {
                await dispatch(createRole(roleData)).unwrap();
                dispatch(setAlert('Role created successfully!', 'success'));
                console.log("[CreateRole] Role created successfully.");
            }
            navigate('/rosterpage');
        } catch (err) {
            console.error('[CreateRole] Error submitting role:', err.response?.data || err.message);
            dispatch(setAlert(err || `Failed to ${isEditing ? 'update' : 'create'} role.`, 'danger'));
        }
    };

    // --- Render Logic ---
    const availableEmployees = allEmployees.filter(
        (emp) => !selectedEmployees.includes(emp._id)
    );

    // Display loading indicator if fetching initial data or saving
    if (isLoading) {
        return (
            <div className="vehicles-page">
                <div className='loading-indicator'>
                    <FontAwesomeIcon icon={faSpinner} spin size='2x' />
                    <p>{currentRoleStatus === 'loading' ? 'Loading role data...' : (employeeStatus === 'loading' ? 'Loading employees...' : 'Saving...')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="vehicles-page">
            <Alert />
            <div className="vehicles-header">
                <div className="title-breadcrumbs">
                    <h2>
                        <FontAwesomeIcon icon={faUserTag} /> {isEditing ? 'Edit Role' : 'Create New Role'}
                    </h2>
                    <div className="breadcrumbs">
                        <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
                        <span className="breadcrumb-separator"> / </span>
                        <Link to="/rosterpage" className="breadcrumb-link">Roster</Link>
                        <span className="breadcrumb-separator"> / </span>
                        <span className="breadcrumb-current">{isEditing ? 'Edit Role' : 'Create Role'}</span>
                    </div>
                </div>
            </div>

            <div className="form-container">
                <form onSubmit={handleSubmit} className="employee-form" noValidate>
                    <div className="form-group">
                        <label htmlFor="roleName">Role Name*</label>
                        <input
                            id="roleName"
                            type="text"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            placeholder="e.g., Senior Developer"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="roleDescription">Role Description*</label>
                        <textarea
                            id="roleDescription"
                            rows="3"
                            value={roleDescription}
                            onChange={(e) => setRoleDescription(e.target.value)}
                            placeholder="Describe the role responsibilities"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="roleColor">
                            <FontAwesomeIcon icon={faPalette} /> Color*
                        </label>
                        <select
                            id="roleColor"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            disabled={isLoading}
                        >
                            {COLORS.map((col) => (
                                <option key={col} value={col}>
                                    {col}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="employeeSelect">Assign Employees</label>
                        <div className="selected-employees-tags">
                            {selectedEmployees.length === 0 && <span className="no-selection-text">No employees assigned</span>}
                            {selectedEmployees.map((empId) => {
                                const emp = allEmployees.find((e) => e._id === empId);
                                return emp ? (
                                    // Use a class for the tag styling
                                    <span key={empId} className="employee-tag">
                                        {emp.name}
                                        <button
                                            type="button"
                                            onClick={() => removeEmployee(empId)}
                                            aria-label={`Remove ${emp.name}`}
                                            disabled={isLoading}
                                            className="remove-tag-btn"
                                        >
                                            <FontAwesomeIcon icon={faXmark} size="sm" />
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                        <select
                            id="employeeSelect"
                            onChange={handleAddEmployee}
                            disabled={isLoading || availableEmployees.length === 0}
                            value="" // Keep dropdown clear after selection
                        >
                            <option value="" disabled>
                                {availableEmployees.length > 0 ? '-- Select Employee to Add --' : '-- No more employees available --'}
                            </option>
                            {availableEmployees.map((emp) => (
                                <option key={emp._id} value={emp._id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>
                            <FontAwesomeIcon icon={faCalendar} /> Weekly Schedule (Current Week)
                        </label>
                        <div className="schedule-grid">
                            {weekDays.map((day) => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const dayLabel = format(day, 'EEE');
                                return (
                                    <div key={dayStr} className="schedule-day-row">
                                        <label htmlFor={`from-${dayStr}`} className="schedule-day-label">{dayLabel}</label>
                                        <input
                                            id={`from-${dayStr}`}
                                            type="time"
                                            value={schedule[dayStr]?.from || ''}
                                            onChange={(e) => handleTimeChange(dayStr, 'from', e.target.value)}
                                            disabled={isLoading}
                                        />
                                        <span className="schedule-time-separator">to</span>
                                        <input
                                            id={`to-${dayStr}`}
                                            type="time"
                                            value={schedule[dayStr]?.to || ''}
                                            onChange={(e) => handleTimeChange(dayStr, 'to', e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="form-footer">
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => navigate('/rosterpage')}
                            disabled={isLoading}
                        >
                            <FontAwesomeIcon icon={faTimes} /> Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-green"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={isEditing ? faPen : faSave} />
                                    {isEditing ? ' Update Role' : ' Create Role'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRole;
