// /home/digilab/timesheet/client/src/components/pages/Timesheet.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSelector, useDispatch } from 'react-redux';
import {
  faPen, faArrowLeft, faArrowRight, faPlus, faTrash, faDownload, faEnvelope, faSpinner,
  faUserTie, faBuilding, faProjectDiagram, faClock, faUtensils, faStickyNote, faSignOutAlt,
  faInfoCircle, faChevronDown, faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { faDollarSign } from '@fortawesome/free-solid-svg-icons';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/Timesheet.scss';
import { DateTime } from 'luxon';
import DatePicker from 'react-datepicker';
import Select from "react-select";

import {
  fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError
} from '../../redux/slices/employeeSlice';
import {
  fetchClients, selectAllClients, selectClientStatus, selectClientError
} from '../../redux/slices/clientSlice';
import {
  fetchProjects, selectProjectItems, selectProjectStatus, selectProjectError
} from '../../redux/slices/projectSlice';
import {
  fetchTimesheets, deleteTimesheet, downloadTimesheet, sendTimesheet,
  selectAllTimesheets, selectTimesheetStatus, selectTimesheetError,
  selectTimesheetDownloadStatus, selectTimesheetDownloadError,
  selectTimesheetSendStatus, selectTimesheetSendError,
  clearTimesheetError, clearDownloadStatus, clearSendStatus
} from '../../redux/slices/timesheetSlice';
import { selectIsAuthenticated, selectAuthUser } from '../../redux/slices/authSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import { selectEmployerSettings, fetchEmployerSettings, selectSettingsStatus } from '../../redux/slices/settingsSlice';

const dayNameToLuxonWeekday = {
  'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
  'Friday': 5, 'Saturday': 6, 'Sunday': 7,
};

const formatDateString = (dateString, format = 'yyyy-MM-dd') => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'Invalid Date';
  try { return DateTime.fromISO(dateString).toFormat(format); }
  catch { return 'Invalid Date'; }
};

const formatTimeFromISO = (isoString, timezoneIdentifier, format = 'hh:mm a') => {
  if (!isoString) return 'N/A';
  const tz = timezoneIdentifier && DateTime.local().setZone(timezoneIdentifier).isValid
    ? timezoneIdentifier : DateTime.local().zoneName;
  try { return DateTime.fromISO(isoString, { zone: 'utc' }).setZone(tz).toFormat(format); }
  catch { return 'Invalid Time'; }
};

const formatHoursMinutes = (hoursDecimal) => {
  if (!hoursDecimal || isNaN(hoursDecimal) || hoursDecimal <= 0) return '00:00';
  const totalMinutes = Math.round(hoursDecimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? (minutes > 0 ? `${hours}h ${minutes.toString().padStart(2, '0')}m` : `${hours}h`)
    : `${minutes.toString().padStart(2, '0')}m`;
};

const formatLunchDuration = (lunchDuration) => {
  if (!lunchDuration || typeof lunchDuration !== 'string' || !/^\d{2}:\d{2}$/.test(lunchDuration)) return 'N/A';
  return lunchDuration;
};

const calculateDateRange = (baseDate, type, startDayOfWeekName = 'Monday') => {
  let startDt = DateTime.fromJSDate(baseDate);
  let endDt;
  const targetWeekdayNum = dayNameToLuxonWeekday[startDayOfWeekName] || 1;
  if (type === 'Daily') {
    startDt = startDt.startOf('day');
    endDt = startDt.endOf('day');
  } else if (type === 'Monthly') {
    startDt = startDt.startOf('month');
    endDt = startDt.endOf('month');
  } else {
    const currentWeekday = startDt.weekday;
    const daysToSubtract = (currentWeekday - targetWeekdayNum + 7) % 7;
    startDt = startDt.minus({ days: daysToSubtract }).startOf('day');
    endDt = type === 'Fortnightly'
      ? startDt.plus({ days: 13 }).endOf('day')
      : startDt.plus({ days: 6 }).endOf('day');
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
  if (startIndex === -1) return allDays;
  return [...allDays.slice(startIndex), ...allDays.slice(0, startIndex)];
};

const groupDatesByWeek = (dateColumns, startDayOfWeekName = 'Monday') => {
  if (!dateColumns || dateColumns.length === 0) return [];
  const targetWeekdayNum = dayNameToLuxonWeekday[startDayOfWeekName] || 1;
  const weeksMap = new Map();
  dateColumns.forEach(col => {
    const dateInWeek = DateTime.fromJSDate(col.date);
    const currentWeekdayOfCol = dateInWeek.weekday;
    const daysToSubtractForWeekStart = (currentWeekdayOfCol - targetWeekdayNum + 7) % 7;
    const weekStartDt = dateInWeek.minus({ days: daysToSubtractForWeekStart }).startOf('day');
    const weekEndDt = weekStartDt.plus({ days: 6 }).endOf('day');
    const weekKey = weekStartDt.toISODate();
    if (!weeksMap.has(weekKey)) {
      weeksMap.set(weekKey, {
        weekNumber: weekStartDt.weekNumber,
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

const browserTimezone = DateTime.local().zoneName;

const Timesheet = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employeeError = useSelector(selectEmployeeError);
  const clients = useSelector(selectAllClients);
  const clientStatus = useSelector(selectClientStatus);
  const clientError = useSelector(selectClientError);
  const projects = useSelector(selectProjectItems);
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);
  const timesheets = useSelector(selectAllTimesheets);
  const timesheetStatus = useSelector(selectTimesheetStatus);
  const timesheetError = useSelector(selectTimesheetError);
  const timesheetDownloadStatus = useSelector(selectTimesheetDownloadStatus);
  const timesheetDownloadError = useSelector(selectTimesheetDownloadError);
  const timesheetSendStatus = useSelector(selectTimesheetSendStatus);
  const timesheetSendError = useSelector(selectTimesheetSendError);
  const employerSettings = useSelector(selectEmployerSettings);
  const settingsStatus = useSelector(selectSettingsStatus);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectAuthUser);

  // Local UI state
  const [viewType, setViewType] = useState('Weekly');
  const [expandedRows, setExpandedRows] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDownloadFilters, setShowDownloadFilters] = useState(false);
  const [showSendFilters, setShowSendFilters] = useState(false);
  const [downloadEmail, setDownloadEmail] = useState('');
  const [downloadSelectedEmployee, setDownloadSelectedEmployee] = useState('');
  const [downloadStartDate, setDownloadStartDate] = useState(null);
  const [downloadEndDate, setDownloadEndDate] = useState(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sendSelectedEmployee, setSendSelectedEmployee] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [sendStartDate, setSendStartDate] = useState(null);
  const [sendEndDate, setSendEndDate] = useState(null);

  // Memoized helpers
  const loggedInEmployeeRecord = useMemo(() => {
    if (user?.role === 'employee' && Array.isArray(employees) && user?._id) {
      return employees.find(emp => emp.userId === user._id);
    }
    return null;
  }, [employees, user]);

  const isDataLoading = useMemo(() =>
    employeeStatus === 'loading' ||
    clientStatus === 'loading' ||
    projectStatus === 'loading' ||
    timesheetStatus === 'loading' ||
    settingsStatus === 'loading',
    [employeeStatus, clientStatus, projectStatus, timesheetStatus, settingsStatus]
  );
  const isDownloading = useMemo(() => timesheetDownloadStatus === 'loading', [timesheetDownloadStatus]);
  const isSending = useMemo(() => timesheetSendStatus === 'loading', [timesheetSendStatus]);
  const isDeleting = useMemo(() => timesheetSendStatus === 'loading', [timesheetSendStatus]); // Assuming delete status is similar to send status
  const combinedError = useMemo(() =>
    employeeError || clientError || projectError || timesheetError,
    [employeeError, clientError, projectError, timesheetError]
  );

  // Component lifecycle and action logs
  useEffect(() => {
    console.log("[Timesheet] Component mounted");
    return () => {
      console.log("[Timesheet] Component unmounted");
    };
  }, []);

  // Show alerts for errors
  useEffect(() => {
    if (combinedError) {
      console.error("[Timesheet] Error:", combinedError);
      dispatch(setAlert(combinedError, 'danger'));
    }
    if (timesheetDownloadError) {
      console.error("[Timesheet] Download error:", timesheetDownloadError);
      dispatch(setAlert(timesheetDownloadError, 'danger'));
    }
    if (timesheetSendError) {
      console.error("[Timesheet] Send error:", timesheetSendError);
      dispatch(setAlert(timesheetSendError, 'danger'));
    }
  }, [combinedError, timesheetDownloadError, timesheetSendError, dispatch]);

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      if (employeeStatus === 'idle') {
        console.log("[Timesheet] Fetching employees...");
        dispatch(fetchEmployees());
      }
      if (clientStatus === 'idle') {
        console.log("[Timesheet] Fetching clients...");
        dispatch(fetchClients());
      }
      if (projectStatus === 'idle') {
        console.log("[Timesheet] Fetching projects...");
        dispatch(fetchProjects());
      }
      if (settingsStatus === 'idle') {
        console.log("[Timesheet] Fetching employer settings...");
        dispatch(fetchEmployerSettings());
      }
    }
  }, [dispatch, isAuthenticated, employeeStatus, clientStatus, projectStatus, settingsStatus]);

  // Set default view type from settings
  useEffect(() => {
    if (settingsStatus === 'succeeded' && employerSettings?.defaultTimesheetViewType) {
      setViewType(employerSettings.defaultTimesheetViewType);
      console.log("[Timesheet] Set default view type from settings:", employerSettings.defaultTimesheetViewType);
    }
  }, [settingsStatus, employerSettings]);

  // Fetch timesheets when date/view changes
  useEffect(() => {
    const startDaySetting = employerSettings?.timesheetStartDayOfWeek || 'Monday';
    if (isAuthenticated) {
      const { start, end } = calculateDateRange(currentDate, viewType, startDaySetting);
      const startDateStr = DateTime.fromJSDate(start).toFormat('yyyy-MM-dd');
      const endDateStr = DateTime.fromJSDate(end).toFormat('yyyy-MM-dd');
      console.log("[Timesheet] Fetching timesheets for:", { startDate: startDateStr, endDate: endDateStr });
      dispatch(fetchTimesheets({ startDate: startDateStr, endDate: endDateStr }));
    }
  }, [dispatch, isAuthenticated, currentDate, viewType, employerSettings?.timesheetStartDayOfWeek]);

  // UI handlers
  const toggleExpand = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    console.log("[Timesheet] Toggled expand for employee:", id);
  };
  const handleDeleteClick = (timesheetId) => {
    setItemToDelete({ id: timesheetId });
    setShowDeleteConfirm(true);
    console.log("[Timesheet] Request to delete timesheet:", timesheetId);
  };
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    console.log("[Timesheet] Cancelled timesheet deletion");
  };

  const canEditTimesheet = useCallback((timesheetEntry) => {
    if (user?.role === 'employer') return true;
    if (user?.role === 'employee') {
      if (employerSettings?.timesheetAllowOldEdits === false) {
        const entryDate = DateTime.fromISO(timesheetEntry.date);
        return DateTime.now().diff(entryDate, 'days').days <= 15;
      }
      return true;
    }
    return false;
  }, [user, employerSettings]);

  const handleUpdate = (timesheetEntry) => {
    if (timesheetEntry && timesheetEntry._id) {
      if (canEditTimesheet(timesheetEntry)) {
        console.log("[Timesheet] Navigating to edit timesheet:", timesheetEntry._id);
        navigate(`/timesheet/create/${timesheetEntry._id}`);
      } else {
        dispatch(setAlert("Editing of this timesheet is not allowed.", "warning"));
      }
    } else {
      dispatch(setAlert("Cannot edit timesheet: Missing ID.", "danger"));
    }
  };

  const confirmDeleteTimesheet = useCallback(async () => {
    if (!itemToDelete) return;
    console.log("[Timesheet] Confirming delete for timesheet:", itemToDelete);
    const { id } = itemToDelete;
    dispatch(deleteTimesheet(id))
      .unwrap()
      .then(() => {
        dispatch(setAlert('Timesheet entry deleted successfully', 'success'));
        setShowDeleteConfirm(false);
        setItemToDelete(null);
        console.log("[Timesheet] Timesheet deleted:", itemToDelete);
      })
      .catch((err) => {
        dispatch(setAlert(`Error deleting timesheet: ${err}`, 'danger'));
        console.error("[Timesheet] Failed to delete timesheet:", err);
      });
  }, [itemToDelete, dispatch]);

  const handlePrev = () => {
    setCurrentDate(prevDate => {
      let dt = DateTime.fromJSDate(prevDate);
      let newDate;
      switch (viewType) {
        case 'Daily': newDate = dt.minus({ days: 1 }).toJSDate(); break;
        case 'Weekly': newDate = dt.minus({ weeks: 1 }).toJSDate(); break;
        case 'Fortnightly': newDate = dt.minus({ weeks: 2 }).toJSDate(); break;
        case 'Monthly': newDate = dt.minus({ months: 1 }).toJSDate(); break;
        default: newDate = dt.minus({ weeks: 1 }).toJSDate(); break;
      }
      console.log("[Timesheet] Navigated to previous period:", newDate);
      return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDate(prevDate => {
      let dt = DateTime.fromJSDate(prevDate);
      let newDate;
      switch (viewType) {
        case 'Daily': newDate = dt.plus({ days: 1 }).toJSDate(); break;
        case 'Weekly': newDate = dt.plus({ weeks: 1 }).toJSDate(); break;
        case 'Fortnightly': newDate = dt.plus({ weeks: 2 }).toJSDate(); break;
        case 'Monthly': newDate = dt.plus({ months: 1 }).toJSDate(); break;
        default: newDate = dt.plus({ weeks: 1 }).toJSDate(); break;
      }
      console.log("[Timesheet] Navigated to next period:", newDate);
      return newDate;
    });
  };

  // Download/send handlers
  const handleSendEmail = useCallback(async () => {
    if (!sendEmail || !/\S+@\S+\.\S+/.test(sendEmail)) {
      dispatch(setAlert('Please enter a valid recipient email address.', 'warning'));
      return;
    }
    dispatch(clearSendStatus());
    const params = {
      email: sendEmail,
      employeeIds: sendSelectedEmployee ? [sendSelectedEmployee] : [],
      startDate: sendStartDate ? DateTime.fromJSDate(sendStartDate).toFormat('yyyy-MM-dd') : null,
      endDate: sendEndDate ? DateTime.fromJSDate(sendEndDate).toFormat('yyyy-MM-dd') : null,
      timezone: browserTimezone,
    };
    console.log("[Timesheet] Sending timesheet report to:", sendEmail);
    dispatch(sendTimesheet(params))
      .unwrap()
      .then((result) => {
        setShowSendFilters(false);
        setSendEmail(''); setSendSelectedEmployee(''); setSendStartDate(null); setSendEndDate(null);
        dispatch(setAlert(`Timesheet report sent successfully to ${result.email}`, 'success'));
        console.log("[Timesheet] Timesheet report sent.");
      })
      .catch((err) => {
        console.error("[Timesheet] Failed to send timesheet report:", err);
      });
  }, [sendEmail, sendSelectedEmployee, sendStartDate, sendEndDate, browserTimezone, dispatch]);

  const handleDownload = useCallback(async () => {
    dispatch(clearDownloadStatus());
    const params = {
      employeeIds: downloadSelectedEmployee ? [downloadSelectedEmployee] : [],
      startDate: downloadStartDate ? DateTime.fromJSDate(downloadStartDate).toFormat('yyyy-MM-dd') : null,
      endDate: downloadEndDate ? DateTime.fromJSDate(downloadEndDate).toFormat('yyyy-MM-dd') : null,
      timezone: browserTimezone,
    };
    console.log("[Timesheet] Downloading timesheet report...");
    dispatch(downloadTimesheet(params))
      .unwrap()
      .then((result) => {
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        // Always use the backend-provided descriptive filename, fallback to a date-based name if missing
        let fallbackFilename = 'Timesheet_Report_' + new Date().toISOString().slice(0,10) + '.xlsx';
        link.setAttribute('download', result.filename || fallbackFilename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setShowDownloadFilters(false);
        dispatch(setAlert('Timesheet report downloaded successfully.', 'success'));
        setDownloadSelectedEmployee(''); setDownloadStartDate(null); setDownloadEndDate(null);
        console.log("[Timesheet] Timesheet report downloaded.");
      })
      .catch((err) => {
        console.error("[Timesheet] Failed to download timesheet report:", err);
      });
  }, [downloadSelectedEmployee, downloadStartDate, downloadEndDate, browserTimezone, dispatch]);

  const toggleSendReport = () => {
    setShowSendFilters(prev => !prev);
    setShowDownloadFilters(false);
    dispatch(clearSendStatus());
    if (!showSendFilters) { setSendStartDate(null); setSendEndDate(null); }
    console.log("[Timesheet] Toggled send report filter");
  };

  const toggleDownloadReport = () => {
    setShowDownloadFilters(prev => !prev);
    setShowSendFilters(false);
    dispatch(clearDownloadStatus());
    if (!showDownloadFilters) { setDownloadStartDate(null); setDownloadEndDate(null); }
    console.log("[Timesheet] Toggled download report filter");
  };

  const startDayOfWeekSetting = useMemo(() => employerSettings?.timesheetStartDayOfWeek || 'Monday', [employerSettings]);
  const dateColumns = useMemo(() => generateDateColumns(currentDate, viewType, startDayOfWeekSetting), [currentDate, viewType, startDayOfWeekSetting]);

  // Filter timesheets for employer/employee
  const employerEmployeeIds = useMemo(() => {
    if (user?.role === 'employer' && Array.isArray(employees)) {
      return new Set(employees.map(emp => emp._id));
    }
    return new Set();
  }, [employees, user?.role]);

  const scopedTimesheets = useMemo(() => {
    if (user?.role === 'employer') {
      return timesheets.filter(ts => {
        const employeeId = ts.employeeId?._id || ts.employeeId;
        return employerEmployeeIds.has(employeeId);
      });
    } else if (user?.role === 'employee' && loggedInEmployeeRecord) {
      return timesheets.filter(ts => {
        const timesheetEmployeeId = ts.employeeId?._id || ts.employeeId;
        return timesheetEmployeeId === loggedInEmployeeRecord._id;
      });
    }
    return [];
  }, [timesheets, employerEmployeeIds, user, loggedInEmployeeRecord]);

  // Group timesheets by employee for table
  const groupTimesheets = useMemo(() => {
    let grouped = {};
    const currentViewDates = new Set(dateColumns.map(d => d.isoDate));
    scopedTimesheets.forEach((timesheet) => {
      if (!timesheet || !timesheet.employeeId || !timesheet.date || !/^\d{4}-\d{2}-\d{2}$/.test(timesheet.date)) return;
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
          hoursPerDay: {}, details: [], expectedHours: employeeExpectedHours
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
      const hasActiveEntry = group.details.some(entry => entry.isActiveStatus === 'Active');
      group.displayStatus = hasActiveEntry ? 'Active' : 'Inactive';
    });
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [scopedTimesheets, employees, clients, projects, dateColumns]);

  const periodDisplayText = useMemo(() => {
    if (!dateColumns || dateColumns.length === 0) return 'Loading...';
    const firstDay = DateTime.fromJSDate(dateColumns[0].date);
    if (viewType === 'Daily') return firstDay.toFormat('MMM dd yyyy, EEE');
    const lastDay = DateTime.fromJSDate(dateColumns[dateColumns.length - 1].date);
    return `${firstDay.toFormat('MMM dd')} - ${lastDay.toFormat('MMM dd, yyyy')}`;
  }, [dateColumns, viewType]);

  const periodLabel = useMemo(() => getPeriodLabel(viewType), [viewType]);

  // Render table headers based on the view type
  const renderTableHeaders = () => {
    if (viewType === 'Daily') return null;

    const headers = [
        <th key="expand" className="col-expand"></th>,
        <th key="status" className="col-status center-text">Status</th>,
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
              {entry.startTime && (
                <div className="detail-item stacked-time work-time-group">
                  <div><FontAwesomeIcon icon={faClock} /> <strong className="work-time-label">Start:</strong> <span className="work-time-value">{formatTimeFromISO(entry.startTime, entryTimezone)}</span></div>
                  {entry.createdAt && <div className="actual-time-sub-item"><span className="actual-time-label">Actual Start:</span> <span className="actual-time-value">{formatTimeFromISO(entry.createdAt, entryTimezone)}</span></div>}
                </div>
              )}
              {/* Display End Time and Actual Update Time */}
              {entry.endTime && (
                <div className="detail-item stacked-time work-time-group">
                  <div><FontAwesomeIcon icon={faClock} /> <strong className="work-time-label">End:</strong> <span className="work-time-value">{formatTimeFromISO(entry.endTime, entryTimezone)}</span></div>
                  {entry.actualEndTime && <div className="actual-time-sub-item"><span className="actual-time-label">Actual End:</span> <span className="actual-time-value">{formatTimeFromISO(entry.actualEndTime, entryTimezone)}</span></div>}
                </div>
              )}
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

  return (
    <div className='timesheet-page'>
      <Alert />
      <div className="ts-page-header">
        <div className="ts-page-header__main-content">
          <h3 className="ts-page-header__title">
            <FontAwesomeIcon icon={faPen} className="ts-page-header__title-icon" /> Timesheets
          </h3>
          <div className="ts-page-header__breadcrumbs">
            <Link to="/dashboard" className="ts-page-header__breadcrumb-link">Dashboard</Link>
            <span className="ts-page-header__breadcrumb-separator"> / </span>
            <span className="ts-page-header__breadcrumb-current">Timesheets</span>
          </div>
        </div>
        {user?.role === 'employer' && (
          <div className="ts-page-header__actions">
            <button className="ts-page-header__action-button ts-page-header__action-button--download" onClick={toggleDownloadReport} aria-expanded={showDownloadFilters} aria-controls="timesheet-download-options">
              <FontAwesomeIcon icon={faDownload} className="ts-page-header__action-icon" /> Download Report
            </button>
            <button className="ts-page-header__action-button ts-page-header__action-button--send" onClick={toggleSendReport} aria-expanded={showSendFilters} aria-controls="timesheet-send-options">
              <FontAwesomeIcon icon={faEnvelope} className="ts-page-header__action-icon" /> Send Report
            </button>
          </div>
        )}
      </div>
      {user?.role === 'employer' && showDownloadFilters && (
          <div id="timesheet-download-options" className="timesheet-options-container download-options">
            <h4>Download Timesheet Report</h4>
            <div className="filter-controls">
              <Select
                options={employeeOptions}
                value={downloadSelectedEmployeeOption}
                onChange={option => setDownloadSelectedEmployee(option?.value || '')}
                className="react-select-container filter-select"
                classNamePrefix="react-select"
                placeholder="Filter by Employee (Optional)"
                isClearable={true}
                isDisabled={isDownloading}
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: base => ({ ...base, zIndex: 9999 }),
                  menu: base => ({ ...base, zIndex: 9999 })
                }}
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
              <Select
                options={employeeOptions}
                value={sendSelectedEmployeeOption}
                onChange={option => setSendSelectedEmployee(option?.value || '')}
                className="react-select-container filter-select"
                classNamePrefix="react-select"
                placeholder="Filter by Employee (Optional)"
                isClearable={true}
                isDisabled={isSending}
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: base => ({ ...base, zIndex: 9999 }),
                  menu: base => ({ ...base, zIndex: 9999 })
                }}
              />
              <DatePicker selected={sendStartDate} onChange={setSendStartDate} selectsStart startDate={sendStartDate} endDate={sendEndDate} placeholderText="From Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Send Start Date" />
              <DatePicker selected={sendEndDate} onChange={setSendEndDate} selectsEnd startDate={sendStartDate} endDate={sendEndDate} minDate={sendStartDate} placeholderText="To Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Send End Date" />
              <input type="email" placeholder="Recipient email" value={sendEmail} onChange={e => {
                setSendEmail(e.target.value);
                console.log("[Timesheet] Send email changed:", e.target.value);
              }} className="filter-email" aria-label="Recipient Email" required />
              <button className="btn btn-purple action-button" onClick={handleSendEmail} disabled={isSending || !sendEmail || !/\S+@\S+\.\S+/.test(sendEmail)}>
                {isSending ? (<><FontAwesomeIcon icon={faSpinner} spin /> Sending...</>) : (<><FontAwesomeIcon icon={faEnvelope} /> Send</>)}
              </button>
            </div>
          </div>
      )}

      {/* New Timesheet Navigation Bar Structure */}
      <div className='timesheet-nav'>
        <div className='timesheet-nav__period'>
          <h4 className='timesheet-nav__period-text'>{periodDisplayText}</h4>
        </div>
        <div className='timesheet-nav__controls-container'>
          <div className='timesheet-nav__controls'>
            <button className='timesheet-nav__button' onClick={handlePrev} aria-label={`Previous ${periodLabel}`}>
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Prev {periodLabel}</span>
            </button>
            <div className='timesheet-nav__view-select-wrapper'>
              <Select
                inputId='viewType'
                options={[
                  { value: 'Daily', label: 'View by Daily' },
                  { value: 'Weekly', label: 'View by Weekly' },
                  { value: 'Fortnightly', label: 'View by Fortnightly' },
                  { value: 'Monthly', label: 'View by Monthly' },
                ]}
                value={{ value: viewType, label: `View by ${viewType}` }}
                onChange={option => setViewType(option ? option.value : 'Weekly')}
                className="timesheet-nav__view-select"
                classNamePrefix="react-select"
                aria-label="Select View Type"
                isSearchable={false}
                menuPortalTarget={document.body}
                styles={{
                  menuPortal: base => ({ ...base, zIndex: 9999 }),
                  menu: base => ({ ...base, zIndex: 9999 })
                }}
              />
            </div>
            <button className='timesheet-nav__button' onClick={handleNext} aria-label={`Next ${periodLabel}`}>
              <span>Next {periodLabel}</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>
        </div>
        <div className='timesheet-nav__create-link-container'>
          <button
            type="button"
            className="ts-page-header__action-button ts-page-header__action-button--create"
            onClick={() => navigate('/timesheet/create')}
            disabled={isDataLoading}
          >
            <FontAwesomeIcon icon={faPlus} className="ts-page-header__action-icon" /> Create Timesheet
          </button>
        </div>
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
                                  <td rowSpan={useRowSpan ? numWeeks : 1} className="col-status center-text">
                                    {employeeGroup.displayStatus === 'Active' ? (
                                      <div className="styles_Badge___green__Rj6L3">
                                        <span className="styles_Badge_text___noIcon__RsIVg">Active</span>
                                      </div>
                                    ) : (
                                      <div className="styles_Badge___gray__20re2">
                                        <span className="styles_Badge_text___noIcon__RsIVg">Inactive</span>
                                      </div>
                                    )}
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
                                                         <div className="detail-section"><span className="detail-label work-time-label">Start:</span><span className="detail-value work-time-value">{formatTimeFromISO(entry.startTime, entryTimezone)}</span></div> {/* Corrected typo */}
                                                           {entry.createdAt && <div className="detail-section sub-detail"><span className="detail-label actual-time-label">Actual Start:</span><span className="detail-value actual-time-value">{formatTimeFromISO(entry.createdAt, entryTimezone)}</span></div>}
                                                        </>)}
                                                        {/* Display End Time and Actual Update Time */}
                                                        {entry.endTime && (<>
                                                          <div className="detail-section"><span className="detail-label work-time-label">End:</span><span className="detail-value work-time-value">{formatTimeFromISO(entry.endTime, entryTimezone)}</span></div>
                                                          {/* Show updatedAt if different, otherwise show createdAt if entry was completed in one go */}
                                                       {entry.actualEndTime && <div className="detail-section sub-detail"><span className="detail-label actual-time-label">Actual End:</span><span className="detail-value actual-time-value">{formatTimeFromISO(entry.actualEndTime, entryTimezone)}</span></div>}
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
          <div className="logout-confirm-overlay">
            <div className="logout-confirm-dialog">
              <h4>Confirm Timesheet Deletion</h4>
              <p>Are you sure you want to permanently delete this timesheet entry? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeleting}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteTimesheet} disabled={isDeleting}>
                  {isDeleting ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default Timesheet;
