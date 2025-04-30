import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { DateTime } from 'luxon';

// Redux Imports
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from '../../redux/slices/employeeSlice';
import {
    fetchRoleById, createRole, updateRole,
    selectCurrentRole, selectCurrentRoleStatus, selectCurrentRoleError,
    selectRoleStatus, selectRoleError, // For create/update status
    clearCurrentRole, clearRoleError // Import clear actions
} from '../../redux/slices/roleSlice';
import { setAlert } from '../../redux/slices/alertSlice';

import '../../styles/Forms.scss'; // *** Use Forms.scss ***
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserTag, // Changed icon for Role
    faTimes,
    faPalette,
    faCalendar,
    faXmark,
    faSpinner,
    faExclamationCircle,
    faSave, // Added Save icon
    faPen, // Added Edit icon
} from '@fortawesome/free-solid-svg-icons';

const COLORS = ['Blue', 'Red', 'Green', 'Purple', 'Yellow', 'Default'];

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

    // Redux State
    const allEmployees = useSelector(selectAllEmployees);
    const employeeStatus = useSelector(selectEmployeeStatus);
    const employeeError = useSelector(selectEmployeeError);
    const currentRole = useSelector(selectCurrentRole);
    const currentRoleStatus = useSelector(selectCurrentRoleStatus);
    const currentRoleError = useSelector(selectCurrentRoleError);
    const saveStatus = useSelector(selectRoleStatus); // General status for create/update
    const saveError = useSelector(selectRoleError); // General error for create/update

    // Local UI State
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    // const [allEmployees, setAllEmployees] = useState([]); // Replaced by Redux
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [schedule, setSchedule] = useState({});
    // const [isLoading, setIsLoading] = useState(false); // Replaced by Redux status
    const [error, setError] = useState(null);

    // Derived State/Constants
    // Memoize weekStart to prevent it from changing on every render
    const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Fetch initial data
    // Fetch employees and the specific role if editing
    useEffect(() => {
        // Fetch employees if not already loaded
        if (employeeStatus === 'idle') {
            dispatch(fetchEmployees());
        }

        if (isEditing && roleId) {
            dispatch(fetchRoleById(roleId));
        } else {
            // Clear any previously loaded role if creating new
            dispatch(clearCurrentRole());
            // Reset local form state for creation mode
            setRoleName('');
            setRoleDescription('');
            setColor(COLORS[0]);
            setSelectedEmployees([]);
            setSchedule({});
        }

        // Cleanup on unmount or if roleId changes
        return () => {
            dispatch(clearCurrentRole());
            dispatch(clearRoleError()); // Clear potential save errors
        };
    }, [roleId, isEditing, dispatch, employeeStatus]);

    // Populate form when editing and currentRole data is loaded
    useEffect(() => {
        if (isEditing && currentRoleStatus === 'succeeded' && currentRole) {
            const data = currentRole;
            setRoleName(data.roleName || '');
            setRoleDescription(data.roleDescription || '');
            setColor(data.color || COLORS[0]);
            setSelectedEmployees((data.assignedEmployees || []).map(emp => typeof emp === 'object' ? emp._id : emp));

            const formattedSchedule = {};
            (data.schedule || []).forEach((entry) => {
                const dayStr = entry.day;
                // Check if dayStr is valid before parsing
                if (dayStr && dayStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    try {
                        const entryWeekStart = format(startOfWeek(parseISO(dayStr), { weekStartsOn: 1 }), 'yyyy-MM-dd');
                        const currentDisplayWeekStart = format(weekStart, 'yyyy-MM-dd');

                        if (entryWeekStart === currentDisplayWeekStart) {
                            formattedSchedule[dayStr] = {
                                from: formatTimeUTCtoLocal(entry.startTime, dayStr),
                                to: formatTimeUTCtoLocal(entry.endTime, dayStr),
                            };
                        }
                    } catch (parseError) {
                        console.error(`Error parsing date string: ${dayStr}`, parseError);
                        // Handle the error, e.g., skip this entry or set default values
                    }
                } else {
                    console.warn(`Invalid or missing date string in schedule entry: ${dayStr}`);
                }
            });
            setSchedule(formattedSchedule);
            setError(null); // Clear local error if data loads successfully
        } else if (isEditing && currentRoleStatus === 'failed') {
            setError(currentRoleError); // Show fetch error
        }
    }, [isEditing, currentRoleStatus, currentRole, currentRoleError, weekStart]); // Added weekStart

    // Combined loading state
    const isLoading = useMemo(() =>
        employeeStatus === 'loading' ||
        currentRoleStatus === 'loading' ||
        saveStatus === 'loading', // Include save status
        [employeeStatus, currentRoleStatus, saveStatus]
    );

    // Combined error state
    const combinedError = useMemo(() =>
        error || // Local validation/calculation errors
        employeeError ||
        currentRoleError ||
        saveError, // Include save error
        [error, employeeError, currentRoleError, saveError]
    );

    // Handlers
    const handleAddEmployee = useCallback((e) => {
        const empId = e.target.value;
        if (empId && !selectedEmployees.includes(empId)) {
            setSelectedEmployees((prev) => [...prev, empId]);
        }
        e.target.value = ""; // Clear the select dropdown
    }, [selectedEmployees]);

    const removeEmployee = useCallback((empIdToRemove) => {
        setSelectedEmployees((prev) => prev.filter((id) => id !== empIdToRemove));
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
        if (error) setError(null); // Clear local error on interaction
    }, [error]); // Added error dependency

    // Submission Logic
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
                     console.warn(`Time conversion issue for ${dayStr}`);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Clear local error
        dispatch(clearRoleError()); // Clear Redux save error

        const validationError = validateInputs();
        if (validationError) {
            setError(validationError);
            return;
        }

        const roleData = prepareSubmitData();

        try {
            if (isEditing) {
                await dispatch(updateRole({ id: roleId, roleData })).unwrap();
                dispatch(setAlert('Role updated successfully!', 'success'));
            } else {
                await dispatch(createRole(roleData)).unwrap();
                dispatch(setAlert('Role created successfully!', 'success'));
            }
            navigate('/rosterpage');

        } catch (err) {
            // Error from unwrap() or validation will be caught here
            console.error('Error submitting role:', err.response?.data || err.message);
            // Error state is handled by combinedError via Redux state
            // Optionally set local error too if needed: setError(err);
            dispatch(setAlert(err || `Failed to ${isEditing ? 'update' : 'create'} role.`, 'danger'));
        }
    };

    // Render
    const availableEmployees = allEmployees.filter(
        (emp) => !selectedEmployees.includes(emp._id)
    );

    // Show loading indicator based on combined state
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
        <div className="vehicles-page"> {/* Use standard page class */}
            <div className="vehicles-header"> {/* Use standard header */}
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
                {/* No header actions needed */}
            </div>

            <div className="form-container"> {/* Use standard form container */}
                <form onSubmit={handleSubmit} className="employee-form" noValidate> {/* Use standard form class */}
                    {combinedError && (
                        <div className="form-error-message">
                            <FontAwesomeIcon icon={faExclamationCircle} /> {combinedError}
                        </div>
                    )}

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

                    {/* Employee Multi-Select - Adapted for standard form */}
                    <div className="form-group">
                        <label htmlFor="employeeSelect">Assign Employees</label>
                        {/* Display selected employees */}
                        {/* Apply classes instead of inline styles */}
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
                                            // Use a class for the remove button styling
                                            className="remove-tag-btn"
                                        >
                                            <FontAwesomeIcon icon={faXmark} size="sm" />
                                        </button>
                                    </span>
                                ) : null;
                            })}
                        </div>
                        {/* Dropdown to add employees */}
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

                    {/* Schedule Section - Adapted for standard form */}
                    <div className="form-group">
                        <label>
                            <FontAwesomeIcon icon={faCalendar} /> Weekly Schedule (Current Week)
                        </label>
                        {/* Removed inline styles from schedule grid/rows */}
                        <div className="schedule-grid">
                            {weekDays.map((day) => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const dayLabel = format(day, 'EEE');
                                return (
                                    <div key={dayStr} className="schedule-day-row">
                                        {/* Removed inline style from label */}
                                        <label htmlFor={`from-${dayStr}`} className="schedule-day-label">{dayLabel}</label>
                                        <input
                                            id={`from-${dayStr}`}
                                            type="time"
                                            value={schedule[dayStr]?.from || ''}
                                            onChange={(e) => handleTimeChange(dayStr, 'from', e.target.value)}
                                            disabled={isLoading}
                                        />
                                        {/* Removed inline style from span */}
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

                    {/* Footer/Submit Button */}
                    <div className="form-footer">
                        <button
                            type="button"
                            className="btn btn-danger" // Changed to danger for cancel
                            onClick={() => navigate('/rosterpage')}
                            disabled={isLoading}
                        >
                           <FontAwesomeIcon icon={faTimes} /> Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-success" // Changed to success for save/update
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
