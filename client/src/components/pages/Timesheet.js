// /home/digilab/timesheet/client/src/components/pages/Timesheet.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faArrowLeft,
  faArrowRight,
  faPlus,
  faChevronDown,
  faChevronUp,
  faTrash,
  faDownload,
  faEnvelope,
  faSpinner, // Keep for loading states
  faExclamationCircle, // Keep for error states
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { format as formatFnsDate } from 'date-fns'; // Keep for simple date formatting
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/Timesheet.scss'; // Ensure this SCSS file is updated
import { DateTime } from 'luxon';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// --- Helper Functions ---

// Format incoming UTC ISO date string to local yyyy-LL-dd using a specific timezone
const formatDateInTimezone = (iso, timezoneIdentifier) => {
    if (!iso) return 'N/A';
    // Use provided timezone, fallback to browser's local if invalid/missing
    const tz = timezoneIdentifier && DateTime.local().setZone(timezoneIdentifier).isValid
               ? timezoneIdentifier
               : DateTime.local().zoneName;
    try {
        return DateTime.fromISO(iso, { zone: 'utc' }) // Parse as UTC
               .setZone(tz) // Convert to the SPECIFIED zone
               .toFormat('yyyy-LL-dd');
    } catch (e) {
        console.error(`Error formatting date ${iso} to timezone ${tz}:`, e);
        return 'Invalid Date';
    }
}

// Format incoming UTC ISO time string to local HH:mm using a specific timezone
const formatTimeInTimezone = (iso, timezoneIdentifier) => {
    if (!iso) return 'N/A';
    // Use provided timezone, fallback to browser's local if invalid/missing
    const tz = timezoneIdentifier && DateTime.local().setZone(timezoneIdentifier).isValid
               ? timezoneIdentifier
               : DateTime.local().zoneName;
    try {
        // Handle cases where time might be just HH:mm (less likely now)
        if (typeof iso === 'string' && iso.match(/^\d{2}:\d{2}$/)) {
             return DateTime.fromISO(`1970-01-01T${iso}:00`, { zone: 'utc' })
                    .setZone(tz)
                    .toFormat('HH:mm');
        }
        // Handle full ISO strings
        return DateTime.fromISO(iso, { zone: 'utc' }) // Parse as UTC
               .setZone(tz) // Convert to the SPECIFIED zone
               .toFormat('HH:mm');
    } catch (e) {
        console.error(`Error formatting time ${iso} to timezone ${tz}:`, e);
        return 'Invalid Time';
    }
}

// Format decimal hours (remains the same)
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
    } else { // Only minutes or zero
        return `${formattedMinutes}m`;
    }
};
// Format lunch duration (remains the same)
const formatLunchDuration = (lunchDuration) => {
    if (!lunchDuration || typeof lunchDuration !== 'string' || !/^\d{2}:\d{2}$/.test(lunchDuration)) {
        return 'N/A';
    }
    // Return valid HH:MM string directly
    return lunchDuration;
};
// Adjust to Monday (remains the same)
const adjustToMonday = (date) => {
    const dt = DateTime.fromJSDate(date);
    const mondayDt = dt.startOf('week');
    return mondayDt.toJSDate();
};
// Group dates by week (remains the same)
const groupDatesByWeek = (dateColumns) => {
    const weeks = [];
    if (!dateColumns || dateColumns.length === 0) return weeks;
    for (let i = 0; i < dateColumns.length; i += 7) {
        weeks.push(dateColumns.slice(i, i + 7));
    }
    return weeks;
};
// Calculate date range (remains the same)
const calculateDateRange = (baseDate, type) => {
    let startDt = DateTime.fromJSDate(baseDate);
    let endDt;

    if (type === 'Daily') {
        startDt = startDt.startOf('day');
        endDt = startDt.endOf('day');
    } else {
        startDt = startDt.startOf('week');
        switch (type) {
            case 'Weekly':      endDt = startDt.plus({ days: 6 }).endOf('day'); break;
            case 'Fortnightly': endDt = startDt.plus({ days: 13 }).endOf('day'); break;
            case 'Monthly':     endDt = startDt.plus({ days: 27 }).endOf('day'); break;
            default:            endDt = startDt.plus({ days: 6 }).endOf('day'); break;
        }
    }
    return { start: startDt.toJSDate(), end: endDt.toJSDate() };
};


// --- Component ---
const Timesheet = () => {
  // --- State (remains the same) ---
  const [viewType, setViewType] = useState('Weekly');
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [currentDate, setCurrentDate] = useState(adjustToMonday(new Date()));
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
  // Get browser's local timezone once for fallbacks
  const browserTimezone = useMemo(() => DateTime.local().zoneName, []);

  // --- Data Fetching (useCallback wrappers remain the same) ---
  const fetchWithAuth = useCallback(async (url, config = {}) => {
      const token = localStorage.getItem('token');
      if (!token) {
          navigate('/login');
          throw new Error('No authentication token found!');
      }
      const authConfig = {
          ...config,
          headers: { ...config.headers, Authorization: `Bearer ${token}` },
      };
      try {
          const response = await axios.get(url, authConfig);
          return response.data;
      } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403) {
              navigate('/login');
          }
          throw err;
      }
  }, [navigate]);
  const fetchEmployees = useCallback(async () => {
    try {
      const data = await fetchWithAuth(`${API_URL}/employees`);
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error.response?.data || error.message);
      setError('Failed to fetch employees.');
    }
  }, [fetchWithAuth]);
  const fetchClients = useCallback(async () => {
     try {
      const data = await fetchWithAuth(`${API_URL}/clients`);
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error.response?.data || error.message);
      setError('Failed to fetch clients.');
    }
  }, [fetchWithAuth]);
  const fetchProjects = useCallback(async () => {
     try {
      const data = await fetchWithAuth(`${API_URL}/projects`);
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error.response?.data || error.message);
      setError('Failed to fetch projects.');
    }
  }, [fetchWithAuth]);
  const fetchTimesheets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { start, end } = calculateDateRange(currentDate, viewType);
      const data = await fetchWithAuth(`${API_URL}/timesheets`, {
        params: {
          startDate: formatFnsDate(start, 'yyyy-MM-dd'),
          endDate: formatFnsDate(end, 'yyyy-MM-dd'),
        },
      });
      const fetchedTimesheets = data?.timesheets;
      setTimesheets(Array.isArray(fetchedTimesheets) ? fetchedTimesheets : []);
    } catch (error) {
      console.error('Error fetching timesheets:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to fetch timesheets.');
      setTimesheets([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, viewType, fetchWithAuth]);


  // --- Effects (remain the same) ---
  useEffect(() => {
    fetchEmployees();
    fetchClients();
    fetchProjects();
  }, [fetchEmployees, fetchClients, fetchProjects]);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);


  // --- Event Handlers (useCallback wrappers remain the same) ---
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
            case 'Monthly': newDt = dt.minus({ weeks: 4 }); break;
            default: newDt = dt.minus({ weeks: 1 }); break;
        }
        return (viewType === 'Daily' ? newDt : newDt.startOf('week')).toJSDate();
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
            case 'Monthly': newDt = dt.plus({ weeks: 4 }); break;
            default: newDt = dt.plus({ weeks: 1 }); break;
        }
        return (viewType === 'Daily' ? newDt : newDt.startOf('week')).toJSDate();
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
              startDate: startDate ? formatFnsDate(startDate, 'yyyy-MM-dd') : null,
              endDate: endDate ? formatFnsDate(endDate, 'yyyy-MM-dd') : null,
              // timezone: browserTimezone, // NO LONGER NEEDED
          };
          await axios.post(`${API_URL}/timesheets/send`, body, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
          setShowSendFilters(false); setEmail(''); setSelectedEmployee(''); setStartDate(null); setEndDate(null);
      } catch (error) {
          console.error('Error sending timesheet email:', error.response?.data || error.message);
          setSendError(error.response?.data?.message || 'Failed to send timesheet. Please try again.');
          if (error.response?.status === 401) navigate('/login');
      } finally { setIsSending(false); }
  }, [email, selectedEmployee, startDate, endDate, navigate]); // Removed browserTimezone

  const handleDownload = useCallback(async () => {
      setDownloadError(null); setIsDownloading(true); setError(null);
      try {
          const token = localStorage.getItem('token');
          if (!token) { navigate('/login'); throw new Error('Authentication error!'); }
          const body = {
              employeeIds: selectedEmployee ? [selectedEmployee] : [],
              startDate: startDate ? formatFnsDate(startDate, 'yyyy-MM-dd') : null,
              endDate: endDate ? formatFnsDate(endDate, 'yyyy-MM-dd') : null,
              // timezone: browserTimezone, // NO LONGER NEEDED
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
              } catch (parseError) { /* Ignore */ }
          } else if (err.response?.data?.message || err.response?.data?.error) {
              errorMessage = err.response.data.message || err.response.data.error;
          } else if (err.message) { errorMessage = err.message; }
          setDownloadError(errorMessage);
          if (err.response?.status === 401) navigate('/login');
      } finally { setIsDownloading(false); }
  }, [selectedEmployee, startDate, endDate, navigate]); // Removed browserTimezone


  // --- Memos and Calculations ---
  const generateDateColumns = useMemo(() => {
    const { start } = calculateDateRange(currentDate, viewType);
    const startDt = DateTime.fromJSDate(start);
    let daysCount;
    switch (viewType) {
      case 'Daily': daysCount = 1; break;
      case 'Weekly': daysCount = 7; break;
      case 'Fortnightly': daysCount = 14; break;
      case 'Monthly': daysCount = 28; break;
      default: daysCount = 7;
    }
    return Array.from({ length: daysCount }, (_, i) => {
      const dayDt = startDt.plus({ days: i });
      return {
        date: dayDt.toJSDate(),
        longFormat: dayDt.toFormat('MMM dd, yyyy'),
        isoDate: dayDt.toFormat('yyyy-MM-dd'),
        dayName: dayDt.toFormat('EEEE'),
        shortDayName: dayDt.toFormat('EEE'),
      };
    });
  }, [currentDate, viewType]);

  // Group timesheets - Use the new formatting helpers
  const groupTimesheets = useMemo(() => {
      let grouped = {};
      const currentViewDates = new Set(generateDateColumns.map(d => d.isoDate));

      timesheets.forEach((timesheet) => {
        // Use the timesheet's stored timezone for date formatting, fallback to browser default
        const entryTimezone = timesheet.timezone || browserTimezone;
        const entryLocalDate = formatDateInTimezone(timesheet.date, entryTimezone);

        if (!currentViewDates.has(entryLocalDate)) return;

        const employeeIdValue = timesheet.employeeId?._id || timesheet.employeeId;
        if (!employeeIdValue) return;

        const employee = employees.find((emp) => emp._id === employeeIdValue);
        const employeeName = employee ? employee.name : `Unknown (${String(employeeIdValue).slice(-4)})`;
        const employeeStatus = employee ? (employee.status || 'Active') : 'Unknown';
        const employeeExpectedHours = employee?.expectedWeeklyHours || 40;

        const clientIdValue = timesheet.clientId?._id || timesheet.clientId;
        const projectIdValue = timesheet.projectId?._id || timesheet.projectId;
        const client = clientIdValue ? clients.find((c) => c._id === clientIdValue) : null;
        const clientName = client ? client.name : (clientIdValue ? 'N/A' : '');
        const project = projectIdValue ? projects.find((p) => p._id === projectIdValue) : null;
        const projectName = project ? project.name : (projectIdValue ? 'N/A' : '');

        if (!grouped[employeeIdValue]) {
          grouped[employeeIdValue] = {
            id: employeeIdValue, name: employeeName, status: employeeStatus,
            hoursPerDay: {}, details: [], expectedHours: employeeExpectedHours,
          };
          generateDateColumns.forEach(day => (grouped[employeeIdValue].hoursPerDay[day.isoDate] = 0));
        }

        // Use the CORRECT totalHours from the database entry
        grouped[employeeIdValue].hoursPerDay[entryLocalDate] += parseFloat(timesheet.totalHours || 0);

        grouped[employeeIdValue].details.push({
          ...timesheet, // Keep raw data (UTC times, stored timezone)
          clientName, projectName,
          formattedLocalDate: entryLocalDate, // Store the local date string for this entry's timezone
        });
      });

      // Sort details within each group by UTC date/time
      Object.values(grouped).forEach(group => {
          group.details.sort((a, b) => {
              const dateA = DateTime.fromISO(a.date, { zone: 'utc' }).toMillis();
              const dateB = DateTime.fromISO(b.date, { zone: 'utc' }).toMillis();
              if (dateA !== dateB) return dateA - dateB;
              const timeA = a.startTime ? DateTime.fromISO(a.startTime, { zone: 'utc' }).toMillis() : 0;
              const timeB = b.startTime ? DateTime.fromISO(b.startTime, { zone: 'utc' }).toMillis() : 0;
              return timeA - timeB;
          });
      });

      return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));

    }, [timesheets, employees, clients, projects, generateDateColumns, browserTimezone]); // Added browserTimezone as fallback


  // Period Display Text (remains the same)
  const periodDisplayText = useMemo(() => {
    if (!generateDateColumns || generateDateColumns.length === 0) return 'Loading...';
    const firstDay = DateTime.fromJSDate(generateDateColumns[0].date);
    if (viewType === 'Daily') {
        return firstDay.toFormat('MMM dd yyyy, EEE');
    } else {
        const lastDay = DateTime.fromJSDate(generateDateColumns[generateDateColumns.length - 1].date);
        const startFormat = 'MMM dd';
        const endFormat = firstDay.year !== lastDay.year ? 'MMM dd, yyyy' : 'MMM dd, yyyy';
        return `${firstDay.toFormat(startFormat)} - ${lastDay.toFormat(endFormat)}`;
    }
  }, [generateDateColumns, viewType]);

  // --- Rendering Logic ---
  const renderTableHeaders = () => {
    const headers = [
        <th key="expand" className="col-expand"></th>,
        <th key="status" className="col-status">Status</th>,
        <th key="name" className="col-name">Name</th>,
    ];
    const defaultDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (viewType === 'Monthly' || viewType === 'Fortnightly' || viewType === 'Weekly') {
        if (viewType === 'Monthly' || viewType === 'Fortnightly') {
            headers.push(<th key="week" className="col-week">Week</th>);
        }
        defaultDayOrder.forEach(dayName => {
            headers.push(<th key={`${dayName}-h`} className="col-day">{dayName.substring(0, 3)}</th>);
        });
    } else {
        headers.push(<th key="daily-date" className="col-day">{generateDateColumns[0]?.shortDayName || 'Date'}</th>);
    }
    headers.push(<th key="total" className="col-total total-header">Total</th>);
    return headers;
   };

  // --- JSX ---
  return (
    <div className='timesheet-page'>
      {/* Header, Filters, Navigation */}
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
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="filter-select" aria-label="Select Employee for Download">
              <option value="">All Employees</option>
              {employees.map(emp => (<option key={emp._id} value={emp._id}>{emp.name}</option>))}
            </select>
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
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="filter-select" aria-label="Select Employee for Sending">
              <option value="">All Employees</option>
              {employees.map(emp => (<option key={emp._id} value={emp._id}>{emp.name}</option>))}
            </select>
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
          <button className='nav-button btn btn-blue' onClick={handlePrev} aria-label="Previous Period">
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Prev {viewType === 'Daily' ? 'Day' : viewType === 'Weekly' ? 'Week' : 'Period'}</span>
          </button>
          <div className='view-type-select-wrapper'>
            <select id='viewType' value={viewType} onChange={(e) => setViewType(e.target.value)} className='view-type-dropdown' aria-label="Select View Type">
              <option value='Daily'>View by Daily</option>
              <option value='Weekly'>View by Weekly</option>
              <option value='Fortnightly'>View by Fortnightly</option>
              <option value='Monthly'>View by Monthly</option>
            </select>
          </div>
          <button className='nav-button btn btn-blue' onClick={handleNext} aria-label="Next Period">
             <span>Next {viewType === 'Daily' ? 'Day' : viewType === 'Weekly' ? 'Week' : 'Period'}</span>
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>
        <Link to="/timesheet/create" className='btn btn-success create-timesheet-link'>
          <FontAwesomeIcon icon={faPlus} /> Create Timesheet
        </Link>
      </div>

       {/* --- Loading / Error / Table Section --- */}
       {isLoading ? (
         <div className='loading-indicator'><FontAwesomeIcon icon={faSpinner} spin size='2x' /> Loading Timesheets...</div>
       ) : error ? (
         <div className='error-message'><FontAwesomeIcon icon={faExclamationCircle} /> {error}</div>
       ) : (
         <div className="timesheet-table-wrapper">
           <table className='timesheet-table'>
             <thead><tr>{renderTableHeaders()}</tr></thead>
             <tbody>
               {groupTimesheets.length === 0 ? (
                 <tr><td colSpan={renderTableHeaders().length} className="no-results">No timesheet entries found.</td></tr>
               ) : (
                 groupTimesheets.map((employeeGroup) => {
                   const isExpanded = !!expandedRows[employeeGroup.id];
                   const totalEmployeeHoursDecimal = Object.values(employeeGroup.hoursPerDay).reduce((sum, hours) => sum + hours, 0);
                   const weeksData = (viewType === 'Monthly' || viewType === 'Fortnightly') ? groupDatesByWeek(generateDateColumns) : [generateDateColumns];
                   const numWeeks = weeksData.length;
                   const useRowSpan = viewType === 'Monthly' || viewType === 'Fortnightly';
                   const currentDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

                   return (
                     weeksData.map((weekDates, weekIndex) => (
                       <tr key={`${employeeGroup.id}-week-${weekIndex}`} className={isExpanded ? 'expanded-parent' : ''}>
                         {/* RowSpan Columns */}
                         {weekIndex === 0 && (
                           <>
                             <td rowSpan={useRowSpan ? numWeeks : 1} className="col-expand">
                               <button onClick={() => toggleExpand(employeeGroup.id)} className='expand-btn' aria-expanded={isExpanded}>
                                 <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                               </button>
                             </td>
                             <td rowSpan={useRowSpan ? numWeeks : 1} className="col-status employee-status-cell">
                               <span className={`status-badge status-${employeeGroup.status?.toLowerCase()}`}>{employeeGroup.status || 'Unknown'}</span>
                             </td>
                             <td rowSpan={useRowSpan ? numWeeks : 1} className="col-name employee-name-cell">{employeeGroup.name}</td>
                           </>
                         )}
                         {/* Week Column */}
                         {(viewType === 'Monthly' || viewType === 'Fortnightly') && (<td className="col-week center-text">{weekIndex + 1}</td>)}

                         {/* Day columns - Use new formatters */}
                         {currentDayOrder.map(dayName => {
                           const dayData = weekDates.find(d => d.dayName === dayName);
                           const hours = dayData ? (employeeGroup.hoursPerDay[dayData.isoDate] || 0) : 0;
                           const dailyEntries = dayData ? employeeGroup.details.filter(entry => entry.formattedLocalDate === dayData.isoDate) : [];

                           return (
                             <td key={`${employeeGroup.id}-${dayData?.isoDate || dayName}-${weekIndex}`} className={`col-day numeric daily-detail-cell ${isExpanded ? 'expanded' : ''}`}>
                               {isExpanded ? (
                                 <div className="day-details-wrapper">
                                   {dailyEntries.length > 0 ? dailyEntries.map(entry => {
                                       const entryTimezone = entry.timezone || browserTimezone;
                                       return (
                                         <div key={entry._id} className="timesheet-entry-detail-inline">
                                           <div className="inline-actions">
                                             <button className='icon-btn edit-btn' onClick={() => handleUpdate(entry)} title="Edit Entry"><FontAwesomeIcon icon={faPen} /></button>
                                             <button className='icon-btn delete-btn' onClick={() => handleDelete(entry._id)} title="Delete Entry"><FontAwesomeIcon icon={faTrash} /></button>
                                           </div>
                                           <div className="detail-section"><span className="detail-label">DATE:</span><span className="detail-value">{formatDateInTimezone(entry.date, entryTimezone)}</span></div>
                                           <div className="detail-section"><span className="detail-label">DAY:</span><span className="detail-value">{DateTime.fromISO(entry.date, {zone: 'utc'}).setZone(entryTimezone).toFormat('EEEE')}</span></div>
                                           <div className="detail-section"><span className="detail-label">EMPLOYEE:</span><span className="detail-value">{employeeGroup.name}</span></div>
                                           <div className="detail-section"><span className="detail-label">CLIENT:</span><span className="detail-value">{entry.clientName || 'N/A'}</span></div>
                                           <div className="detail-section"><span className="detail-label">PROJECT:</span><span className="detail-value">{entry.projectName || 'N/A'}</span></div>
                                           <div className="detail-separator"></div>
                                           <div className="detail-section total-hours-section"><span className="detail-label">TOTAL</span><span className="detail-value bold">{formatHoursMinutes(entry.totalHours)}</span></div>
                                           <div className="detail-separator"></div>
                                           <div className="detail-section stacked"><span className="detail-label">Start:</span><span className="detail-value">{formatTimeInTimezone(entry.startTime, entryTimezone)}</span></div>
                                           <div className="detail-section stacked"><span className="detail-label">End:</span><span className="detail-value">{formatTimeInTimezone(entry.endTime, entryTimezone)}</span></div>
                                           <div className="detail-section stacked"><span className="detail-label">Lunch:</span><span className="detail-value">{entry.lunchBreak === 'Yes' ? formatLunchDuration(entry.lunchDuration) : 'No break'}</span></div>
                                           {entry.leaveType && entry.leaveType !== 'None' && (
                                             <>
                                               <div className="detail-section stacked"><span className="detail-label">Leave:</span><span className="detail-value">{entry.leaveType}</span></div>
                                               {entry.description && (<div className="detail-section stacked description-item"><span className="detail-label">Desc:</span><span className="detail-value">{entry.description}</span></div>)}
                                             </>
                                           )}
                                           {entry.notes && entry.notes.trim() !== '' && (
                                                <>
                                                    <div className="detail-separator"></div>
                                                    <div className="detail-section"><span className="detail-label">Work Notes:</span><span className="detail-value">{entry.notes}</span></div>
                                                </>
                                            )}
                                         </div>
                                       );
                                   }) : (
                                     <span className="no-entry-text">{formatHoursMinutes(0)}</span>
                                   )}
                                 </div>
                               ) : (
                                 formatHoursMinutes(hours)
                               )}
                             </td>
                           );
                         })}

                         {/* Total column */}
                         {weekIndex === 0 && (
                           <td rowSpan={useRowSpan ? numWeeks : 1} className="col-total numeric total-summary-cell">
                             {totalEmployeeHoursDecimal <= 0 ? (
                               <span className="no-entry-text">00:00</span>
                             ) : (
                               (() => {
                                 const daysInView = generateDateColumns.length;
                                 const weeklyExpected = Number(employeeGroup.expectedHours) || 0;
                                 const expectedHoursForPeriod = (weeklyExpected / 7) * daysInView;
                                 const overtimeHoursDecimal = Math.max(0, totalEmployeeHoursDecimal - expectedHoursForPeriod);
                                 return (
                                   <div className="total-details">
                                     <span>Expected: <strong>{formatHoursMinutes(expectedHoursForPeriod)}</strong></span>
                                     <span>Overtime: <strong className={overtimeHoursDecimal > 0 ? 'overtime' : ''}>{formatHoursMinutes(overtimeHoursDecimal)}</strong></span>
                                     <span>Total: <strong>{formatHoursMinutes(totalEmployeeHoursDecimal)}</strong></span>
                                   </div>
                                 );
                               })()
                             )}
                           </td>
                         )}
                       </tr>
                     ))
                   );
                 })
               )}
             </tbody>
           </table>
         </div>
       )}
    </div>
  );
};

export default Timesheet;