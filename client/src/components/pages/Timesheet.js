// /home/digilab/timesheet/client/src/components/pages/Timesheet.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSelector, useDispatch } from 'react-redux'; // Import Redux hooks
import {
  faPen,
  faArrowLeft,
  faArrowRight,
  faPlus,
  faTrash,
  faDownload,
  faEnvelope,
  faSpinner,
  faExclamationCircle,
  faUserTie,
  faBuilding,
  faProjectDiagram,
  faClock,
  faUtensils,
  faStickyNote,
  faSignOutAlt,
  faInfoCircle,
  faChevronDown,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons'; // Existing icons
import { faDollarSign } from '@fortawesome/free-solid-svg-icons'; // Added for wage
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/Timesheet.scss';
import { DateTime } from 'luxon';
import DatePicker from 'react-datepicker'; // Import DatePicker

// Import Redux actions and selectors
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from '../../redux/slices/employeeSlice';
import { fetchClients, selectAllClients, selectClientStatus, selectClientError } from '../../redux/slices/clientSlice';
import { fetchProjects, selectProjectItems, selectProjectStatus, selectProjectError } from '../../redux/slices/projectSlice';
import {
    fetchTimesheets,
    deleteTimesheet, 
    downloadTimesheet, 
    sendTimesheet,
    selectAllTimesheets,
    selectTimesheetStatus,
    selectTimesheetError,
    selectTimesheetDownloadStatus, 
    selectTimesheetDownloadError,
    selectTimesheetSendStatus, 
    selectTimesheetSendError, 
    clearTimesheetError, clearDownloadStatus, clearSendStatus 
} from '../../redux/slices/timesheetSlice';
import { selectIsAuthenticated, selectAuthUser } from '../../redux/slices/authSlice'; // Assuming you need user info
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import { selectEmployerSettings, fetchEmployerSettings, selectSettingsStatus } from '../../redux/slices/settingsSlice'; // Import settings


import Select from "react-select"; // Assuming react-select is used here too based on filter controls

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

const dayNameToLuxonWeekday = {
  'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
  'Friday': 5, 'Saturday': 6, 'Sunday': 7,
};


const formatDateString = (dateString, format = 'yyyy-MM-dd') => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'Invalid Date';
    try {
        return DateTime.fromISO(dateString).toFormat(format);
    } catch (e) {
        console.error(`Error formatting date string ${dateString}:`, e);
        return 'Invalid Date';
    }
};

const formatTimeFromISO = (isoString, timezoneIdentifier, format = 'hh:mm a') => {
    if (!isoString) return 'N/A';
    const tz = timezoneIdentifier && DateTime.local().setZone(timezoneIdentifier).isValid
               ? timezoneIdentifier
               : DateTime.local().zoneName;
    try {
        return DateTime.fromISO(isoString, { zone: 'utc' })
               .setZone(tz)
               .toFormat(format);
    } catch (e) {
        console.error(`Error formatting time ${isoString} to timezone ${tz}:`, e);
        return 'Invalid Time';
    }
};

const formatHoursMinutes = (hoursDecimal) => {
    if (hoursDecimal == null || isNaN(hoursDecimal) || hoursDecimal <= 0) {
        return '00:00';
    }
    const totalMinutes = Math.round(hoursDecimal * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const formattedMinutes = minutes.toString().padStart(2, '0');

    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${formattedMinutes}m` : `${hours}h`;
    } else {
        return `${formattedMinutes}m`;
    }
};

const formatLunchDuration = (lunchDuration) => {
    if (!lunchDuration || typeof lunchDuration !== 'string' || !/^\d{2}:\d{2}$/.test(lunchDuration)) {
        return 'N/A';
    }
    return lunchDuration;
};

const calculateDateRange = (baseDate, type, startDayOfWeekName = 'Monday') => {
    let startDt = DateTime.fromJSDate(baseDate);
    let endDt;
    const targetWeekdayNum = dayNameToLuxonWeekday[startDayOfWeekName] || 1; // Default to Monday

    if (type === 'Daily') {
        startDt = startDt.startOf('day');
        endDt = startDt.endOf('day');
    } else if (type === 'Monthly') {
        // Monthly view is independent of start day of week for its main range
        startDt = startDt.startOf('month');
        endDt = startDt.endOf('month');
    } else {
        // Weekly or Fortnightly
        const currentWeekday = startDt.weekday;
        const daysToSubtract = (currentWeekday - targetWeekdayNum + 7) % 7;
        startDt = startDt.minus({ days: daysToSubtract }).startOf('day');

        if (type === 'Fortnightly') {
            endDt = startDt.plus({ days: 13 }).endOf('day');
        } else { // Weekly
            endDt = startDt.plus({ days: 6 }).endOf('day');
        }
    }
    return { start: startDt.toJSDate(), end: endDt.toJSDate() };
};

const generateDateColumns = (currentDate, viewType, startDayOfWeekName = 'Monday') => {
    const { start, end } = calculateDateRange(currentDate, viewType, startDayOfWeekName);
    const startDt = DateTime.fromJSDate(start);
    const endDt = DateTime.fromJSDate(end);
    const daysCount = endDt.diff(startDt, 'days').days + 1;

    return Array.from({ length: daysCount }, (_, i) => {
      const dayDt = startDt.plus({ days: i });
      return {
        date: dayDt.toJSDate(),
        longFormat: dayDt.toFormat('MMM dd, yyyy'),
        isoDate: dayDt.toFormat('yyyy-MM-dd'),
        dayName: dayDt.toFormat('EEEE'),
        shortDayName: dayDt.toFormat('EEE'),
        weekNumber: dayDt.weekNumber,
      };
    });
};

const getOrderedDays = (startDayName = 'Monday') => {
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const startIndex = allDays.indexOf(startDayName);
  if (startIndex === -1) { // Should not happen with valid settings
    console.warn(`Invalid startDayName: ${startDayName}, defaulting to Monday order.`);
    return allDays;
  }
  return [...allDays.slice(startIndex), ...allDays.slice(0, startIndex)];
};

const groupDatesByWeek = (dateColumns, startDayOfWeekName = 'Monday') => {
    if (!dateColumns || dateColumns.length === 0) return [];
    const targetWeekdayNum = dayNameToLuxonWeekday[startDayOfWeekName] || 1;

    const weeksMap = new Map();
    dateColumns.forEach(col => {
        const dateInWeek = DateTime.fromJSDate(col.date);

        // Calculate the start of *this specific column's week* based on custom start day
        const currentWeekdayOfCol = dateInWeek.weekday;
        const daysToSubtractForWeekStart = (currentWeekdayOfCol - targetWeekdayNum + 7) % 7;
        const weekStartDt = dateInWeek.minus({ days: daysToSubtractForWeekStart }).startOf('day');
        const weekEndDt = weekStartDt.plus({ days: 6 }).endOf('day');

        const weekKey = weekStartDt.toISODate(); // Use the actual start date of our defined week as key

        if (!weeksMap.has(weekKey)) {
            weeksMap.set(weekKey, {
                weekNumber: weekStartDt.weekNumber, // ISO week number of the calculated week start
                weekStartDate: weekStartDt.toJSDate(),
                weekEndDate: weekEndDt.toJSDate(),
                days: []
            });
        }
        weeksMap.get(weekKey).days.push(col);
    });

    return Array.from(weeksMap.values()).sort((a, b) => {
        const yearA = DateTime.fromJSDate(a.weekStartDate).year;
        const yearB = DateTime.fromJSDate(b.weekStartDate).year;
        if (yearA !== yearB) return yearA - yearB;
        return a.weekNumber - b.weekNumber;
    });
};

const getPeriodLabel = (viewType) => {
    switch (viewType) {
        case 'Daily': return 'Day';
        case 'Weekly': return 'Week';
        case 'Fortnightly': return 'Fortnight';
        case 'Monthly': return 'Month';
        default: return 'Period';
    }
};

// Get browser timezone once outside the component
const browserTimezone = DateTime.local().zoneName;


const Timesheet = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- Redux State ---
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employeeError = useSelector(selectEmployeeError);

  const clients = useSelector(selectAllClients);
  const clientStatus = useSelector(selectClientStatus);
  const clientError = useSelector(selectClientError);

  const projects = useSelector(selectProjectItems); // Changed selectAllProjects to selectProjectItems
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);

  const timesheets = useSelector(selectAllTimesheets);
  const timesheetStatus = useSelector(selectTimesheetStatus);
  const timesheetError = useSelector(selectTimesheetError);
  // Get download-specific state
  const timesheetDownloadStatus = useSelector(selectTimesheetDownloadStatus);
  const timesheetDownloadError = useSelector(selectTimesheetDownloadError);
  // Get send-specific state
  const timesheetSendStatus = useSelector(selectTimesheetSendStatus);
  const timesheetSendError = useSelector(selectTimesheetSendError);

  // Redux State for Settings
  const employerSettings = useSelector(selectEmployerSettings);
  const settingsStatus = useSelector(selectSettingsStatus);

  // --- Local UI State ---
  const [viewType, setViewType] = useState('Weekly');
  const [expandedRows, setExpandedRows] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDownloadFilters, setShowDownloadFilters] = useState(false);
  const [showSendFilters, setShowSendFilters] = useState(false);

  // State for Download/Send filters (kept local as they are UI specific)
  const [downloadEmail, setDownloadEmail] = useState('');
  const [downloadSelectedEmployee, setDownloadSelectedEmployee] = useState('');
  const [downloadStartDate, setDownloadStartDate] = useState(null);
  const [downloadEndDate, setDownloadEndDate] = useState(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sendSelectedEmployee, setSendSelectedEmployee] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id }
  const [sendStartDate, setSendStartDate] = useState(null);
  const [sendEndDate, setSendEndDate] = useState(null);

  const isAuthenticated = useSelector(selectIsAuthenticated); // Keep selectors inside component
  const user = useSelector(selectAuthUser); // Keep selectors inside component

  // --- Combined Loading and Error States ---
  // Find the Employee record for the logged-in user if their role is 'employee'
  const loggedInEmployeeRecord = useMemo(() => {
    if (user?.role === 'employee' && Array.isArray(employees) && user?._id) {
      return employees.find(emp => emp.userId === user._id);
    }
    return null;
  }, [employees, user]);

  const isDataLoading = useMemo(() => // Renamed to avoid conflict with download loading
    employeeStatus === 'loading' ||
    clientStatus === 'loading' ||
    projectStatus === 'loading' || // Projects
    timesheetStatus === 'loading' || // Timesheets
    settingsStatus === 'loading',    // Settings
    // Also consider settings loading if it affects initial render
    [employeeStatus, clientStatus, projectStatus, timesheetStatus, settingsStatus]
  );

  // Use Redux state for download loading status
  const isDownloading = useMemo(() => timesheetDownloadStatus === 'loading', [timesheetDownloadStatus]);

  // Use Redux state for send loading status
  const isSending = useMemo(() => timesheetSendStatus === 'loading', [timesheetSendStatus]);

  const combinedError = useMemo(() =>
    employeeError || clientError || projectError || timesheetError,
    [employeeError, clientError, projectError, timesheetError]
  );

  // Effect to show alerts for fetch/operation errors from Redux state
  useEffect(() => {
    // Combine all relevant Redux errors
    const reduxError = combinedError || timesheetDownloadError || timesheetSendError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
      // Optionally clear the specific Redux error after showing the alert
      // if (timesheetDownloadError) dispatch(clearDownloadStatus());
      // if (timesheetSendError) dispatch(clearSendStatus());
      // if (timesheetError) dispatch(clearTimesheetError());
      // etc.
    }
  }, [combinedError, timesheetDownloadError, timesheetSendError, dispatch]);

  // Initial data fetching on component mount
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch initial data
      if (employeeStatus === 'idle') dispatch(fetchEmployees());
      if (clientStatus === 'idle') dispatch(fetchClients());
      if (projectStatus === 'idle') dispatch(fetchProjects());
      // Fetch settings if not already loaded
      if (settingsStatus === 'idle') dispatch(fetchEmployerSettings());
      // Timesheets are fetched based on date/viewType in the next effect
    } else if (!isAuthenticated && employeeStatus !== 'idle') {
      // Optional: Clear data if user logs out? Depends on desired behavior.
    }
  }, [dispatch, isAuthenticated, employeeStatus, clientStatus, projectStatus, settingsStatus]);

  // Set default view type from settings once loaded
  useEffect(() => {
    if (settingsStatus === 'succeeded' && employerSettings?.defaultTimesheetViewType) {
      setViewType(employerSettings.defaultTimesheetViewType);
    }
  }, [settingsStatus, employerSettings]);

  // Fetch Timesheets when date or view type changes
  useEffect(() => {
    const startDaySetting = employerSettings?.timesheetStartDayOfWeek || 'Monday';
    if (isAuthenticated) {
        const { start, end } = calculateDateRange(currentDate, viewType, startDaySetting);
        const startDateStr = DateTime.fromJSDate(start).toFormat('yyyy-MM-dd');
        const endDateStr = DateTime.fromJSDate(end).toFormat('yyyy-MM-dd');
        dispatch(fetchTimesheets({ startDate: startDateStr, endDate: endDateStr }));
    }
  }, [dispatch, isAuthenticated, currentDate, viewType, employerSettings?.timesheetStartDayOfWeek]);


  const toggleExpand = (id) => {
    // Toggle the expanded state for a specific employee row
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
   };

    // --- Refactored Delete Confirmation ---
  const handleDeleteClick = (timesheetId) => {
    setItemToDelete({ id: timesheetId });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const canEditTimesheet = useCallback((timesheetEntry) => {
    if (user?.role === 'employer') return true; // Employers can always edit
    if (user?.role === 'employee') {
      if (employerSettings?.timesheetAllowOldEdits === false) {
        const entryDate = DateTime.fromISO(timesheetEntry.date);
        return DateTime.now().diff(entryDate, 'days').days <= 15;
      }
      return true; // If setting allows old edits or setting not loaded, allow edit
    }
    return false; // Default to no edit permission
  }, [user, employerSettings]);
  const handleUpdate = (timesheetEntry) => {
    if (timesheetEntry && timesheetEntry._id) {
      // Navigate to the edit timesheet page, passing the timesheet ID in the URL.
      // CreateTimesheet.js uses useParams() to get this ID as `timesheetIdForEdit`.
      // Ensure your React Router has a route like:
      // <Route path="/timesheet/create/:timesheetId" element={<CreateTimesheet />} />
      // OR <Route path="/timesheet/edit/:timesheetId" element={<CreateTimesheet />} />
      if (canEditTimesheet(timesheetEntry)) {
        navigate(`/timesheet/create/${timesheetEntry._id}`);
      } else {
        dispatch(setAlert("Editing of this timesheet is not allowed.", "warning"));
      }
    } else {
      console.error("Cannot edit timesheet: Missing timesheet ID.", timesheetEntry);
      dispatch(setAlert("Cannot edit timesheet: Missing ID.", "danger"));
    }
  };

   const confirmDeleteTimesheet = useCallback(async () => {
    // Delete a timesheet entry after confirmation
    if (!itemToDelete) return;
    const { id } = itemToDelete;
    dispatch(deleteTimesheet(id))
            .unwrap() // unwrap allows catching errors from the thunk promise
            .then(() => {
                dispatch(setAlert('Timesheet entry deleted successfully', 'success'));
                setShowDeleteConfirm(false); // Close modal on success
                setItemToDelete(null);
            })
            .catch((err) => {
                dispatch(setAlert(`Error deleting timesheet: ${err}`, 'danger'));
            });
    }
   , [itemToDelete, dispatch]); // Added itemToDelete, removed unused navigate

  // Navigate to the previous time period
  const handlePrev = () => {
    setCurrentDate(prevDate => {
        let dt = DateTime.fromJSDate(prevDate);
        let newDt;
        switch (viewType) {
            case 'Daily': newDt = dt.minus({ days: 1 }); break;
            case 'Weekly': newDt = dt.minus({ weeks: 1 }); break;
            case 'Fortnightly': newDt = dt.minus({ weeks: 2 }); break;
            case 'Monthly': newDt = dt.minus({ months: 1 }); break;
            default: newDt = dt.minus({ weeks: 1 }); break;
        }
        return newDt.toJSDate();
    });
   };

  // Navigate to the next time period
  const handleNext = () => {
     setCurrentDate(prevDate => {
        let dt = DateTime.fromJSDate(prevDate);
        let newDt;
        switch (viewType) {
            case 'Daily': newDt = dt.plus({ days: 1 }); break;
            case 'Weekly': newDt = dt.plus({ weeks: 1 }); break;
            case 'Fortnightly': newDt = dt.plus({ weeks: 2 }); break;
            case 'Monthly': newDt = dt.plus({ months: 1 }); break;
            default: newDt = dt.plus({ weeks: 1 }); break;
        }
        return newDt.toJSDate();
    });
   };

  // Handle sending the timesheet report via email
  const handleSendEmail = useCallback(async () => {
      if (!sendEmail || !/\S+@\S+\.\S+/.test(sendEmail)) { dispatch(setAlert('Please enter a valid recipient email address.', 'warning')); return; }
      // Clear local error on new attempt - REMOVED
      dispatch(clearSendStatus()); // Clear previous Redux send status/error

      const params = {
          email: sendEmail,
          employeeIds: sendSelectedEmployee ? [sendSelectedEmployee] : [],
          startDate: sendStartDate ? DateTime.fromJSDate(sendStartDate).toFormat('yyyy-MM-dd') : null,
          endDate: sendEndDate ? DateTime.fromJSDate(sendEndDate).toFormat('yyyy-MM-dd') : null,
          timezone: browserTimezone,
      };

      dispatch(sendTimesheet(params))
        .unwrap()
        .then((result) => {
          // Success
          setShowSendFilters(false); // Close filters on success
          setSendEmail(''); setSendSelectedEmployee(''); setSendStartDate(null); setSendEndDate(null); // Reset filters
          dispatch(setAlert(`Timesheet report sent successfully to ${result.email}`, 'success'));
        })
        .catch((error) => {
          // Error is handled by the useEffect that watches timesheetSendError and dispatches setAlert
          console.error('Send email dispatch failed:', error);
        });
  }, [sendEmail, sendSelectedEmployee, sendStartDate, sendEndDate, navigate, browserTimezone, dispatch]);

  // Handle downloading the timesheet report as an Excel file
  const handleDownload = useCallback(async () => { // Renamed from handleDownloadReport for clarity
      // Clear local error on new attempt - REMOVED
      dispatch(clearDownloadStatus()); // Clear previous Redux download status/error

      const params = {
          employeeIds: downloadSelectedEmployee ? [downloadSelectedEmployee] : [],
          startDate: downloadStartDate ? DateTime.fromJSDate(downloadStartDate).toFormat('yyyy-MM-dd') : null,
          endDate: downloadEndDate ? DateTime.fromJSDate(downloadEndDate).toFormat('yyyy-MM-dd') : null,
          timezone: browserTimezone,
      };

      dispatch(downloadTimesheet(params))
        .unwrap()
        .then((result) => {
          // Success: Create and trigger download link
          const url = window.URL.createObjectURL(result.blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', result.filename || 'timesheets_report.xlsx');
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          setShowDownloadFilters(false); // Close filters on success
          dispatch(setAlert('Timesheet report downloaded successfully.', 'success')); // Success alert
          setDownloadSelectedEmployee(''); setDownloadStartDate(null); setDownloadEndDate(null); // Reset filters
        })
        .catch((error) => {
          // Error is handled by the useEffect that watches timesheetDownloadError and dispatches setAlert
          console.error('Download dispatch failed:', error);
        });
  }, [downloadSelectedEmployee, downloadStartDate, downloadEndDate, navigate, browserTimezone, dispatch]);

  // Toggle function for Send Report section
  const toggleSendReport = () => {
    const currentlyShowing = showSendFilters;
    setShowSendFilters(!currentlyShowing);
    setShowDownloadFilters(false);
    // Clear errors when toggling - REMOVED
    dispatch(clearSendStatus()); // Clear Redux report status/error
    if (!currentlyShowing) { // Reset dates if opening
        setSendStartDate(null);
        setSendEndDate(null);
    }
  };

  // Toggle function for Download Report section
  const toggleDownloadReport = () => {
    const currentlyShowing = showDownloadFilters;
    setShowDownloadFilters(!currentlyShowing);
    setShowSendFilters(false); // Close send if opening download
    // Clear errors when toggling - REMOVED
    dispatch(clearDownloadStatus()); // Clear Redux report status/error
    if (!currentlyShowing) { // Reset dates if opening
        setDownloadStartDate(null);
        setDownloadEndDate(null);
    }
  };

  const startDayOfWeekSetting = useMemo(() => employerSettings?.timesheetStartDayOfWeek || 'Monday', [employerSettings]);

  // Generate date columns based on the current view type and date
  const dateColumns = useMemo(
    () => generateDateColumns(currentDate, viewType, startDayOfWeekSetting),
    [currentDate, viewType, startDayOfWeekSetting]
  );

  // Create a memoized set of employee IDs belonging to the current employer
  const employerEmployeeIds = useMemo(() => {
    if (user?.role === 'employer' && Array.isArray(employees)) {
      return new Set(employees.map(emp => emp._id));
    }
    return new Set(); // Return an empty set if not an employer or employees not loaded
  }, [employees, user?.role]);

  // Create a "scoped" version of timesheets, ensuring they belong to the employer's employees
  const scopedTimesheets = useMemo(() => {
    if (user?.role === 'employer') {
      return timesheets.filter(ts => {
        const employeeId = ts.employeeId?._id || ts.employeeId; // Handle populated vs unpopulated employeeId
        return employerEmployeeIds.has(employeeId);
      });
    } else if (user?.role === 'employee' && loggedInEmployeeRecord) {
      // Employee sees only their own timesheets
      // This provides an additional frontend filter even if the backend already scopes.
      return timesheets.filter(ts => {
        const timesheetEmployeeId = ts.employeeId?._id || ts.employeeId;
        return timesheetEmployeeId === loggedInEmployeeRecord._id;
      });
    }
    // Default to empty if no role matches or data isn't ready
    return []; 
  }, [timesheets, employerEmployeeIds, user, loggedInEmployeeRecord]);

  // Group timesheets by employee and structure data for the table
  const groupTimesheets = useMemo(() => {
      let grouped = {};
      const currentViewDates = new Set(dateColumns.map(d => d.isoDate));

      scopedTimesheets.forEach((timesheet) => { // Use scopedTimesheets here
        if (!timesheet || !timesheet.employeeId || !timesheet.date || !/^\d{4}-\d{2}-\d{2}$/.test(timesheet.date)) {
            return;
        }
        const entryLocalDate = timesheet.date;
        if (!currentViewDates.has(entryLocalDate)) return;

        const employeeIdValue = timesheet.employeeId?._id || timesheet.employeeId;
        const employee = employees.find((emp) => emp._id === employeeIdValue);
        const employeeName = employee?.name || `Unknown (${String(employeeIdValue).slice(-4)})`;
        const employeeStatus = employee?.status || 'Unknown';
        const employeeExpectedHours = employee?.expectedWeeklyHours || 40;

        const clientIdValue = timesheet.clientId?._id || timesheet.clientId;
        const projectIdValue = timesheet.projectId?._id || timesheet.projectId;
        const client = clientIdValue ? clients.find((c) => c._id === clientIdValue) : null;
        const clientName = client?.name || (clientIdValue ? 'N/A' : '');
        const project = projectIdValue ? projects.find((p) => p._id === projectIdValue) : null;
        const projectName = project?.name || (projectIdValue ? 'N/A' : '');

        if (!grouped[employeeIdValue]) {
          grouped[employeeIdValue] = {
            id: employeeIdValue, name: employeeName, status: employeeStatus,
            hoursPerDay: {}, details: [], expectedHours: employeeExpectedHours,
          };
          dateColumns.forEach(day => (grouped[employeeIdValue].hoursPerDay[day.isoDate] = 0));
        }

        grouped[employeeIdValue].hoursPerDay[entryLocalDate] += parseFloat(timesheet.totalHours || 0);
        grouped[employeeIdValue].details.push({
          ...timesheet,
          clientName, projectName,
          formattedLocalDate: entryLocalDate,
        });
      });

      Object.values(grouped).forEach(group => {
          group.details.sort((a, b) => {
              if (a.formattedLocalDate < b.formattedLocalDate) return -1;
              if (a.formattedLocalDate > b.formattedLocalDate) return 1;
              const timeA = a.startTime ? DateTime.fromISO(a.startTime, { zone: 'utc' }).toMillis() : 0;
              const timeB = b.startTime ? DateTime.fromISO(b.startTime, { zone: 'utc' }).toMillis() : 0;
              return timeA - timeB;
          });
      });

      return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));

    }, [scopedTimesheets, employees, clients, projects, dateColumns]);

  // Generate the display text for the current time period
  const periodDisplayText = useMemo(() => {
    if (!dateColumns || dateColumns.length === 0) return 'Loading...';
    const firstDay = DateTime.fromJSDate(dateColumns[0].date);
    if (viewType === 'Daily') {
        return firstDay.toFormat('MMM dd yyyy, EEE');
    } else {
        const lastDay = DateTime.fromJSDate(dateColumns[dateColumns.length - 1].date);
        const startFormat = 'MMM dd';
        const endFormat = firstDay.year !== lastDay.year ? 'MMM dd, yyyy' : 'MMM dd, yyyy';
        return `${firstDay.toFormat(startFormat)} - ${lastDay.toFormat(endFormat)}`;
    }
  }, [dateColumns, viewType]);

  // Get the label for the current period (e.g., 'Week', 'Day')
  const periodLabel = useMemo(() => getPeriodLabel(viewType), [viewType]);

  // Render table headers based on the view type
  const renderTableHeaders = () => {
    if (viewType === 'Daily') return null;

    const headers = [
        <th key="expand" className="col-expand"></th>,
        <th key="name" className="col-name">Name</th>,
    ];
    const orderedDayNames = getOrderedDays(startDayOfWeekSetting);

    if (viewType === 'Monthly' || viewType === 'Fortnightly') {
        headers.push(<th key="week" className="col-week">Week</th>);
        headers.push(<th key="week-period" className="col-week-period">Week Period</th>);
    }

    orderedDayNames.forEach(dayName => {
        headers.push(<th key={`${dayName}-h`} className="col-day">{dayName.substring(0, 3)}</th>);
    });
    headers.push(<th key="total" className="col-total total-header">Total</th>);
    return headers;
   };

  // Render a card for a single timesheet entry in the Daily view
  const renderDailyEntryCard = (entry, employeeName) => {
    const entryTimezone = entry.timezone || browserTimezone;
    const isLeaveEntry = entry.leaveType && entry.leaveType !== 'None';
    const totalHours = parseFloat(entry.totalHours) || 0;

    return (
      <div key={entry._id} className="daily-entry-card">
        <div className="daily-entry-header">
          <span className="employee-name"><FontAwesomeIcon icon={faUserTie} /> {employeeName}</span>
          <span className="total-hours">{formatHoursMinutes(totalHours)}</span>
          <div className="inline-actions">
            <button
              className={`icon-btn edit-btn ${!canEditTimesheet(entry) ? 'disabled-btn' : ''}`}
              onClick={() => handleUpdate(entry)}
              title={canEditTimesheet(entry) ? "Edit Entry" : "Editing not allowed"}
              // disabled={!canEditTimesheet(entry)} // Removed to allow onClick to fire
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button className='icon-btn delete-btn' onClick={() => handleDeleteClick(entry._id)} title="Delete Entry"><FontAwesomeIcon icon={faTrash} /></button>
          </div>
        </div>
        <div className="daily-entry-body">
          {isLeaveEntry ? (
            <>
              <div className="detail-item"><FontAwesomeIcon icon={faSignOutAlt} /> <strong>Leave:</strong> <span>{entry.leaveType}</span></div>
              {entry.description && (<div className="detail-item description-item"><FontAwesomeIcon icon={faInfoCircle} /> <strong>Description:</strong> <span>{entry.description}</span></div>)}
            </>
          ) : (
            <>
              <div className="detail-item"><FontAwesomeIcon icon={faBuilding} /> <strong>Client:</strong> <span>{entry.clientName || 'N/A'}</span></div>
              <div className="detail-item"><FontAwesomeIcon icon={faProjectDiagram} /> <strong>Project:</strong> <span>{entry.projectName || 'N/A'}</span></div>
              {/* Display Start Time and Actual Creation Time */}
              {entry.startTime && (<div className="detail-item stacked-time work-time-group">
                <div><FontAwesomeIcon icon={faClock} /> <strong className="work-time-label">Start:</strong> <span className="work-time-value">{formatTimeFromISO(entry.startTime, entryTimezone)}</span></div>
                {entry.createdAt && <div className="actual-time-sub-item"><span className="actual-time-label">Actual:</span> <span className="actual-time-value">{formatTimeFromISO(entry.createdAt, entryTimezone)}</span></div>}
              </div>)}
              {/* Display End Time and Actual Update Time */}
              {entry.endTime && (<div className="detail-item stacked-time work-time-group">
                <div><FontAwesomeIcon icon={faClock} /> <strong className="work-time-label">End:</strong> <span className="work-time-value">{formatTimeFromISO(entry.endTime, entryTimezone)}</span></div>
                {entry.updatedAt && <div className="actual-time-sub-item"><span className="actual-time-label">Actual:</span> <span className="actual-time-value">{formatTimeFromISO(entry.updatedAt, entryTimezone)}</span></div>}
              </div>)}
              <div className="detail-item"><FontAwesomeIcon icon={faUtensils} /> <strong>Lunch:</strong> <span>{entry.lunchBreak === 'Yes' ? formatLunchDuration(entry.lunchDuration) : 'No break'}</span></div>
              {(user?.role === 'employer' || (user?.role === 'employee' && employerSettings?.timesheetHideWage === false)) && entry.hourlyWage != null && (
                <div className="detail-item">
                  <FontAwesomeIcon icon={faDollarSign} /> <strong>Wage:</strong> <span>{`$${parseFloat(entry.hourlyWage).toFixed(2)}/hr`}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Render the container and cards for the Daily view
  const renderDailyView = () => {
    const dailyDate = dateColumns[0]?.isoDate;
    if (!dailyDate) return <div className="no-results">No date selected for daily view.</div>;

    const entriesForDay = groupTimesheets.flatMap(empGroup =>
        empGroup.details
            .filter(entry => entry.formattedLocalDate === dailyDate)
            .map(entry => ({ ...entry, employeeName: empGroup.name }))
    );

    if (entriesForDay.length === 0) {
        return <div className="no-results">No timesheet entries found for this day.</div>;
    }

    entriesForDay.sort((a, b) => {
        if (a.employeeName < b.employeeName) return -1;
        if (a.employeeName > b.employeeName) return 1;
        const timeA = a.startTime ? DateTime.fromISO(a.startTime, { zone: 'utc' }).toMillis() : 0;
        const timeB = b.startTime ? DateTime.fromISO(b.startTime, { zone: 'utc' }).toMillis() : 0;
        return timeA - timeB;
    });

    return (
        <div className="daily-view-container">
            {entriesForDay.map(entry => renderDailyEntryCard(entry, entry.employeeName))}
        </div>
    );
  };

  // Options for the employee filter dropdown
  const employeeOptions = useMemo(() => [
      { value: '', label: 'All Employees' },
      ...employees.map(e => ({ value: e._id, label: e.name }))
  ], [employees]);

  // Memoized selected option for the download filter dropdown
  const downloadSelectedEmployeeOption = useMemo(() =>
      employeeOptions.find(e => e.value === downloadSelectedEmployee) || null // Use downloadSelectedEmployee here
  , [employeeOptions, downloadSelectedEmployee]); // Corrected dependency

  // Memoized selected option for the send filter dropdown
  const sendSelectedEmployeeOption = useMemo(() =>
      employeeOptions.find(e => e.value === sendSelectedEmployee) || null
  , [employeeOptions, sendSelectedEmployee]);

  const viewTypeOptions = useMemo(() => [
    { value: 'Daily', label: 'View by Daily' },
    { value: 'Weekly', label: 'View by Weekly' },
    { value: 'Fortnightly', label: 'View by Fortnightly' },
    { value: 'Monthly', label: 'View by Monthly' },
  ], []);

  return (
    <div className='timesheet-page'>
       <Alert /> {/* Render Alert component here */}
       <div className="timesheet-header">
        <div className="title-breadcrumbs">
          <h3><FontAwesomeIcon icon={faPen} /> Timesheets</h3>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">Timesheets</span>
          </div>
        </div>
        {user?.role === 'employer' && (
          <div className="header-actions">
            <button className="btn btn-red" onClick={toggleDownloadReport} aria-expanded={showDownloadFilters} aria-controls="timesheet-download-options">
              <FontAwesomeIcon icon={faDownload} /> Download Report
            </button>
            <button className="btn btn-purple" onClick={toggleSendReport} aria-expanded={showSendFilters} aria-controls="timesheet-send-options">
              <FontAwesomeIcon icon={faEnvelope} /> Send Report
            </button>
          </div>
        )}
      </div>
      {user?.role === 'employer' && showDownloadFilters && (
          <div id="timesheet-download-options" className="timesheet-options-container download-options">
            <h4>Download Timesheet Report</h4>
            <div className="filter-controls">
              {/* Employee select is already conditional for employer */}
                <Select
                    options={employeeOptions}
                    value={downloadSelectedEmployeeOption}
                    onChange={option => setDownloadSelectedEmployee(option?.value || '')}
                    className="react-select-container filter-select"
                    classNamePrefix="react-select"
                    placeholder="Filter by Employee (Optional)"
                    isClearable={true}
                    isDisabled={isDownloading}
                />
              <DatePicker selected={downloadStartDate} onChange={setDownloadStartDate} selectsStart startDate={downloadStartDate} endDate={downloadEndDate} placeholderText="From Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Download Start Date" />
              <DatePicker selected={downloadEndDate} onChange={setDownloadEndDate} selectsEnd startDate={downloadStartDate} endDate={downloadEndDate} minDate={downloadStartDate} placeholderText="To Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Download End Date" />
              <button className="btn btn-red action-button" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (<><FontAwesomeIcon icon={faSpinner} spin /> Downloading...</>) : (<><FontAwesomeIcon icon={faDownload} /> Download</>)}
              </button>
            </div>
          </div>
      )}
      {user?.role === 'employer' && showSendFilters && (
          <div id="timesheet-send-options" className="timesheet-options-container send-options">
            <h4>Send Timesheet Report</h4>
            <div className="filter-controls">
              {/* Employee select is already conditional for employer */}
                <Select
                    options={employeeOptions}
                    value={sendSelectedEmployeeOption}
                    onChange={option => setSendSelectedEmployee(option?.value || '')}
                    className="react-select-container filter-select"
                    classNamePrefix="react-select"
                    placeholder="Filter by Employee (Optional)"
                    isClearable={true}
                    isDisabled={isSending}
                />
              <DatePicker selected={sendStartDate} onChange={setSendStartDate} selectsStart startDate={sendStartDate} endDate={sendEndDate} placeholderText="From Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Send Start Date" />
              <DatePicker selected={sendEndDate} onChange={setSendEndDate} selectsEnd startDate={sendStartDate} endDate={sendEndDate} minDate={sendStartDate} placeholderText="To Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Send End Date" />
              <input type="email" placeholder="Recipient email" value={sendEmail} onChange={e => { setSendEmail(e.target.value); }} className="filter-email" aria-label="Recipient Email" required />
              <button className="btn btn-purple action-button" onClick={handleSendEmail} disabled={isSending || !sendEmail || !/\S+@\S+\.\S+/.test(sendEmail)}>
                {isSending ? (<><FontAwesomeIcon icon={faSpinner} spin /> Sending...</>) : (<><FontAwesomeIcon icon={faEnvelope} /> Send</>)}
              </button>
            </div>
          </div>
      )}

       <div className='timesheet-navigation-bar general-timesheet-nav'>
        <div className='period-display'><h4>{periodDisplayText}</h4></div>
        <div className='navigation-controls'>
          <button className='nav-button btn btn-blue' onClick={handlePrev} aria-label={`Previous ${periodLabel}`}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Prev {periodLabel}</span>
          </button>
          <div className='view-type-select-wrapper'>
            <Select
              inputId='viewType'
              options={viewTypeOptions}
              value={viewTypeOptions.find(option => option.value === viewType)}
              onChange={option => setViewType(option ? option.value : 'Weekly')}
              className="react-select-container view-type-select-instance" // Added specific class
              classNamePrefix="react-select"
              aria-label="Select View Type"
              isSearchable={false}
            />
          </div>
          <button className='nav-button btn btn-blue' onClick={handleNext} aria-label={`Next ${periodLabel}`}>
             <span>Next {periodLabel}</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
        <Link to="/timesheet/create" className='btn btn-success create-timesheet-link'>
          <FontAwesomeIcon icon={faPlus} /> Create Timesheet
        </Link>
      </div>

       {isDataLoading ? (
         <div className='loading-indicator'><FontAwesomeIcon icon={faSpinner} spin size='2x' /> Loading Data...</div>
       ) : /* combinedError ? ( // Handled by Alert component
         <div className='error-message'><FontAwesomeIcon icon={faExclamationCircle} /> {combinedError}</div>
       ) : */ (
         viewType === 'Daily' ? (
            renderDailyView()
         ) : (
            <div className="timesheet-table-wrapper">
              <table className='timesheet-table'>
                <thead><tr>{renderTableHeaders()}</tr></thead>
                <tbody>
                  {groupTimesheets.length === 0 ? (
                    <tr><td colSpan={renderTableHeaders()?.length || 10} className="no-results">No timesheet entries found for this period.</td></tr>
                  ) : (
                    groupTimesheets.map((employeeGroup) => {
                      const isExpanded = !!expandedRows[employeeGroup.id];
                      const totalEmployeeHoursDecimal = Object.values(employeeGroup.hoursPerDay).reduce((sum, hours) => sum + hours, 0);
                      const weeksData = groupDatesByWeek(dateColumns, startDayOfWeekSetting);
                      const numWeeks = weeksData.length;
                      const useRowSpan = numWeeks > 1;
                      const orderedDayNames = getOrderedDays(startDayOfWeekSetting);

                      return (
                        weeksData.map((weekInfo, weekIndex) => {
                          const weekStartDateStr = DateTime.fromJSDate(weekInfo.weekStartDate).toFormat('MMM dd');
                          const weekEndDateStr = DateTime.fromJSDate(weekInfo.weekEndDate).toFormat('MMM dd');
                          const weekPeriod = `${weekStartDateStr} - ${weekEndDateStr}`;

                          return (
                            <tr key={`${employeeGroup.id}-week-${weekInfo.weekNumber}`} className={isExpanded ? 'expanded-parent' : ''}>
                              {weekIndex === 0 && (
                                <>
                                  <td rowSpan={useRowSpan ? numWeeks : 1} className="col-expand">
                                    <button onClick={() => toggleExpand(employeeGroup.id)} className='expand-btn' aria-expanded={isExpanded} aria-label={isExpanded ? 'Collapse row' : 'Expand row'}>
                                      <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                                    </button>
                                  </td>
                                  <td rowSpan={useRowSpan ? numWeeks : 1} className="col-name employee-name-cell">{employeeGroup.name}</td>
                                </>
                              )}
                              {(viewType === 'Monthly' || viewType === 'Fortnightly') && (
                                  <>
                                    <td className="col-week center-text">{weekInfo.weekNumber}</td>
                                    <td className="col-week-period center-text">{weekPeriod}</td>
                                  </>
                              )}

                              {orderedDayNames.map(dayName => {
                                const dayData = weekInfo.days.find(d => d.dayName === dayName);
                                const hours = dayData ? (employeeGroup.hoursPerDay[dayData.isoDate] || 0) : 0;
                                const dailyEntries = dayData ? employeeGroup.details.filter(entry => entry.formattedLocalDate === dayData.isoDate) : [];

                                return (
                                  <td key={`${employeeGroup.id}-${dayName}-${weekInfo.weekNumber}`} className={`col-day numeric daily-detail-cell ${isExpanded ? 'expanded' : ''}`}>
                                    {isExpanded ? (
                                      <div className="day-details-wrapper">
                                        {dailyEntries.length > 0 ? dailyEntries.map(entry => {
                                            const entryTimezone = entry.timezone || browserTimezone;
                                            const isLeaveEntry = entry.leaveType && entry.leaveType !== 'None';
                                            const totalHours = parseFloat(entry.totalHours) || 0;

                                            return (
                                              <div key={entry._id} className="timesheet-entry-detail-inline">
                                                <div className="inline-actions">
                                                    <button
                                                      className={`icon-btn edit-btn ${!canEditTimesheet(entry) ? 'disabled-btn' : ''}`}
                                                      onClick={() => handleUpdate(entry)}
                                                      title={canEditTimesheet(entry) ? "Edit Entry" : "Editing not allowed"}
                                                      // disabled={!canEditTimesheet(entry)} // Removed to allow onClick to fire
                                                    >
                                                      <FontAwesomeIcon icon={faPen} />
                                                    </button>
                                                    <button className='icon-btn delete-btn' onClick={() => handleDeleteClick(entry._id)} title="Delete Entry"><FontAwesomeIcon icon={faTrash} /></button>
                                                </div>
                                                <div className="detail-section"><span className="detail-label">EMPLOYEE:</span><span className="detail-value">{employeeGroup.name}</span></div>

                                                {isLeaveEntry ? (
                                                    <>
                                                        <div className="detail-section total-hours-section"><span className="detail-label">TOTAL</span><span className="detail-value bold">{formatHoursMinutes(totalHours)}</span></div>
                                                        <div className="detail-separator"></div>
                                                        <div className="detail-section"><span className="detail-label">Leave Type:</span><span className="detail-value">{entry.leaveType}</span></div>
                                                        {entry.description && (<div className="detail-section description-item"><span className="detail-label">Description:</span><span className="detail-value">{entry.description}</span></div>)}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="detail-section"><span className="detail-label">CLIENT:</span><span className="detail-value">{entry.clientName || 'N/A'}</span></div>
                                                        {entry.projectName && <div className="detail-section"><span className="detail-label">PROJECT:</span><span className="detail-value">{entry.projectName}</span></div>}
                                                        <div className="detail-separator"></div>
                                                        <div className="detail-section total-hours-section"><span className="detail-label">TOTAL</span><span className="detail-value bold">{formatHoursMinutes(totalHours)}</span></div>
                                                        <div className="detail-separator"></div>
                                                        {/* Display Start Time and Actual Creation Time */}
                                                        {entry.startTime && (<>
                                                          <div className="detail-section"><span className="detail-label work-time-label">Start:</span><span className="detail-value work-time-value">{formatTimeFromISO(entry.startTime, entryTimezone)}</span></div>
                                                          {entry.createdAt && <div className="detail-section sub-detail"><span className="detail-label actual-time-label">Actual:</span><span className="detail-value actual-time-value">{formatTimeFromISO(entry.createdAt, entryTimezone)}</span></div>}
                                                        </>)}
                                                        {/* Display End Time and Actual Update Time */}
                                                        {entry.endTime && (<>
                                                          <div className="detail-section"><span className="detail-label work-time-label">End:</span><span className="detail-value work-time-value">{formatTimeFromISO(entry.endTime, entryTimezone)}</span></div>
                                                          {/* Show updatedAt if different, otherwise show createdAt if entry was completed in one go */}
                                                          {entry.updatedAt && entry.updatedAt !== entry.createdAt && <div className="detail-section sub-detail"><span className="detail-label actual-time-label">Actual:</span><span className="detail-value actual-time-value">{formatTimeFromISO(entry.updatedAt, entryTimezone)}</span></div>}
                                                          {entry.updatedAt && entry.updatedAt === entry.createdAt && entry.createdAt && <div className="detail-section sub-detail"><span className="detail-label actual-time-label">Actual:</span><span className="detail-value actual-time-value">{formatTimeFromISO(entry.createdAt, entryTimezone)}</span></div>}
                                                        </>)}
                                                        <div className="detail-section"><span className="detail-label">Lunch:</span><span className="detail-value">{entry.lunchBreak === 'Yes' ? formatLunchDuration(entry.lunchDuration) : 'No break'}</span></div>
                                                        {(user?.role === 'employer' || (user?.role === 'employee' && employerSettings?.timesheetHideWage === false)) && entry.hourlyWage != null && (
                                                          <div className="detail-section">
                                                            <span className="detail-label">Wage:</span>
                                                            <span className="detail-value">{`$${parseFloat(entry.hourlyWage).toFixed(2)}/hr`}</span>
                                                          </div>
                                                        )}
                                                        {entry.notes && entry.notes.trim() !== '' && (
                                                            <>
                                                                <div className="detail-separator"></div>
                                                                <div className="detail-section"><span className="detail-label">Notes:</span><span className="detail-value">{entry.notes}</span></div>
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                              </div>
                                            );
                                        }) : (
                                          dayData ? <span className="no-entry-text">{formatHoursMinutes(0)}</span> : <span className="out-of-range"></span>
                                        )}
                                      </div>
                                    ) : (
                                      dayData ? (hours <= 0 ? <span className="no-entry-text">00:00</span> : formatHoursMinutes(hours)) : <span className="out-of-range"></span>
                                    )}
                                  </td>
                                );
                              })}

                              {weekIndex === 0 && (
                                <td rowSpan={useRowSpan ? numWeeks : 1} className="col-total numeric total-summary-cell">
                                  {totalEmployeeHoursDecimal <= 0 ? (
                                    <span className="no-entry-text">00:00</span>
                                  ) : (
                                    viewType === 'Weekly' ? (
                                      (() => {
                                        const weeklyExpected = Number(employeeGroup.expectedHours) || 0;
                                        const expectedHoursForPeriod = weeklyExpected;
                                        const overtimeHoursDecimal = Math.max(0, totalEmployeeHoursDecimal - expectedHoursForPeriod);
                                        return (
                                          <div className="total-details">
                                            <span>Expected: <strong>{formatHoursMinutes(expectedHoursForPeriod)}</strong></span>
                                            <span>Overtime: <strong className={overtimeHoursDecimal > 0 ? 'overtime' : ''}>{formatHoursMinutes(overtimeHoursDecimal)}</strong></span>
                                            <span>Total: <strong>{formatHoursMinutes(totalEmployeeHoursDecimal)}</strong></span>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <strong>{formatHoursMinutes(totalEmployeeHoursDecimal)}</strong>
                                    )
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
         )
       )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay"> {/* Re-use styles */}
            <div className="logout-confirm-dialog">
              <h4>Confirm Timesheet Deletion</h4>
              <p>Are you sure you want to permanently delete this timesheet entry? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={timesheetStatus === 'loading'}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteTimesheet} disabled={timesheetStatus === 'loading'}>
                  {timesheetStatus === 'loading' ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete Entry'}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default Timesheet;
