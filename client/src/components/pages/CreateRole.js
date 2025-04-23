import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom'; // Added Link for breadcrumbs potentially
import axios from 'axios';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { DateTime } from 'luxon';
import '../../styles/CreateRole.scss'; // Ensure path is correct
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faTimes,
    faPalette,
    faCalendar,
    faXmark,
    faSpinner, // Added for loading state
    faExclamationCircle, // Added for error display
} from '@fortawesome/free-solid-svg-icons';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';
const COLORS = ['Blue', 'Red', 'Green', 'Purple', 'Yellow', 'Default']; // Added more color options potentially

// Helper function for UTC conversion (similar to RosterPage)
const convertLocalTimeToUTC = (localTimeStr, dateStr) => {
    if (!localTimeStr || !dateStr) return ''; // Return empty string instead of '00:00' if not set
    try {
        // Use a fixed date part for conversion, only time matters for HH:mm format
        const localDateTime = DateTime.fromISO(`${dateStr}T${localTimeStr}`, { zone: 'local' });
        if (!localDateTime.isValid) return '';
        return localDateTime.toUTC().toFormat('HH:mm');
    } catch (error) {
        console.error("Error converting local time to UTC:", error);
        return ''; // Fallback on error
    }
};

// Helper function for Local conversion (similar to RosterPage)
const formatTimeUTCtoLocal = (timeStr, dateStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':') || !dateStr) return '';
    try {
        const utcDateTime = DateTime.fromISO(`${dateStr}T${timeStr}:00Z`, { zone: 'utc' });
        if (!utcDateTime.isValid) return '';
        return utcDateTime.toLocal().toFormat('HH:mm'); // Use HH:mm for input type=time
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
    const [color, setColor] = useState(COLORS[0]); // Default to first color
    const [allEmployees, setAllEmployees] = useState([]); // Renamed for clarity
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [schedule, setSchedule] = useState({}); // { 'yyyy-MM-dd': { from: 'HH:mm', to: 'HH:mm' } }
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Derived State/Constants
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // --- Effects ---

    // Fetch initial data (employees and role if editing)
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication required. Please log in.');
                setIsLoading(false);
                navigate('/login'); // Redirect if no token
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };
            const employeePromise = axios.get(`${API_URL}/employees`, { headers });
            const rolePromise = isEditing
                ? axios.get(`${API_URL}/roles/${roleId}`, { headers })
                : Promise.resolve(null); // Resolve immediately if not editing

            try {
                const [employeeRes, roleRes] = await Promise.all([employeePromise, rolePromise]);

                setAllEmployees(employeeRes.data || []);

                if (isEditing && roleRes?.data) {
                    const data = roleRes.data;
                    setRoleName(data.roleName || '');
                    setRoleDescription(data.roleDescription || '');
                    setColor(data.color || COLORS[0]);
                    // Ensure assignedEmployees are just IDs
                    setSelectedEmployees((data.assignedEmployees || []).map(emp => typeof emp === 'object' ? emp._id : emp));

                    // Format schedule from UTC (backend) to Local (frontend input)
                    const formattedSchedule = {};
                    (data.schedule || []).forEach((entry) => {
                        const dayStr = entry.day; // Assuming entry.day is 'yyyy-MM-dd'
                        // Check if the entry belongs to the current week being displayed/edited
                        const entryWeekStart = format(startOfWeek(parseISO(dayStr), { weekStartsOn: 1 }), 'yyyy-MM-dd');
                        const currentDisplayWeekStart = format(weekStart, 'yyyy-MM-dd');

                        if (entryWeekStart === currentDisplayWeekStart) {
                            formattedSchedule[dayStr] = {
                                from: formatTimeUTCtoLocal(entry.startTime, dayStr),
                                to: formatTimeUTCtoLocal(entry.endTime, dayStr),
                            };
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleId, isEditing, navigate]); // weekStart is stable within component lifecycle unless explicitly changed

    // --- Handlers ---

    const handleAddEmployee = useCallback((e) => {
        const empId = e.target.value;
        if (empId && !selectedEmployees.includes(empId)) {
            setSelectedEmployees((prev) => [...prev, empId]);
        }
        e.target.value = ""; // Reset dropdown after selection
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

    // --- Submission Logic ---

    const validateInputs = () => {
        if (!roleName.trim()) return 'Role Name is required.';
        if (!roleDescription.trim()) return 'Role Description is required.';
        // Basic time validation (ensure 'to' is after 'from' if both exist)
        for (const dayStr in schedule) {
            const { from, to } = schedule[dayStr];
            if (from && to && from >= to) {
                return `End time must be after start time for ${format(parseISO(dayStr), 'EEE')}.`;
            }
        }
        return null; // No validation errors
    };

    const prepareSubmitData = () => {
        // Prepare schedule: Convert local times back to UTC HH:mm for the backend
        const scheduleArray = weekDays
            .map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const daySchedule = schedule[dayStr];
                const localStart = daySchedule?.from;
                const localEnd = daySchedule?.to;

                // Only include day if at least one time is set
                if (!localStart && !localEnd) {
                    return null;
                }

                // Convert valid times to UTC
                const startTime = localStart ? convertLocalTimeToUTC(localStart, dayStr) : '';
                const endTime = localEnd ? convertLocalTimeToUTC(localEnd, dayStr) : '';

                // Include entry only if conversion was successful or times were intentionally empty
                 if ((localStart && !startTime) || (localEnd && !endTime)) {
                     // Handle conversion error case if needed, maybe throw error?
                     console.warn(`Time conversion issue for ${dayStr}`);
                     // Depending on requirements, maybe skip this day or return default times?
                     // For now, we'll include it with potentially empty times if conversion failed.
                 }

                return { day: dayStr, startTime: startTime || '', endTime: endTime || '' };
            })
            .filter(Boolean); // Remove null entries where no times were set

        return {
            roleName: roleName.trim(),
            roleDescription: roleDescription.trim(),
            color,
            assignedEmployees: selectedEmployees, // Already just IDs
            schedule: scheduleArray,
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission
        setError(null); // Clear previous errors

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
            let response;

            // Note: The role name conflict check across weeks might be complex and potentially
            // better handled fully on the backend for atomicity and race condition avoidance.
            // The frontend check is kept here as per the original logic but consider its limitations.

            if (isEditing) {
                response = await axios.put(`${API_URL}/roles/${roleId}`, roleData, config);
            } else {
                // Optional: Add frontend check for duplicate name in the *same week* before POST
                // This requires fetching existing roles again, which adds overhead.
                response = await axios.post(`${API_URL}/roles`, roleData, config);
            }

            console.log('Role submission response:', response.data);
            // Consider using a success message state instead of alert
            // alert(`Role ${isEditing ? 'updated' : 'created'} successfully!`);
            navigate('/rosterpage'); // Redirect on success

        } catch (err) {
            console.error('Error submitting role:', err.response?.data || err.message);
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} role. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Render ---

    const availableEmployees = allEmployees.filter(
        (emp) => !selectedEmployees.includes(emp._id)
    );

    return (
        // Using a div overlay, assuming it's rendered conditionally elsewhere
        // or is part of a route that always shows it as a modal overlay.
        <div className="modal-overlay">
            <form className="modal-box create-role" onSubmit={handleSubmit}>
                <div className="create-role__header">
                    <h2>
                        <FontAwesomeIcon icon={faUser} /> {isEditing ? 'Edit Role' : 'Create New Role'}
                    </h2>
                    <button
                        type="button"
                        className="create-role__close-btn"
                        onClick={() => navigate('/rosterpage')}
                        aria-label="Close"
                        disabled={isLoading}
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="create-role__error-message">
                        <FontAwesomeIcon icon={faExclamationCircle} /> {error}
                    </div>
                )}

                {/* Form Fields */}
                <div className="create-role__group">
                    <label htmlFor="roleName">Role Name*</label>
                    <input
                        id="roleName"
                        type="text"
                        className="create-role__input"
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder="e.g., Senior Developer"
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="create-role__group">
                    <label htmlFor="roleDescription">Role Description*</label>
                    <textarea
                        id="roleDescription"
                        className="create-role__input create-role__textarea"
                        rows="3"
                        value={roleDescription}
                        onChange={(e) => setRoleDescription(e.target.value)}
                        placeholder="Describe the role responsibilities"
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="create-role__group">
                    <label htmlFor="roleColor">
                        <FontAwesomeIcon icon={faPalette} /> Color*
                    </label>
                    <select
                        id="roleColor"
                        className="create-role__dropdown"
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

                {/* Employee Multi-Select */}
                <div className="create-role__group">
                    <label htmlFor="employeeSelect">Assign Employees</label>
                    <div className="create-role__multiselect">
                        <div className="create-role__selected-tags">
                            {selectedEmployees.length === 0 && <span className="create-role__no-selection">No employees assigned</span>}
                            {selectedEmployees.map((empId) => {
                                const emp = allEmployees.find((e) => e._id === empId);
                                return emp ? ( // Check if employee exists before rendering tag
                                    <span key={empId} className="create-role__tag">
                                        {emp.name}
                                        <button
                                            type="button"
                                            className="create-role__remove-tag-btn"
                                            onClick={() => removeEmployee(empId)}
                                            aria-label={`Remove ${emp.name}`}
                                            disabled={isLoading}
                                        >
                                            <FontAwesomeIcon icon={faXmark} />
                                        </button>
                                    </span>
                                ) : null; // Don't render tag if employee data isn't loaded/found
                            })}
                        </div>
                        <select
                            id="employeeSelect"
                            onChange={handleAddEmployee}
                            className="create-role__dropdown create-role__employee-select"
                            disabled={isLoading || availableEmployees.length === 0}
                            value="" // Controlled component needs value, reset in handler
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
                </div>

                {/* Schedule Section */}
                <div className="create-role__group create-role__schedule-container">
                    <label>
                        <FontAwesomeIcon icon={faCalendar} /> Weekly Schedule (Current Week)
                    </label>
                    <div className="create-role__day-wise-times">
                        {weekDays.map((day) => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const dayLabel = format(day, 'EEE');
                            return (
                                <div key={dayStr} className="create-role__time-row">
                                    <label htmlFor={`from-${dayStr}`}>{dayLabel}</label>
                                    <input
                                        id={`from-${dayStr}`}
                                        type="time"
                                        className="create-role__time-input"
                                        value={schedule[dayStr]?.from || ''}
                                        onChange={(e) => handleTimeChange(dayStr, 'from', e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <span className="create-role__time-separator">to</span>
                                    <input
                                        id={`to-${dayStr}`}
                                        type="time"
                                        className="create-role__time-input"
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
                <div className="create-role__footer">
                    <button
                        type="button"
                        className="btn btn-grey" // Use consistent button style
                        onClick={() => navigate('/rosterpage')}
                        disabled={isLoading}
                        style={{ marginRight: '0.5rem' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary" // Consider using btn-green for consistency?
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                            </>
                        ) : (
                            isEditing ? 'Update Role' : 'Create Role'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateRole;
