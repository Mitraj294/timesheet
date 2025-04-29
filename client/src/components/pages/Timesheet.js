import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/Timesheet.scss';
import { DateTime } from 'luxon';
import Select from "react-select"; // Assuming react-select is used here too based on filter controls

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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


const Timesheet = () => {
  const [viewType, setViewType] = useState('Weekly');
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDownloadFilters, setShowDownloadFilters] = useState(false);
  const [showSendFilters, setShowSendFilters] = useState(false);
  const [error, setError] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [sendError, setSendError] = useState(null);

  const navigate = useNavigate();
  const browserTimezone = useMemo(() => DateTime.local().zoneName, []);

  const fetchWithAuth = useCallback(async (url, config = {}) => {
      const token = localStorage.getItem('token');
      if (!token) {
          console.error("fetchWithAuth: No token found, redirecting to login.");
          navigate('/login');
          throw new Error('No authentication token found!');
      }
      const authConfig = {
          ...config,
          headers: { ...config.headers, Authorization: `Bearer ${token}` },
      };
      try {
          const response = await axios.get(url.startsWith('http') ? url : `${API_URL}${url}`, authConfig);
          return response.data;
      } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403) {
              console.error(`fetchWithAuth: ${err.response.status} error, redirecting to login.`);
              navigate('/login');
          }
          throw err;
      }
  }, [navigate]);

  const fetchEmployees = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`/employees`);
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error.response?.data || error.message);
      if (!error.message?.includes('token')) {
          setError('Failed to fetch employees.');
      }
    }
  }, [fetchWithAuth]);

  const fetchClients = useCallback(async () => {
     try {
      const data = await fetchWithAuth(`/clients`);
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error.response?.data || error.message);
       if (!error.message?.includes('token')) {
           setError('Failed to fetch clients.');
       }
    }
  }, [fetchWithAuth]);

  const fetchProjects = useCallback(async () => {
     try {
      const data = await fetchWithAuth(`/projects`);
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error.response?.data || error.message);
       if (!error.message?.includes('token')) {
           setError('Failed to fetch projects.');
       }
    }
  }, [fetchWithAuth]);

  const fetchTimesheets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { start, end } = calculateDateRange(currentDate, viewType);
      const startDateStr = DateTime.fromJSDate(start).toFormat('yyyy-MM-dd');
      const endDateStr = DateTime.fromJSDate(end).toFormat('yyyy-MM-dd');
      const data = await fetchWithAuth(`/timesheets`, {
        params: { startDate: startDateStr, endDate: endDateStr },
      });
      const fetchedTimesheets = data?.timesheets;
      setTimesheets(Array.isArray(fetchedTimesheets) ? fetchedTimesheets : []);
    } catch (error) {
      console.error('Error fetching timesheets:', error.response?.data || error.message);
      if (!error.message?.includes('token')) {
          setError(error.response?.data?.message || 'Failed to fetch timesheets.');
      }
      setTimesheets([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, viewType, fetchWithAuth]);

  useEffect(() => {
    fetchEmployees();
    fetchClients();
    fetchProjects();
  }, [fetchEmployees, fetchClients, fetchProjects]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  const toggleExpand = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
   };

  const handleUpdate = (timesheet) => {
    navigate('/timesheet/create', { state: { timesheet } });
   };

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this timesheet entry?')) return;
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); throw new Error('Authentication error!'); }
      await axios.delete(`${API_URL}/timesheets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchTimesheets();
    } catch (error) {
      console.error('Error deleting timesheet:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to delete timesheet entry.');
      if (error.response?.status === 401) navigate('/login');
    }
   }, [navigate, fetchTimesheets]);

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
      if (!email || !/\S+@\S+\.\S+/.test(email)) { setSendError('Please enter a valid recipient email address.'); return; }
      setSendError(null); setIsSending(true); setError(null);
      try {
          const token = localStorage.getItem('token');
          if (!token) { navigate('/login'); throw new Error('Authentication error!'); }
          const body = {
              email,
              employeeIds: selectedEmployee ? [selectedEmployee] : [],
              startDate: startDate ? DateTime.fromJSDate(startDate).toFormat('yyyy-MM-dd') : null,
              endDate: endDate ? DateTime.fromJSDate(endDate).toFormat('yyyy-MM-dd') : null,
              timezone: browserTimezone,
          };
          await axios.post(`${API_URL}/timesheets/send`, body, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
          setShowSendFilters(false); setEmail(''); setSelectedEmployee(''); setStartDate(null); setEndDate(null);
      } catch (error) {
          console.error('Error sending timesheet email:', error.response?.data || error.message);
          setSendError(error.response?.data?.message || 'Failed to send timesheet. Please try again.');
          if (error.response?.status === 401) navigate('/login');
      } finally { setIsSending(false); }
  }, [email, selectedEmployee, startDate, endDate, navigate, browserTimezone]);

  const handleDownload = useCallback(async () => {
      setDownloadError(null); setIsDownloading(true); setError(null);
      try {
          const token = localStorage.getItem('token');
          if (!token) { navigate('/login'); throw new Error('Authentication error!'); }
          const body = {
              employeeIds: selectedEmployee ? [selectedEmployee] : [],
              startDate: startDate ? DateTime.fromJSDate(startDate).toFormat('yyyy-MM-dd') : null,
              endDate: endDate ? DateTime.fromJSDate(endDate).toFormat('yyyy-MM-dd') : null,
              timezone: browserTimezone,
          };
          const response = await axios.post(`${API_URL}/timesheets/download`, body, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, responseType: 'blob' });
          const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const contentDisposition = response.headers['content-disposition'];
          let filename = `timesheets_report.xlsx`;
          if (contentDisposition) {
              const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
              if (filenameMatch && filenameMatch[1]) { filename = decodeURIComponent(filenameMatch[1]); }
          }
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          setShowDownloadFilters(false); setSelectedEmployee(''); setStartDate(null); setEndDate(null);
      } catch (err) {
          console.error('Download failed:', err.response?.data || err.message || err);
          let errorMessage = 'Could not download report.';
          if (err.response?.data instanceof Blob && err.response?.data.type.includes('json')) {
              try {
                  const errorJson = JSON.parse(await err.response.data.text());
                  errorMessage = errorJson.message || errorJson.error || errorMessage;
              } catch (parseError) { console.error("Could not parse error blob:", parseError); }
          } else if (err.response?.data?.message || err.response?.data?.error) {
              errorMessage = err.response.data.message || err.response.data.error;
          } else if (err.message) { errorMessage = err.message; }
          setDownloadError(errorMessage);
          if (err.response?.status === 401) navigate('/login');
      } finally { setIsDownloading(false); }
  }, [selectedEmployee, startDate, endDate, navigate, browserTimezone]);

  const dateColumns = useMemo(() => generateDateColumns(currentDate, viewType), [currentDate, viewType]);

  const groupTimesheets = useMemo(() => {
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

    }, [timesheets, employees, clients, projects, dateColumns]);

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

  const periodLabel = useMemo(() => getPeriodLabel(viewType), [viewType]);

  const renderTableHeaders = () => {
    if (viewType === 'Daily') return null;

    const headers = [
        <th key="expand" className="col-expand"></th>,
        <th key="name" className="col-name">Name</th>,
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
            <button className='icon-btn delete-btn' onClick={() => handleDelete(entry._id)} title="Delete Entry"><FontAwesomeIcon icon={faTrash} /></button>
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

  const employeeOptions = useMemo(() => [
      { value: '', label: 'All Employees' },
      ...employees.map(e => ({ value: e._id, label: e.name }))
  ], [employees]);

  const selectedEmployeeOption = useMemo(() =>
      employeeOptions.find(e => e.value === selectedEmployee) || null
  , [employeeOptions, selectedEmployee]);


  return (
    <div className='timesheet-page'>
       <div className="timesheet-header">
        <div className="title-breadcrumbs">
          <h3><FontAwesomeIcon icon={faPen} /> Timesheets</h3>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">Timesheets</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-red" onClick={() => { setShowDownloadFilters(prev => !prev); setShowSendFilters(false); setDownloadError(null); }} aria-expanded={showDownloadFilters} aria-controls="timesheet-download-options">
            <FontAwesomeIcon icon={faDownload} /> Download Report
          </button>
          <button className="btn btn-purple" onClick={() => { setShowSendFilters(prev => !prev); setShowDownloadFilters(false); setSendError(null); }} aria-expanded={showSendFilters} aria-controls="timesheet-send-options">
            <FontAwesomeIcon icon={faEnvelope} /> Send Report
          </button>
        </div>
      </div>
      {showDownloadFilters && (
        <div id="timesheet-download-options" className="timesheet-options-container download-options">
          <h4>Download Timesheet Report</h4>
          {downloadError && <p className='error-text'><FontAwesomeIcon icon={faExclamationCircle} /> {downloadError}</p>}
          <div className="filter-controls">
            <Select
                options={employeeOptions}
                value={selectedEmployeeOption}
                onChange={option => setSelectedEmployee(option?.value || '')}
                className="react-select-container filter-select"
                classNamePrefix="react-select"
                placeholder="Filter by Employee (Optional)"
                isClearable={true}
            />
            <DatePicker selected={startDate} onChange={setStartDate} selectsStart startDate={startDate} endDate={endDate} placeholderText="From Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Download Start Date" />
            <DatePicker selected={endDate} onChange={setEndDate} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="To Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Download End Date" />
            <button className="btn btn-red action-button" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (<><FontAwesomeIcon icon={faSpinner} spin /> Downloading...</>) : (<><FontAwesomeIcon icon={faDownload} /> Download</>)}
            </button>
          </div>
        </div>
      )}
      {showSendFilters && (
        <div id="timesheet-send-options" className="timesheet-options-container send-options">
          <h4>Send Timesheet Report</h4>
           {sendError && <p className='error-text'><FontAwesomeIcon icon={faExclamationCircle} /> {sendError}</p>}
          <div className="filter-controls">
            <Select
                options={employeeOptions}
                value={selectedEmployeeOption}
                onChange={option => setSelectedEmployee(option?.value || '')}
                className="react-select-container filter-select"
                classNamePrefix="react-select"
                placeholder="Filter by Employee (Optional)"
                isClearable={true}
            />
            <DatePicker selected={startDate} onChange={setStartDate} selectsStart startDate={startDate} endDate={endDate} placeholderText="From Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Send Start Date" />
            <DatePicker selected={endDate} onChange={setEndDate} selectsEnd startDate={startDate} endDate={endDate} minDate={startDate} placeholderText="To Date" dateFormat="yyyy-MM-dd" className="filter-datepicker" wrapperClassName="date-picker-wrapper" aria-label="Send End Date" />
            <input type="email" placeholder="Recipient email" value={email} onChange={e => { setEmail(e.target.value); if (sendError) setSendError(null); }} className="filter-email" aria-label="Recipient Email" required />
            <button className="btn btn-purple action-button" onClick={handleSendEmail} disabled={isSending || !email || !/\S+@\S+\.\S+/.test(email)}>
              {isSending ? (<><FontAwesomeIcon icon={faSpinner} spin /> Sending...</>) : (<><FontAwesomeIcon icon={faEnvelope} /> Send</>)}
            </button>
          </div>
        </div>
      )}

       <div className='timesheet-navigation-bar'>
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
        <Link to="/timesheet/create" className='btn btn-success create-timesheet-link'>
          <FontAwesomeIcon icon={faPlus} /> Create Timesheet
        </Link>
      </div>

       {isLoading ? (
         <div className='loading-indicator'><FontAwesomeIcon icon={faSpinner} spin size='2x' /> Loading Timesheets...</div>
       ) : error ? (
         <div className='error-message'><FontAwesomeIcon icon={faExclamationCircle} /> {error}</div>
       ) : (
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
                                                    <button className='icon-btn edit-btn' onClick={() => handleUpdate(entry)} title="Edit Entry"><FontAwesomeIcon icon={faPen} /></button>
                                                    <button className='icon-btn delete-btn' onClick={() => handleDelete(entry._id)} title="Delete Entry"><FontAwesomeIcon icon={faTrash} /></button>
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
    </div>
  );
};

export default Timesheet;
