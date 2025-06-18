// /home/digilab/timesheet/client/src/components/pages/ProjectTimesheet.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen, faArrowLeft, faArrowRight, faPlus, faTrash, faDownload, faEnvelope,
  faSpinner, faUserTie, faBuilding, faProjectDiagram, faClock, faUtensils,
  faStickyNote, faSignOutAlt, faInfoCircle, faChevronDown, faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import { faDollarSign } from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/Timesheet.scss';
import { DateTime } from 'luxon';
import Select from "react-select";

// Redux imports
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
  fetchTimesheets, deleteTimesheet, downloadProjectTimesheet, sendProjectTimesheet,
  selectAllTimesheets, selectTimesheetStatus, selectTimesheetError,
  selectTimesheetProjectDownloadStatus, selectTimesheetProjectDownloadError,
  selectTimesheetProjectSendStatus, selectTimesheetProjectSendError,
  clearProjectDownloadStatus, clearProjectSendStatus
} from '../../redux/slices/timesheetSlice';
import {
  selectEmployerSettings, fetchEmployerSettings, selectSettingsStatus
} from '../../redux/slices/settingsSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import { selectAuthUser } from '../../redux/slices/authSlice';
import Alert from '../layout/Alert';

const ALL_PROJECTS_VALUE = 'ALL_PROJECTS';
const dayNameToLuxonWeekday = {
  'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
  'Friday': 5, 'Saturday': 6, 'Sunday': 7,
};

// Format date string to readable format
/*const formatDateString = (dateString, format = 'yyyy-MM-dd') => {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'Invalid Date';
  try {
    return DateTime.fromISO(dateString).toFormat(format);
  } catch {
    return 'Invalid Date';
  }
};*/

// Format ISO time string to local time
const formatTimeFromISO = (isoString, timezoneIdentifier, format = 'hh:mm a') => {
  if (!isoString) return 'N/A';
  const tz = timezoneIdentifier && DateTime.local().setZone(timezoneIdentifier).isValid
    ? timezoneIdentifier : DateTime.local().zoneName;
  try {
    return DateTime.fromISO(isoString, { zone: 'utc' }).setZone(tz).toFormat(format);
  } catch {
    return 'Invalid Time';
  }
};

// Format decimal hours to "Xh XXm"
const formatHoursMinutes = (hoursDecimal) => {
  if (!hoursDecimal || isNaN(hoursDecimal) || hoursDecimal <= 0) return '00:00';
  const totalMinutes = Math.round(hoursDecimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes.toString().padStart(2, '0')}m` : `${hours}h`;
  return `${minutes.toString().padStart(2, '0')}m`;
};

// Format lunch duration or show 'N/A'
const formatLunchDuration = (lunchDuration) => {
  if (!lunchDuration || typeof lunchDuration !== 'string' || !/^\d{2}:\d{2}$/.test(lunchDuration)) return 'N/A';
  return lunchDuration;
};

// Calculate start and end dates for a period
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

// Generate array of date columns for the view
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

// Get ordered days starting from a specific day
const getOrderedDays = (startDayName = 'Monday') => {
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const startIndex = allDays.indexOf(startDayName);
  if (startIndex === -1) return allDays;
  return [...allDays.slice(startIndex), ...allDays.slice(0, startIndex)];
};

// Group date columns by week for Monthly/Fortnightly views
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

// Get label for period type
const getPeriodLabel = (viewType) => {
  switch (viewType) {
    case 'Daily': return 'Day';
    case 'Weekly': return 'Week';
    case 'Fortnightly': return 'Fortnight';
    case 'Monthly': return 'Month';
    default: return 'Period';
  }
};

const ProjectTimesheet = ({
  initialProjectId = '',
  onProjectChange,
  showProjectSelector = true
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux selectors
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
  const downloadStatus = useSelector(selectTimesheetProjectDownloadStatus);
  const user = useSelector(selectAuthUser);
  const downloadErrorRedux = useSelector(selectTimesheetProjectDownloadError);
  const sendStatus = useSelector(selectTimesheetProjectSendStatus);
  const sendErrorRedux = useSelector(selectTimesheetProjectSendError);
  const employerSettings = useSelector(selectEmployerSettings);
  const settingsStatus = useSelector(selectSettingsStatus);

  // Local state
  const [viewType, setViewType] = useState('Weekly');
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [expandedRows, setExpandedRows] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [email, setEmail] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDownloadFilters, setShowDownloadFilters] = useState(false);
  const [showSendFilters, setShowSendFilters] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const browserTimezone = useMemo(() => DateTime.local().zoneName, []);

  // Find logged-in employee record
  const loggedInEmployeeRecord = useMemo(() => {
    if (user?.role === 'employee' && Array.isArray(employees) && user?._id) {
      return employees.find(emp => emp.userId === user._id);
    }
    return null;
  }, [employees, user]);

  // Loading state
  const isLoading = useMemo(() =>
    employeeStatus === 'loading' ||
    clientStatus === 'loading' ||
    projectStatus === 'loading' ||
    timesheetStatus === 'loading' ||
    settingsStatus === 'loading',
    [employeeStatus, clientStatus, projectStatus, timesheetStatus, settingsStatus]
  );
  const isDownloading = useMemo(() => downloadStatus === 'loading', [downloadStatus]);
  const isSending = useMemo(() => sendStatus === 'loading', [sendStatus]);

  // Show errors as alerts
  useEffect(() => {
    const reduxError = employeeError || clientError || projectError || timesheetError || downloadErrorRedux || sendErrorRedux;
    if (reduxError) {
      console.error("[ProjectTimesheet] Error:", reduxError);
      dispatch(setAlert(reduxError, 'danger'));
      setError(reduxError); // <-- use setError so error is updated
    }
  }, [employeeError, clientError, projectError, timesheetError, downloadErrorRedux, sendErrorRedux, dispatch]);

  // Fetch initial data
  useEffect(() => {
    if (employeeStatus === 'idle') {
      dispatch(fetchEmployees());
    }
    if (clientStatus === 'idle') {
      dispatch(fetchClients());
    }
    if (projectStatus === 'idle') {
      dispatch(fetchProjects());
    }
    if (settingsStatus === 'idle') {
      dispatch(fetchEmployerSettings());
    }
  }, [dispatch, employeeStatus, clientStatus, projectStatus, settingsStatus]);

  // Set default view type from settings
  useEffect(() => {
    if (settingsStatus === 'succeeded' && employerSettings?.defaultTimesheetViewType) {
      setViewType(employerSettings.defaultTimesheetViewType);
    }
  }, [settingsStatus, employerSettings]);

  // Fetch timesheets when project/date/view changes
  useEffect(() => {
    if (!selectedProjectId) return;
    const startDaySetting = employerSettings?.timesheetStartDayOfWeek || 'Monday';
    setError(null);
    try {
      const { start, end } = calculateDateRange(currentDate, viewType, startDaySetting);
      const params = {
        startDate: DateTime.fromJSDate(start).toISODate(),
        endDate: DateTime.fromJSDate(end).toISODate(),
      };
      if (selectedProjectId !== ALL_PROJECTS_VALUE) params.projectId = selectedProjectId;
      dispatch(fetchTimesheets(params));
    } catch (error) {
      if (!error.message?.includes('token')) {
        dispatch(setAlert(error.response?.data?.message || 'Failed to fetch project timesheets.', 'danger'));
      }
    }
  }, [selectedProjectId, currentDate, viewType, dispatch, employerSettings?.timesheetStartDayOfWeek]);

  // Update selectedProjectId if prop changes
  useEffect(() => {
    setSelectedProjectId(initialProjectId || '');
  }, [initialProjectId]);

  // Handlers
  const handleProjectSelectChange = (option) => {
    const newProjectId = option?.value || '';
    setSelectedProjectId(newProjectId);
    if (onProjectChange) onProjectChange(newProjectId);
  };

  const toggleExpand = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDeleteClick = (timesheetId) => {
    setItemToDelete({ id: timesheetId });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  // Check if user can edit a timesheet
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

  // Go to edit page
  const handleUpdate = (timesheet) => {
    const clientId = timesheet.clientId?._id || timesheet.clientId;
    const projectId = timesheet.projectId?._id || timesheet.projectId;
    if (canEditTimesheet(timesheet)) {
      navigate(`/timesheet/project/edit/${clientId}/${projectId}/${timesheet._id}`);
    } else {
      dispatch(setAlert("Editing of this timesheet is not allowed.", "warning"));
    }
  };

  // Confirm and delete timesheet
  const confirmDeleteTimesheet = useCallback(async () => {
    if (!itemToDelete) return;
    const { id } = itemToDelete;
    setError(null);
    try {
      await dispatch(deleteTimesheet(id)).unwrap();
      dispatch(setAlert('Timesheet entry deleted successfully', 'success'));
    } catch (error) {
      console.error("[ProjectTimesheet] Error deleting timesheet:", error);
      dispatch(setAlert(error?.message || 'Failed to delete timesheet entry.', 'danger'));
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, dispatch]);

  // Go to previous period
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
      return newDate;
    });
  };

  // Go to next period
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
      return newDate;
    });
  };

  // Send report via email
  const handleSendEmail = useCallback(async () => {
    const isAllProjects = selectedProjectId === ALL_PROJECTS_VALUE;
    if (!isAllProjects && !selectedProjectId) {
      dispatch(setAlert('No project selected.', 'warning')); return;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      dispatch(setAlert('Please enter a valid recipient email address.', 'warning')); return;
    }
    dispatch(clearProjectSendStatus());
    try {
      const params = {
        email,
        projectIds: !isAllProjects && selectedProjectId ? [selectedProjectId] : [],
        employeeIds: selectedEmployee ? [selectedEmployee] : [],
        startDate: startDate ? DateTime.fromJSDate(startDate).toISODate() : null,
        endDate: endDate ? DateTime.fromJSDate(endDate).toISODate() : null,
        timezone: browserTimezone,
      };
      await dispatch(sendProjectTimesheet(params)).unwrap();
      setShowSendFilters(false); setEmail(''); setSelectedEmployee(''); setStartDate(null); setEndDate(null);
      dispatch(setAlert(`Project timesheet report sent successfully to ${email}`, 'success'));
    } catch (error) {
      // Error already handled by redux
    }
  }, [selectedProjectId, email, selectedEmployee, startDate, endDate, browserTimezone, dispatch]);

  // Download report
  const handleDownload = useCallback(async () => {
    const isAllProjects = selectedProjectId === ALL_PROJECTS_VALUE;
    if (!isAllProjects && !selectedProjectId) {
      dispatch(setAlert('No project selected.', 'warning')); return;
    }
    dispatch(clearProjectDownloadStatus());
    try {
      const params = {
        projectIds: !isAllProjects && selectedProjectId ? [selectedProjectId] : [],
        employeeIds: selectedEmployee ? [selectedEmployee] : [],
        startDate: startDate ? DateTime.fromJSDate(startDate).toFormat('yyyy-MM-dd') : null,
        endDate: endDate ? DateTime.fromJSDate(endDate).toISODate() : null,
        timezone: browserTimezone,
      };
      const result = await dispatch(downloadProjectTimesheet(params)).unwrap();
      const blob = new Blob([result.blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      let filename = isAllProjects ? `Timesheet_Report.xlsx` : `Project_Timesheet_Report.xlsx`;
      if (result.filename) filename = result.filename;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      dispatch(setAlert('Project timesheet report downloaded successfully.', 'success'));
      setShowDownloadFilters(false); setSelectedEmployee(''); setStartDate(null); setEndDate(null);
    } catch (error) {
      // Error already handled by redux
    }
  }, [selectedProjectId, selectedEmployee, startDate, endDate, browserTimezone, dispatch]);

  const startDayOfWeekSetting = useMemo(() => employerSettings?.timesheetStartDayOfWeek || 'Monday', [employerSettings]);
  const dateColumns = useMemo(() => generateDateColumns(currentDate, viewType, startDayOfWeekSetting), [currentDate, viewType, startDayOfWeekSetting]);

  // Filter timesheets based on user role
  const relevantTimesheets = useMemo(() => {
    if (user?.role === 'employee' && loggedInEmployeeRecord) {
      return timesheets.filter(ts => (ts.employeeId?._id || ts.employeeId) === loggedInEmployeeRecord._id);
    } else if (user?.role === 'employer') {
      return timesheets;
    }
    return [];
  }, [timesheets, user, loggedInEmployeeRecord]);

  // Group timesheets by employee for table
  const groupTimesheetsByEmployee = useMemo(() => {
    let grouped = {};
    const currentViewDates = new Set(dateColumns.map(d => d.isoDate));
    relevantTimesheets.forEach((timesheet) => {
      if (!timesheet || !timesheet.employeeId || !timesheet.date || !/^\d{4}-\d{2}-\d{2}$/.test(timesheet.date)) return;
      const entryLocalDate = timesheet.date;
      if (!currentViewDates.has(entryLocalDate)) return;
      const employeeIdValue = timesheet.employeeId?._id || timesheet.employeeId;
      const employee = employees.find((emp) => emp._id === employeeIdValue);
      const employeeName = employee?.name || `Unknown (${String(employeeIdValue).slice(-4)})`;
      const employeeModelStatus = employee?.status || 'Unknown';
      const employeeExpectedHours = employee?.expectedWeeklyHours || 40;
      const clientIdValue = timesheet.clientId?._id || timesheet.clientId;
      const client = clientIdValue ? clients.find((c) => c._id === clientIdValue) : null;
      const clientName = client?.name || (clientIdValue ? 'N/A' : '');
      const projectName = timesheet.projectId?.name || (timesheet.projectId ? 'Unknown Project' : '');
      if (!grouped[employeeIdValue]) {
        grouped[employeeIdValue] = {
          id: employeeIdValue, name: employeeName, status: employeeModelStatus,
          hoursPerDay: {}, details: [], expectedHours: employeeExpectedHours
        };
        dateColumns.forEach(day => (grouped[employeeIdValue].hoursPerDay[day.isoDate] = 0));
      }
      grouped[employeeIdValue].hoursPerDay[entryLocalDate] += parseFloat(timesheet.totalHours || 0);
      grouped[employeeIdValue].details.push({
        ...timesheet, clientName, projectName, formattedLocalDate: entryLocalDate,
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
  }, [relevantTimesheets, employees, clients, dateColumns]);

  // Display text for current period
  const periodDisplayText = useMemo(() => {
    if (!dateColumns || dateColumns.length === 0) return 'Loading...';
    const firstDay = DateTime.fromJSDate(dateColumns[0].date);
    if (viewType === 'Daily') return firstDay.toFormat('MMM dd yyyy, EEE');
    const lastDay = DateTime.fromJSDate(dateColumns[dateColumns.length - 1].date);
    return `${firstDay.toFormat('MMM dd')} - ${lastDay.toFormat('MMM dd, yyyy')}`;
  }, [dateColumns, viewType]);

  // Filter projects for dropdown
  const employerScopedProjects = useMemo(() => {
    if (!user || !projects || !clients) return [];
    if (user.role === 'employer') {
      return projects.filter(p => {
        const client = clients.find(c => (p.clientId?._id || p.clientId) === c._id);
        return client && client.employerId === user._id;
      });
    } else if (user.role === 'employee' && loggedInEmployeeRecord?.employerId) {
      const employeeEmployerId = typeof loggedInEmployeeRecord.employerId === 'object'
        ? loggedInEmployeeRecord.employerId._id
        : loggedInEmployeeRecord.employerId;
      return projects.filter(p => {
        const client = clients.find(c => (p.clientId?._id || p.clientId) === c._id);
        return client && client.employerId === employeeEmployerId;
      });
    }
    return [];
  }, [projects, clients, user, loggedInEmployeeRecord]);

  // Project dropdown options
  const projectOptions = useMemo(() => {
    const options = employerScopedProjects.map(p => ({ value: p._id, label: p.name }));
    if (showProjectSelector) options.unshift({ value: ALL_PROJECTS_VALUE, label: 'All Projects (Timesheets)' });
    return options;
  }, [employerScopedProjects, showProjectSelector]);

  const selectedProjectOption = useMemo(() =>
    projectOptions.find(opt => opt.value === selectedProjectId) || null,
    [projectOptions, selectedProjectId]
  );

  const selectedProjectObject = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === ALL_PROJECTS_VALUE || !Array.isArray(projects)) return null;
    return projects.find(p => p._id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const periodLabel = useMemo(() => getPeriodLabel(viewType), [viewType]);

  // Render table headers
  const renderTableHeaders = () => {
    if (viewType === 'Daily') return null;
    const headers = [
      <th key="expand" className="col-expand"></th>,
      <th key="status" className="col-status center-text">Status</th>,
      <th key="name" className="col-name">Employee</th>,
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

  // Render daily entry card
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
              {entry.startTime && (
                <div className="detail-item stacked-time work-time-group">
                  <div><FontAwesomeIcon icon={faClock} /> <strong className="work-time-label">Start:</strong> <span className="work-time-value">{formatTimeFromISO(entry.startTime, entryTimezone)}</span></div>
                  {entry.createdAt && <div className="actual-time-sub-item"><span className="actual-time-label">Actual Start:</span> <span className="actual-time-value">{formatTimeFromISO(entry.createdAt, entryTimezone)}</span></div>}
                </div>
              )}
              {entry.endTime && (
                <div className="detail-item stacked-time work-time-group">
                  <div><FontAwesomeIcon icon={faClock} /> <strong className="work-time-label">End:</strong> <span className="work-time-value">{formatTimeFromISO(entry.endTime, entryTimezone)}</span></div>
                  {entry.actualEndTime && <div className="actual-time-sub-item"><span className="actual-time-label">Actual End:</span> <span className="actual-time-value">{formatTimeFromISO(entry.actualEndTime, entryTimezone)}</span></div>}
                </div>
              )}
              <div className="detail-item"><FontAwesomeIcon icon={faUtensils} /> <strong>Lunch:</strong> <span>{entry.lunchBreak === 'Yes' ? formatLunchDuration(entry.lunchDuration) : 'No break'}</span></div>
              {entry.notes && entry.notes.trim() !== '' && (
                <div className="detail-item notes-item"><FontAwesomeIcon icon={faStickyNote} /> <strong>Notes:</strong> <span>{entry.notes}</span></div>
              )}
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

  // Render daily view
  const renderDailyView = () => {
    const dailyDate = dateColumns[0]?.isoDate;
    if (!dailyDate) return <div className="no-results">No date selected for daily view.</div>;
    const entriesForDay = groupTimesheetsByEmployee.flatMap(empGroup =>
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

  // Employee filter options for download/send
  const employeeOptions = useMemo(() => [
    { value: '', label: 'All Employees' },
    ...employees.map(e => ({ value: e._id, label: e.name }))
  ], [employees]);

  const selectedEmployeeOption = useMemo(() =>
    employeeOptions.find(e => e.value === selectedEmployee) || null,
    [employeeOptions, selectedEmployee]
  );

  const viewTypeOptions = useMemo(() => [
    { value: 'Daily', label: 'View by Daily' },
    { value: 'Weekly', label: 'View by Weekly' },
    { value: 'Fortnightly', label: 'View by Fortnightly' },
    { value: 'Monthly', label: 'View by Monthly' },
  ], []);

  // Add this helper function near the top of the file
  /*function normalizeTimeInput(timeValue) {
    if (!timeValue) return '';
    // If already in HH:mm format
    if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
      return timeValue;
    }
    // If it's a Date object
    if (timeValue instanceof Date && !isNaN(timeValue)) {
      return DateTime.fromJSDate(timeValue).toFormat('HH:mm');
    }
    // If it's a string that parses as a Date
    const parsedDate = new Date(timeValue);
    if (!isNaN(parsedDate)) {
      return DateTime.fromJSDate(parsedDate).toFormat('HH:mm');
    }
    // fallback
    return '';
  }*/

  // Add this helper at the top (after imports)
  function formatDisplayTime(timeValue, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
    if (!timeValue) return '';
    // If already in HH:mm format, show as hh:mm a
    if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
      return DateTime.fromFormat(timeValue, 'HH:mm', { zone: timezone }).toFormat('hh:mm a');
    }
    // If ISO string
    if (typeof timeValue === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(timeValue)) {
      return DateTime.fromISO(timeValue, { zone: 'utc' }).setZone(timezone).toFormat('hh:mm a');
    }
    // If Date object
    if (timeValue instanceof Date && !isNaN(timeValue)) {
      return DateTime.fromJSDate(timeValue).setZone(timezone).toFormat('hh:mm a');
    }
    // If string that parses as Date
    const parsedDate = new Date(timeValue);
    if (!isNaN(parsedDate)) {
      return DateTime.fromJSDate(parsedDate).setZone(timezone).toFormat('hh:mm a');
    }
    return '';
  }

  // Render
  return (
    <div className='project-timesheet-container timesheet-page'>
      <Alert />
      {error && (
        <div className="form-error-message" style={{ marginBottom: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <div className="ts-page-header">
        <div className="ts-page-header__main-content">
          <h3 className="ts-page-header__title">
            <FontAwesomeIcon icon={faProjectDiagram} className="ts-page-header__title-icon" /> Project Timesheet
          </h3>
        </div>
        {user?.role === 'employer' && (
          <div className="ts-page-header__actions">
            <button className="ts-page-header__action-button ts-page-header__action-button--download" onClick={() => { setShowDownloadFilters(prev => !prev); setShowSendFilters(false); dispatch(clearProjectDownloadStatus()); }} aria-expanded={showDownloadFilters} aria-controls="project-timesheet-download-options">
              <FontAwesomeIcon icon={faDownload} className="ts-page-header__action-icon" /> Download Report
            </button>
            <button className="ts-page-header__action-button ts-page-header__action-button--send" onClick={() => { setShowSendFilters(prev => !prev); setShowDownloadFilters(false); dispatch(clearProjectSendStatus()); }} aria-expanded={showSendFilters} aria-controls="project-timesheet-send-options">
              <FontAwesomeIcon icon={faEnvelope} className="ts-page-header__action-icon" /> Send Report
            </button>
          </div>
        )}
      </div>

      {user?.role === 'employer' && showDownloadFilters && (
        <div id="project-timesheet-download-options" className="timesheet-options-container download-options">
          <h4>Download Project Timesheet Report</h4>
          <div className="filter-controls">
            <Select
                options={employeeOptions}
                value={selectedEmployeeOption}
                onChange={option => setSelectedEmployee(option?.value || '')}
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
            <DatePicker selected={startDate} onChange={setStartDate} selectsStart startDate={startDate} endDate={endDate} placeholderText="From Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Download Start Date" />
            <DatePicker selected={endDate} onChange={setEndDate} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="To Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Download End Date" />
            <button className="btn btn-red action-button" onClick={handleDownload} disabled={isDownloading || !selectedProjectId}>
              {isDownloading ? (<><FontAwesomeIcon icon={faSpinner} spin /> Downloading...</>) : (<><FontAwesomeIcon icon={faDownload} /> Download</>)}
            </button>
          </div>
           {!selectedProjectId && <small className="error-text">Please select a project first.</small>}
        </div>
      )}
      {user?.role === 'employer' && showSendFilters && (
        <div id="project-timesheet-send-options" className="timesheet-options-container send-options">
          <h4>Send Project Timesheet Report</h4>
          <div className="filter-controls">
            <Select
                options={employeeOptions}
                value={selectedEmployeeOption}
                onChange={option => setSelectedEmployee(option?.value || '')}
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
            <DatePicker selected={startDate} onChange={setStartDate} selectsStart startDate={startDate} endDate={endDate} placeholderText="From Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Send Start Date" />
            <DatePicker selected={endDate} onChange={setEndDate} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="To Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Send End Date" />
            <input type="email" placeholder="Recipient email" value={email} onChange={e => setEmail(e.target.value)} className="filter-email" aria-label="Recipient Email" required />
            <button className="btn btn-purple action-button" onClick={handleSendEmail} disabled={isSending || !email || !/\S+@\S+\.\S+/.test(email) || !selectedProjectId}>
              {isSending ? (<><FontAwesomeIcon icon={faSpinner} spin /> Sending...</>) : (<><FontAwesomeIcon icon={faEnvelope} /> Send</>)}
            </button>
          </div>
           {!selectedProjectId && <small className="error-text">Please select a project first.</small>}
        </div>
      )}
      {/* Project Selector - now outside and before the main nav bar */}
      {showProjectSelector && (
        <div className="project-selector-wrapper">
          <div className="project-selector-container">
              <Select
                  options={projectOptions}
                  value={selectedProjectOption}
                  onChange={handleProjectSelectChange}
                  inputId="projectTimesheetProjectSelect"
                  placeholder="Select a Project..."
                  className="react-select-container project-select"
                  classNamePrefix="react-select"
                  isLoading={isLoading && !projects.length}
                  isDisabled={isLoading}
                  isClearable={false}
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    menu: base => ({ ...base, zIndex: 9999 })
                  }}
              />
          </div>
        </div>
      )}

      {/* Main navigation bar for period, controls, create */}
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
                inputId='projectTimesheetViewType'
                options={viewTypeOptions}
                value={viewTypeOptions.find(option => option.value === viewType)}
                onChange={option => setViewType(option ? option.value : 'Weekly')}
                className="timesheet-nav__view-select"
                classNamePrefix="react-select"
                aria-label="Select View Type"
                isSearchable={false}
                isDisabled={isLoading}
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
            <Link
              to={selectedProjectObject ? `/timesheet/project/create/${selectedProjectObject.clientId?._id || selectedProjectObject.clientId}/${selectedProjectObject._id}` : '#'}
              className={`timesheet-nav__create-link ${!selectedProjectObject ? 'disabled-link' : ''}`}
              aria-disabled={!selectedProjectObject}
            >
              <FontAwesomeIcon icon={faPlus} /> Create Project Timesheet
            </Link>
          </div>
        </div>
       {isLoading ? (
         <div className='loading-indicator'><FontAwesomeIcon icon={faSpinner} spin size='2x' /> Loading Data...</div>
       ) : !selectedProjectId ? (
         <div className='no-results'>Please select a project {showProjectSelector ? '(or "All Projects") ' : ''}to view timesheets.</div>
       ) : (
         viewType === 'Daily' ? (
            renderDailyView()
         ) : (
            <div className="timesheet-table-wrapper">
              <table className='timesheet-table'>
                <thead><tr>{renderTableHeaders()}</tr></thead>
                <tbody>
                  {groupTimesheetsByEmployee.length === 0 ? (
                    <tr><td colSpan={renderTableHeaders()?.length || 10} className="no-results">No timesheet entries found for the selected criteria.</td></tr>
                  ) : (
                    groupTimesheetsByEmployee.map((employeeGroup) => {
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
                                           // const entryTimezone = entry.timezone || browserTimezone;
                                           // const isLeaveEntry = entry.leaveType && entry.leaveType !== 'None';
                                            const totalHours = parseFloat(entry.totalHours) || 0;
                                            return (
                                              <div key={entry._id} className="timesheet-entry-detail-inline">
                                                <div className="inline-actions">
                                                  <button
                                                    className={`icon-btn edit-btn ${!canEditTimesheet(entry) ? 'disabled-btn' : ''}`}
                                                    onClick={() => handleUpdate(entry)}
                                                    title={canEditTimesheet(entry) ? "Edit Entry" : "Editing not allowed"}
                                                  >
                                                    <FontAwesomeIcon icon={faPen} />
                                                  </button>
                                                  <button className='icon-btn delete-btn' onClick={() => handleDeleteClick(entry._id)} title="Delete Entry">
                                                    <FontAwesomeIcon icon={faTrash} />
                                                  </button>
                                                </div>
                                                <div className="detail-section">
                                                  <span className="detail-label">EMPLOYEE:</span>
                                                  <span className="detail-value">{employeeGroup.name}</span>
                                                </div>
                                                <div className="detail-section">
                                                  <span className="detail-label">CLIENT:</span>
                                                  <span className="detail-value">{entry.clientName || 'N/A'}</span>
                                                </div>
                                                {entry.projectName && (
                                                  <div className="detail-section">
                                                    <span className="detail-label">PROJECT:</span>
                                                    <span className="detail-value">{entry.projectName}</span>
                                                  </div>
                                                )}
                                                <div className="detail-separator"></div>
                                                <div className="detail-section total-hours-section">
                                                  <span className="detail-label">TOTAL</span>
                                                  <span className="detail-value bold">{formatHoursMinutes(totalHours)}</span>
                                                </div>
                                                <div className="detail-separator"></div>
                                                <div className="detail-section">
                                                  <span className="detail-label work-time-label">Start:</span>
                                                  <span className="detail-value work-time-value">{formatDisplayTime(entry.startTime, entry.timezone)}</span>
                                                </div>
                                                {entry.actualStart && (
                                                  <div className="detail-section sub-detail">
                                                    <span className="detail-label actual-time-label">Actual Start:</span>
                                                    <span className="detail-value actual-time-value">{formatDisplayTime(entry.actualStart, entry.timezone)}</span>
                                                  </div>
                                                )}
                                                <div className="detail-section">
                                                  <span className="detail-label work-time-label">End:</span>
                                                  <span className="detail-value work-time-value">{formatDisplayTime(entry.endTime, entry.timezone)}</span>
                                                </div>
                                                {entry.actualEnd && (
                                                  <div className="detail-section sub-detail">
                                                    <span className="detail-label actual-time-label">Actual End:</span>
                                                    <span className="detail-value actual-time-value">{formatDisplayTime(entry.actualEnd, entry.timezone)}</span>
                                                  </div>
                                                )}
                                                <div className="detail-section">
                                                  <span className="detail-label">Lunch:</span>
                                                  <span className="detail-value">{entry.lunchDuration || '00:00'}</span>
                                                </div>
                                                <div className="detail-section">
                                                  <span className="detail-label">Wage:</span>
                                                  <span className="detail-value">{`$${parseFloat(entry.hourlyWage).toFixed(2)}/hr`}</span>
                                                </div>
                                                <div className="detail-separator"></div>
                                                <div className="detail-section">
                                                  <span className="detail-label">Notes:</span>
                                                  <span className="detail-value">{entry.notes}</span>
                                                </div>
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
                                    <strong>{formatHoursMinutes(totalEmployeeHoursDecimal)}</strong>
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

      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay">
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

export default ProjectTimesheet;
