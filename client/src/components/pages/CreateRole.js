import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { DateTime } from 'luxon';
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

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';
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
    const isEditing = Boolean(roleId);

    // State
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [schedule, setSchedule] = useState({});
    const [isLoading, setIsLoading] = useState(false); // Combined loading state
    const [error, setError] = useState(null);

    // Derived State/Constants
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required. Please log in.');
                setIsLoading(false);
                navigate('/login');
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };
            const employeePromise = axios.get(`${API_URL}/employees`, { headers });
            const rolePromise = isEditing
                ? axios.get(`${API_URL}/roles/${roleId}`, { headers })
                : Promise.resolve(null);

            try {
                const [employeeRes, roleRes] = await Promise.all([employeePromise, rolePromise]);

                setAllEmployees(employeeRes.data || []);

                if (isEditing && roleRes?.data) {
                    const data = roleRes.data;
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
                }
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError(err.response?.data?.message || 'Failed to load data. Please try again.');
                if (err.response?.status === 401 || err.response?.status === 403) {
                    navigate('/login');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [roleId, isEditing, navigate]); // Added navigate to dependency array

    // Handlers
    const handleAddEmployee = useCallback((e) => {
        const empId = e.target.value;
        if (empId && !selectedEmployees.includes(empId)) {
            setSelectedEmployees((prev) => [...prev, empId]);
        }
        e.target.value = "";
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
    }, []);

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
        setError(null);

        const validationError = validateInputs();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication required. Please log in.');
            setIsLoading(false);
            navigate('/login');
            return;
        }

        const roleData = prepareSubmitData();

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            if (isEditing) {
                await axios.put(`${API_URL}/roles/${roleId}`, roleData, config);
            } else {
                await axios.post(`${API_URL}/roles`, roleData, config);
            }
            navigate('/rosterpage');

        } catch (err) {
            console.error('Error submitting role:', err.response?.data || err.message);
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} role. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    // Render
    const availableEmployees = allEmployees.filter(
        (emp) => !selectedEmployees.includes(emp._id)
    );

    // Loading state for initial fetch
    if (isLoading && !isEditing) { // Show loading only on initial fetch for create mode
        return (
            <div className="vehicles-page">
                <div className='loading-indicator'>
                    <FontAwesomeIcon icon={faSpinner} spin size='2x' />
                    <p>Loading data...</p>
                </div>
            </div>
        );
    }
     if (isLoading && isEditing && !roleName) { // Show loading on initial fetch for edit mode
        return (
            <div className="vehicles-page">
                <div className='loading-indicator'>
                    <FontAwesomeIcon icon={faSpinner} spin size='2x' />
                    <p>Loading role data...</p>
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
                    {error && (
                        <div className="form-error-message">
                            <FontAwesomeIcon icon={faExclamationCircle} /> {error}
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
