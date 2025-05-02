import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux'; // Import Redux hooks
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/Timesheet.scss';
import { DateTime } from 'luxon';
import Select from "react-select";

// Redux Imports
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from '../../redux/slices/employeeSlice';
import { fetchClients, selectAllClients, selectClientStatus, selectClientError } from '../../redux/slices/clientSlice';
import { fetchProjects, selectProjectItems, selectProjectStatus, selectProjectError } from '../../redux/slices/projectSlice'; // Use selectProjectItems
import {
    fetchTimesheets,
    deleteTimesheet,
    downloadProjectTimesheet, // Use project-specific download
    sendProjectTimesheet, // Use project-specific send
    selectAllTimesheets,
    selectTimesheetStatus,
    selectTimesheetError,
    selectTimesheetProjectDownloadStatus, // Use project download status
    selectTimesheetProjectDownloadError, // Use project download error
    selectTimesheetProjectSendStatus, // Use project send status
    selectTimesheetProjectSendError, // Use project send error
    clearTimesheetError, clearProjectDownloadStatus, clearProjectSendStatus // Import clear actions
} from '../../redux/slices/timesheetSlice';
import { setAlert } from '../../redux/slices/alertSlice'; // Import setAlert
import Alert from '../layout/Alert'; // Import Alert component

const ALL_PROJECTS_VALUE = 'ALL_PROJECTS';

const formatDateString = (dateString, format = 'yyyy-MM-dd') => {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return 'Invalid Date';
    try {
        return DateTime.fromISO(dateString).toFormat(format);
    } catch (e) {
        console.error(`Error formatting date string ${dateString}:`, e);
        return 'Invalid Date';
    }
};

const formatTimeFromISO = (isoString, timezoneIdentifier, format = 'HH:mm') => {
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

const calculateDateRange = (baseDate, type) => {
    let startDt = DateTime.fromJSDate(baseDate);
    let endDt;

    if (type === 'Daily') {
        startDt = startDt.startOf('day');
        endDt = startDt.endOf('day');
    } else if (type === 'Monthly') {
        startDt = startDt.startOf('month');
        endDt = startDt.endOf('month');
    } else {
        startDt = startDt.startOf('week');
        if (type === 'Fortnightly') {
            endDt = startDt.plus({ days: 13 }).endOf('day');
        } else {
            endDt = startDt.plus({ days: 6 }).endOf('day');
        }
    }
    return { start: startDt.toJSDate(), end: endDt.toJSDate() };
};

const generateDateColumns = (currentDate, viewType) => {
    const { start, end } = calculateDateRange(currentDate, viewType);
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

const groupDatesByWeek = (dateColumns) => {
    if (!dateColumns || dateColumns.length === 0) return [];

    const weeksMap = new Map();
    dateColumns.forEach(col => {
        const weekKey = `${col.date.getFullYear()}-${col.weekNumber}`;
        if (!weeksMap.has(weekKey)) {
            const dateInWeek = DateTime.fromJSDate(col.date);
            const weekStart = dateInWeek.startOf('week');
            const weekEnd = dateInWeek.endOf('week');
            weeksMap.set(weekKey, {
                weekNumber: col.weekNumber,
                weekStartDate: weekStart.toJSDate(),
                weekEndDate: weekEnd.toJSDate(),
                days: []
            });
        }
        weeksMap.get(weekKey).days.push(col);
    });

    return Array.from(weeksMap.values()).sort((a, b) => {
        if (a.weekStartDate.getFullYear() !== b.weekStartDate.getFullYear()) {
            return a.weekStartDate.getFullYear() - b.weekStartDate.getFullYear();
        }
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


const ProjectTimesheet = ({ initialProjectId = '', onProjectChange, showProjectSelector = true }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // --- Redux State ---
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employeeError = useSelector(selectEmployeeError);
  const clients = useSelector(selectAllClients);
  const clientStatus = useSelector(selectClientStatus);
  const clientError = useSelector(selectClientError);
  const projects = useSelector(selectProjectItems); // Use correct selector
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);
  const timesheets = useSelector(selectAllTimesheets);
  const timesheetStatus = useSelector(selectTimesheetStatus);
  const timesheetError = useSelector(selectTimesheetError);
  const downloadStatus = useSelector(selectTimesheetProjectDownloadStatus); // Use project download status
  // Corrected variable names for Redux state
  const downloadErrorRedux = useSelector(selectTimesheetProjectDownloadError); // Use project download error
  const sendStatus = useSelector(selectTimesheetProjectSendStatus); // Use project send status
  const sendErrorRedux = useSelector(selectTimesheetProjectSendError); // Use project send error

  // --- Local UI State ---
  const [viewType, setViewType] = useState('Weekly');
  // const [timesheets, setTimesheets] = useState([]); // Replaced by Redux
  // const [employees, setEmployees] = useState([]); // Replaced by Redux
  // const [clients, setClients] = useState([]); // Replaced by Redux
  // const [projects, setProjects] = useState([]); // Replaced by Redux
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
  const [itemToDelete, setItemToDelete] = useState(null); // { id }
  // const [downloadError, setDownloadError] = useState(null); // Replaced by Redux alert
  // const [sendError, setSendError] = useState(null); // Replaced by Redux alert

  const browserTimezone = useMemo(() => DateTime.local().zoneName, []); // Keep this

  // --- Combined Loading and Error States ---
  const isLoading = useMemo(() =>
    employeeStatus === 'loading' ||
    clientStatus === 'loading' ||
    projectStatus === 'loading' ||
    timesheetStatus === 'loading',
    [employeeStatus, clientStatus, projectStatus, timesheetStatus]
  );
  const isDownloading = useMemo(() => downloadStatus === 'loading', [downloadStatus]);
  const isSending = useMemo(() => sendStatus === 'loading', [sendStatus]);

  // Effect to show alerts for fetch/operation errors from Redux state
  useEffect(() => {
    // Combine all relevant Redux errors
    const reduxError = employeeError || clientError || projectError || timesheetError || downloadErrorRedux || sendErrorRedux;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
      // Optionally clear the specific Redux error after showing the alert
      // if (downloadErrorRedux) dispatch(clearProjectDownloadStatus());
      // if (sendErrorRedux) dispatch(clearProjectSendStatus());
      // if (timesheetError) dispatch(clearTimesheetError());
      // etc.
    }
  }, [employeeError, clientError, projectError, timesheetError, downloadErrorRedux, sendErrorRedux, dispatch]);


  // Fetch initial data (employees, clients, all projects)
  useEffect(() => {
    if (employeeStatus === 'idle') dispatch(fetchEmployees());
    if (clientStatus === 'idle') dispatch(fetchClients());
    if (projectStatus === 'idle') dispatch(fetchProjects()); // Fetch all projects for the dropdown
  }, [dispatch, employeeStatus, clientStatus, projectStatus]);

  // Fetch timesheets when project, date, or view type changes
  useEffect(() => {
    if (!selectedProjectId) {
        // Optionally clear timesheets if no project is selected
        // dispatch(clearTimesheets()); // Or handle this based on desired UX
        return;
    }

    setError(null);
    try {
      const { start, end } = calculateDateRange(currentDate, viewType);
      const startDateStr = DateTime.fromJSDate(start).toISODate(); // Use ISO Date format
      const endDateStr = DateTime.fromJSDate(end).toISODate(); // Use ISO Date format
      const params = {
          startDate: startDateStr,
          endDate: endDateStr,
      };
      if (selectedProjectId !== ALL_PROJECTS_VALUE) {
          params.projectId = selectedProjectId;
      }
      dispatch(fetchTimesheets(params));

    } catch (error) {
      console.error('ProjectTimesheet: Error fetching timesheets:', error.response?.data || error.message);
      if (!error.message?.includes('token')) {
          // setError(error.response?.data?.message || 'Failed to fetch project timesheets.'); // Handled by Alert
          dispatch(setAlert(error.response?.data?.message || 'Failed to fetch project timesheets.', 'danger'));
      }
      // setTimesheets([]); // Data comes from Redux now
    }
    // No finally block needed as loading is handled by Redux status
  }, [selectedProjectId, currentDate, viewType, dispatch]);

  useEffect(() => {
    setSelectedProjectId(initialProjectId || '');
  }, [initialProjectId]);

  const handleProjectSelectChange = (option) => {
      const newProjectId = option?.value || '';
      setSelectedProjectId(newProjectId);
      if (onProjectChange) {
          onProjectChange(newProjectId);
      }
  };

  const toggleExpand = (id) => {
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

  const handleUpdate = (timesheet) => {
    // Navigate to the project-specific edit route
    const clientId = timesheet.clientId?._id || timesheet.clientId;
    const projectId = timesheet.projectId?._id || timesheet.projectId;
    navigate(`/timesheet/project/edit/${clientId}/${projectId}/${timesheet._id}`);
   };

  const confirmDeleteTimesheet = useCallback(async () => {
    if (!itemToDelete) return;
    const { id } = itemToDelete;
    setError(null); // Clear local error
    try {
      await dispatch(deleteTimesheet(id)).unwrap();
      dispatch(setAlert('Timesheet entry deleted successfully', 'success'));
    } catch (error) {
      console.error('Error deleting timesheet:', error.response?.data || error.message);
      const errorMessage = error?.message || 'Failed to delete timesheet entry.';
      
      dispatch(setAlert(errorMessage, 'danger'));
    } finally {
      setShowDeleteConfirm(false); // Close modal regardless of outcome
      setItemToDelete(null);
    }
   }, [itemToDelete, dispatch]); // Corrected dependencies

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

   const handleSendEmail = useCallback(async () => {
    const isAllProjects = selectedProjectId === ALL_PROJECTS_VALUE;
    // const endpoint = isAllProjects ? `${API_URL}/timesheets/send` : `${API_URL}/timesheets/send-email/project`; // Endpoint handled in thunk
    
    // Validation
    if (!isAllProjects && !selectedProjectId) {
        dispatch(setAlert('No project selected.', 'warning')); return;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        dispatch(setAlert('Please enter a valid recipient email address.', 'warning')); return;
    }

    // --- Removed local error state handling, Redux handles it ---
    // setSendError(null); // Removed local error state
    dispatch(clearProjectSendStatus()); // Clear Redux status/error

    try {
        const params = {
            email,
            projectIds: !isAllProjects && selectedProjectId ? [selectedProjectId] : [], // Pass project ID for project-specific thunk
            employeeIds: selectedEmployee ? [selectedEmployee] : [],
            startDate: startDate ? DateTime.fromJSDate(startDate).toISODate() : null,
            endDate: endDate ? DateTime.fromJSDate(endDate).toISODate() : null,
            timezone: browserTimezone,
        };

        // Dispatch the project-specific send thunk
        await dispatch(sendProjectTimesheet(params)).unwrap();

        setShowSendFilters(false); setEmail(''); setSelectedEmployee(''); setStartDate(null); setEndDate(null);
        dispatch(setAlert(`Project timesheet report sent successfully to ${email}`, 'success'));

    } catch (error) {
        // Error handled by useEffect watching sendErrorRedux and dispatching setAlert
        console.error(`Error sending project timesheet email:`, error);
    }
    // No finally block needed, loading state handled by Redux
}, [selectedProjectId, email, selectedEmployee, startDate, endDate, navigate, browserTimezone, dispatch]);

const handleDownload = useCallback(async () => {
    const isAllProjects = selectedProjectId === ALL_PROJECTS_VALUE;
    // const endpoint = isAllProjects ? `${API_URL}/timesheets/download` : `${API_URL}/timesheets/download/project`; // Endpoint handled in thunk
    if (!isAllProjects && !selectedProjectId) {
        dispatch(setAlert('No project selected.', 'warning')); return;
    }
    // --- Removed local error state handling, Redux handles it ---
    // setDownloadError(null); // Removed local error state
    dispatch(clearProjectDownloadStatus()); // Clear Redux status/error

    try {
        const params = {
            projectIds: !isAllProjects && selectedProjectId ? [selectedProjectId] : [],
            employeeIds: selectedEmployee ? [selectedEmployee] : [],
            startDate: startDate ? DateTime.fromJSDate(startDate).toFormat('yyyy-MM-dd') : null,
            endDate: endDate ? DateTime.fromJSDate(endDate).toISODate() : null,
            timezone: browserTimezone, // Ensure this is passed
        };

        // Dispatch the project-specific download thunk
        const result = await dispatch(downloadProjectTimesheet(params)).unwrap();

        const blob = new Blob([result.blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        let filename = isAllProjects ? `Timesheet_Report.xlsx` : `Project_Timesheet_Report.xlsx`;
        if (result.filename) { // Use filename from thunk result
            filename = result.filename;
        }
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        dispatch(setAlert('Project timesheet report downloaded successfully.', 'success')); // Success alert
        setShowDownloadFilters(false); setSelectedEmployee(''); setStartDate(null); setEndDate(null);
    } catch (error) {
        // Error handled by useEffect watching downloadErrorRedux and dispatching setAlert
        console.error(`Project Download failed:`, error);
    }
    // No finally block needed, loading state handled by Redux
}, [selectedProjectId, selectedEmployee, startDate, endDate, navigate, browserTimezone, dispatch]);

  const dateColumns = useMemo(() => generateDateColumns(currentDate, viewType), [currentDate, viewType]);

  const groupTimesheetsByEmployee = useMemo(() => {
      let grouped = {};
      const currentViewDates = new Set(dateColumns.map(d => d.isoDate));

      timesheets.forEach((timesheet) => {
        if (!timesheet || !timesheet.employeeId || !timesheet.date || !/^\d{4}-\d{2}-\d{2}$/.test(timesheet.date)) {
            return;
        }
        const entryLocalDate = timesheet.date;
        if (!currentViewDates.has(entryLocalDate)) return;

        const employeeIdValue = timesheet.employeeId?._id || timesheet.employeeId;
        const employee = employees.find((emp) => emp._id === employeeIdValue);
        const employeeName = employee?.name || `Unknown (${String(employeeIdValue).slice(-4)})`;
        const employeeExpectedHours = employee?.expectedWeeklyHours || 40;

        const clientIdValue = timesheet.clientId?._id || timesheet.clientId;
        const client = clientIdValue ? clients.find((c) => c._id === clientIdValue) : null;
        const clientName = client?.name || (clientIdValue ? 'N/A' : '');
        const projectName = timesheet.projectId?.name || (timesheet.projectId ? 'Unknown Project' : '');

        if (!grouped[employeeIdValue]) {
          grouped[employeeIdValue] = {
            id: employeeIdValue, name: employeeName,
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

    }, [timesheets, employees, clients, dateColumns]);

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

  const projectOptions = useMemo(() => {
      const options = projects.map(p => ({ value: p._id, label: p.name }));
      if (showProjectSelector) {
          options.unshift({ value: ALL_PROJECTS_VALUE, label: 'All Projects (Timesheets)' }); // Clarify label
      }
      return options;
  }, [projects, showProjectSelector]);

  const selectedProjectOption = useMemo(() => {
      return projectOptions.find(opt => opt.value === selectedProjectId) || null;
  }, [projectOptions, selectedProjectId]);

  const periodLabel = useMemo(() => getPeriodLabel(viewType), [viewType]);

  const renderTableHeaders = () => {
    if (viewType === 'Daily') return null;

    const headers = [
        <th key="expand" className="col-expand"></th>,
        <th key="name" className="col-name">Employee</th>,
    ];
    const defaultDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    if (viewType === 'Monthly' || viewType === 'Fortnightly') {
        headers.push(<th key="week" className="col-week">Week</th>);
        headers.push(<th key="week-period" className="col-week-period">Week Period</th>);
    }

    defaultDayOrder.forEach(dayName => {
        headers.push(<th key={`${dayName}-h`} className="col-day">{dayName.substring(0, 3)}</th>);
    });

    headers.push(<th key="total" className="col-total total-header">Total</th>);
    return headers;
   };

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
            <button className='icon-btn edit-btn' onClick={() => handleUpdate(entry)} title="Edit Entry"><FontAwesomeIcon icon={faPen} /></button>
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
              <div className="detail-item"><FontAwesomeIcon icon={faClock} /> <strong>Time:</strong> <span>{formatTimeFromISO(entry.startTime, entryTimezone)} - {formatTimeFromISO(entry.endTime, entryTimezone)}</span></div>
              <div className="detail-item"><FontAwesomeIcon icon={faUtensils} /> <strong>Lunch:</strong> <span>{entry.lunchBreak === 'Yes' ? formatLunchDuration(entry.lunchDuration) : 'No break'}</span></div>
              {entry.notes && entry.notes.trim() !== '' && (
                <div className="detail-item notes-item"><FontAwesomeIcon icon={faStickyNote} /> <strong>Notes:</strong> <span>{entry.notes}</span></div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

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

  const employeeOptions = useMemo(() => [
      { value: '', label: 'All Employees' },
      ...employees.map(e => ({ value: e._id, label: e.name }))
  ], [employees]);

  const selectedEmployeeOption = useMemo(() =>
      employeeOptions.find(e => e.value === selectedEmployee) || null
  , [employeeOptions, selectedEmployee]);

  return (
    <div className='project-timesheet-container timesheet-page'>
       <Alert /> {/* Render Alert component here */}
       <div className="timesheet-header">
        <div className="title-breadcrumbs">
          <h3><FontAwesomeIcon icon={faProjectDiagram} /> Project Timesheet</h3>
        </div>
        <div className="header-actions">
          <button className="btn btn-red" onClick={() => { setShowDownloadFilters(prev => !prev); setShowSendFilters(false); dispatch(clearProjectDownloadStatus()); }} aria-expanded={showDownloadFilters} aria-controls="project-timesheet-download-options">
            <FontAwesomeIcon icon={faDownload} /> Download Report
          </button>
          <button className="btn btn-purple" onClick={() => { setShowSendFilters(prev => !prev); setShowDownloadFilters(false); dispatch(clearProjectSendStatus()); }} aria-expanded={showSendFilters} aria-controls="project-timesheet-send-options">
            <FontAwesomeIcon icon={faEnvelope} /> Send Report
          </button>
        </div>
      </div>

      {showDownloadFilters && (
        <div id="project-timesheet-download-options" className="timesheet-options-container download-options">
          <h4>Download Project Timesheet Report</h4>
          {/* Error handled by Alert component */}
          <div className="filter-controls">
       
            <DatePicker selected={startDate} onChange={setStartDate} selectsStart startDate={startDate} endDate={endDate} placeholderText="From Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Download Start Date" />
            <DatePicker selected={endDate} onChange={setEndDate} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="To Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Download End Date" />
            <button className="btn btn-red action-button" onClick={handleDownload} disabled={isDownloading || !selectedProjectId}>
              {isDownloading ? (<><FontAwesomeIcon icon={faSpinner} spin /> Downloading...</>) : (<><FontAwesomeIcon icon={faDownload} /> Download</>)}
            </button>
          </div>
           {!selectedProjectId && <small className="error-text">Please select a project first.</small>}
        </div>
      )}
      {showSendFilters && (
        <div id="project-timesheet-send-options" className="timesheet-options-container send-options">
          <h4>Send Project Timesheet Report</h4>
           {/* Error handled by Alert component */}
          <div className="filter-controls">
           
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

       <div className='timesheet-navigation-bar'>
         {showProjectSelector && (
             <div className="project-selector-container">
                <Select
                    options={projectOptions}
                    value={selectedProjectOption}
                    onChange={handleProjectSelectChange}
                    placeholder="Select a Project..."
                    className="react-select-container project-select"
                    classNamePrefix="react-select"
                    isLoading={isLoading && !projects.length}
                    isDisabled={isLoading}
                    isClearable={false} // Keep this false if a project context is always needed
                />
             </div>
         )}

        <div className='period-display'><h4>{periodDisplayText}</h4></div>
        <div className='navigation-controls'>
          <button className='nav-button btn btn-blue' onClick={handlePrev} aria-label={`Previous ${periodLabel}`}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Prev {periodLabel}</span>
          </button>
          <div className='view-type-select-wrapper'>
            <select id='viewType' value={viewType} onChange={(e) => setViewType(e.target.value)} className='view-type-dropdown' aria-label="Select View Type">
              <option value='Daily'>View by Daily</option>
              <option value='Weekly'>View by Weekly</option>
              <option value='Fortnightly'>View by Fortnightly</option>
              <option value='Monthly'>View by Monthly</option>
            </select>
          </div>
          <button className='nav-button btn btn-blue' onClick={handleNext} aria-label={`Next ${periodLabel}`}>
             <span>Next {periodLabel}</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
        {/* Pass context to CreateTimesheet page */}
        <Link
          // Update route to use URL params for the new component
          to={`/timesheet/project/create/${projects.find(p => p._id === selectedProjectId)?.clientId?._id}/${selectedProjectId}`}
          className={`btn btn-success create-timesheet-link ${!selectedProjectId || selectedProjectId === ALL_PROJECTS_VALUE ? 'disabled-link' : ''}`} // Disable if no specific project selected
          aria-disabled={!selectedProjectId || selectedProjectId === ALL_PROJECTS_VALUE || !projects.find(p => p._id === selectedProjectId)?.clientId?._id} // Also disable if client ID can't be found
        >
          <FontAwesomeIcon icon={faPlus} /> Create Timesheet
        </Link>
      </div>

       {isLoading ? (
         <div className='loading-indicator'><FontAwesomeIcon icon={faSpinner} spin size='2x' /> Loading Timesheets...</div>
       ) : /* error ? ( // Handled by Alert component
         <div className='error-message'><FontAwesomeIcon icon={faExclamationCircle} /> {error}</div>
       ) : */ !selectedProjectId ? (
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
                      const weeksData = groupDatesByWeek(dateColumns);
                      const numWeeks = weeksData.length;
                      const useRowSpan = numWeeks > 1;
                      const currentDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

                              {currentDayOrder.map(dayName => {
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
                                                    <button className='icon-btn edit-btn' onClick={() => handleUpdate(entry)} title="Edit Entry"><FontAwesomeIcon icon={faPen} /></button> {/* Corrected: handleUpdate already navigates */}
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
                                                        <div className="detail-section"><span className="detail-label">PROJECT:</span><span className="detail-value">{entry.projectName || 'N/A'}</span></div>
                                                        <div className="detail-separator"></div>
                                                        <div className="detail-section total-hours-section"><span className="detail-label">TOTAL</span><span className="detail-value bold">{formatHoursMinutes(totalHours)}</span></div>
                                                        <div className="detail-separator"></div>
                                                        <div className="detail-section"><span className="detail-label">Start:</span><span className="detail-value">{formatTimeFromISO(entry.startTime, entryTimezone)}</span></div>
                                                        <div className="detail-section"><span className="detail-label">End:</span><span className="detail-value">{formatTimeFromISO(entry.endTime, entryTimezone)}</span></div>
                                                        <div className="detail-section"><span className="detail-label">Lunch:</span><span className="detail-value">{entry.lunchBreak === 'Yes' ? formatLunchDuration(entry.lunchDuration) : 'No break'}</span></div>
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

export default ProjectTimesheet;
