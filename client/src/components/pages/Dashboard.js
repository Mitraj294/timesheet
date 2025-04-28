// /home/digilab/timesheet/client/src/components/pages/Dashboard.js
import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
// --- UPDATED IMPORTS ---
// Import from employeeSlice instead of employeeActions
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from "../../redux/slices/employeeSlice";
// --- END UPDATED IMPORTS ---
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Select from "react-select";
import {
  faUsers,
  faClock,
  faStopwatch,
  faUtensils,
  faCalendarAlt,
  faTasks,
  faBriefcase,
  faSpinner,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import Chart from "chart.js/auto";
import "../../styles/Dashboard.scss";
import { DateTime } from "luxon";

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Helper Functions (Keep as is)
// ... (convertDecimalToTime, groupBy, getPeriodRange, etc.) ...
const convertDecimalToTime = (decimalHours) => {
  if (isNaN(decimalHours) || decimalHours == null) return "00:00";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const groupBy = (key, data = []) => {
  return data.reduce((acc, entry) => {
    if (!entry || !entry[key]) return acc;
    const idField = entry[key];
    const id = typeof idField === 'object' && idField !== null ? idField._id : idField;
    const name = typeof idField === 'object' && idField !== null ? idField.name : id;
    if (!id) return acc;
    if (!acc[id]) {
      acc[id] = { totalHours: 0, name: name || id };
    }
    acc[id].totalHours += (parseFloat(entry.totalHours) || 0);
    return acc;
  }, {});
};

const getPeriodRange = (view) => {
  const today = DateTime.local();
  let startDt, endDt;
  if (view === "Weekly") {
    startDt = today.startOf('week');
    endDt = startDt.endOf('week');
  } else if (view === "Fortnightly") {
    // Assuming Fortnightly means current week + previous week
    startDt = today.minus({ weeks: 1 }).startOf('week');
    endDt = startDt.plus({ days: 13 }).endOf('day'); // 14 days total
  } else if (view === "Monthly") {
    // Align monthly view to start on the first week containing the 1st of the month
    startDt = today.startOf('month').startOf('week');
    // Ensure it covers roughly 4 full weeks for consistency
    endDt = startDt.plus({ weeks: 4 }).minus({ days: 1 }).endOf('day');
  } else { // Default to Weekly
    startDt = today.startOf('week');
    endDt = startDt.endOf('week');
  }
  return { start: startDt.toJSDate(), end: endDt.toJSDate() };
};

const getPreviousPeriodRange = (currentRange, view) => {
  const startDt = DateTime.fromJSDate(currentRange.start);
  let prevStartDt;
  // Calculate duration based on current range to handle potential month variations
  let duration = DateTime.fromJSDate(currentRange.end).diff(startDt, 'days').days;

  if (view === "Weekly") {
    prevStartDt = startDt.minus({ weeks: 1 });
  } else if (view === "Fortnightly") {
    prevStartDt = startDt.minus({ weeks: 2 });
  } else if (view === "Monthly") {
     // Go back by the duration of the current 'monthly' view + 1 day
     prevStartDt = startDt.minus({ days: duration + 1 });
  } else { // Default to Weekly
    prevStartDt = startDt.minus({ weeks: 1 });
  }
  // End date is previous start + duration
  const prevEndDt = prevStartDt.plus({ days: duration }).endOf('day');
  return { start: prevStartDt.toJSDate(), end: prevEndDt.toJSDate() };
};

const getDayTotals = (data, periodStart) => {
  const dailyTotals = [];
  const startDt = DateTime.fromJSDate(periodStart);
  for (let i = 0; i < 7; i++) { // Always 7 days for weekly breakdown
    const currentDay = startDt.plus({ days: i });
    const total = data
      .filter((t) => {
        if (!t || !t.date) return false;
        try {
            const entryDt = DateTime.fromISO(t.date);
            // Check if the entry date falls on the current day being iterated
            return entryDt.hasSame(currentDay, 'day');
        } catch (e) {
            console.warn("Invalid date format in timesheet:", t.date);
            return false;
        }
      })
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
    dailyTotals.push(total);
  }
  return dailyTotals;
};

const getWeeklyTotals = (data, periodStart, weeks) => {
  const weeklyTotals = [];
  const startDt = DateTime.fromJSDate(periodStart);
  for (let w = 0; w < weeks; w++) {
    const weekStartDt = startDt.plus({ weeks: w });
    const weekEndDt = weekStartDt.endOf('week'); // End of the current week iteration
    const weekTotal = data
      .filter((t) => {
        if (!t || !t.date) return false;
        try {
            const entryDt = DateTime.fromISO(t.date);
            // Check if the entry date falls within the current week iteration
            return entryDt >= weekStartDt && entryDt <= weekEndDt;
        } catch (e) {
            console.warn("Invalid date format in timesheet:", t.date);
            return false;
        }
      })
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
    weeklyTotals.push(weekTotal);
  }
  return weeklyTotals;
};


// Main Dashboard Component
const Dashboard = () => {
  const dispatch = useDispatch();

  // --- Selectors with defensive checks ---
  const employees = useSelector(state => {
    // console.log('Dashboard - Running selectAllEmployees:', typeof selectAllEmployees);
    if (typeof selectAllEmployees !== 'function') {
        console.error('Dashboard - selectAllEmployees is not a function!');
        return []; // Return default value to avoid crash
    }
    return selectAllEmployees(state);
  });
  const employeeStatus = useSelector(state => {
    // console.log('Dashboard - Running selectEmployeeStatus:', typeof selectEmployeeStatus);
     if (typeof selectEmployeeStatus !== 'function') {
        console.error('Dashboard - selectEmployeeStatus is not a function!');
        return 'idle'; // Return default value
    }
    return selectEmployeeStatus(state);
  });
  const employeesError = useSelector(state => {
    // console.log('Dashboard - Running selectEmployeeError:', typeof selectEmployeeError);
     if (typeof selectEmployeeError !== 'function') {
        console.error('Dashboard - selectEmployeeError is not a function!');
        return null; // Return default value
    }
    return selectEmployeeError(state);
  });

  // Select token and auth loading status for conditional fetching
  const { token, isLoading: isAuthLoading, isAuthenticated } = useSelector((state) => state.auth || {});
  const { user } = useSelector((state) => state.auth || {}); // Keep user selector if needed elsewhere

  // Component State
  const [allTimesheets, setAllTimesheets] = useState([]);
  const [employeeTimesheets, setEmployeeTimesheets] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState({ value: "All", label: "All Employees" });
  const [viewType, setViewType] = useState({ value: "Weekly", label: "View by Weekly" });
  const [isLoading, setIsLoading] = useState(true); // Local loading for timesheets
  const [error, setError] = useState(null); // Local error for timesheets

  // Refs for Charts
  const chartRef = useRef(null);
  const clientsChartRef = useRef(null);
  const projectsChartRef = useRef(null);

  // Effect for fetching dashboard data (Timesheets) and Employees
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true); // Start loading timesheets
      setError(null); // Clear previous timesheet errors

      // Check for token *before* making any API calls
      const storedToken = localStorage.getItem("token"); // Or get from Redux state if already loaded
      if (!storedToken && !token) { // Check both localStorage and Redux state
        setError("Authentication required.");
        setIsLoading(false);
        // Optionally redirect to login here
        return;
      }

      const currentToken = token || storedToken; // Use Redux token if available, else localStorage
      const config = { headers: { Authorization: `Bearer ${currentToken}` } };

      // Fetch employees only if authenticated and needed
      if (currentToken && employeeStatus === 'idle' && !isAuthLoading) {
        console.log("Dashboard - Dispatching fetchEmployees");
        dispatch(fetchEmployees());
      } else {
        console.log(`Dashboard - Skipping fetchEmployees: Token=${!!currentToken}, Status=${employeeStatus}, AuthLoading=${isAuthLoading}`);
      }

      // Fetch timesheets if authenticated
      if (currentToken) {
        try {
          const tsRes = await axios.get(`${API_URL}/timesheets`, config);
          setAllTimesheets(tsRes.data?.timesheets || []);
        } catch (err) {
           console.error("Dashboard: Failed to fetch timesheets:", err.response || err);
          let message = "Failed to load timesheet data.";
          if (err.response) {
              message = `Server Error: ${err.response.status} - ${err.response.data?.message || 'Unknown error'}`;
              if (err.response.status === 401) {
                  message = "Authentication failed. Please log in again.";
              }
          } else if (err.request) {
              message = "Network Error: Could not reach the server.";
          } else {
              message = `Error: ${err.message}`;
          }
          setError(message); // Set local timesheet error
        } finally {
          setIsLoading(false); // Stop loading timesheets
        }
      } else {
          // Handle case where token disappeared mid-process (less likely but possible)
          setError("Authentication token missing.");
          setIsLoading(false);
      }
    };

    // Only run fetch if auth isn't loading (or initial auth check is done)
    if (!isAuthLoading) {
        fetchDashboardData();
    } else {
        console.log("Dashboard - Waiting for auth to finish loading...");
    }

  }, [dispatch, employeeStatus, token, isAuthLoading]); // Dependencies

   // Effect to filter timesheets based on selected employee
  useEffect(() => {
    if (selectedEmployee.value === "All") {
      setEmployeeTimesheets(allTimesheets);
    } else {
      setEmployeeTimesheets(
        allTimesheets.filter(ts => (ts.employeeId?._id || ts.employeeId) === selectedEmployee.value)
      );
    }
  }, [selectedEmployee, allTimesheets]);

  // Memoize employee options for the dropdown
  const employeeOptions = useMemo(() => {
      const options = [
        { value: "All", label: "All Employees" },
        // Ensure employees is an array before mapping
        ...(Array.isArray(employees) ? employees.map((emp) => ({ value: emp._id, label: emp.name })) : []),
      ];
      return options;
  }, [employees]); // Re-calculate only when employees array changes

  //  Memoized Calculations
  const viewOptions = [
    { value: "Weekly", label: "View by Weekly" },
    { value: "Fortnightly", label: "View by Fortnightly" },
    { value: "Monthly", label: "View by Monthly" },
  ];

  // Filter out leave entries for hour calculations
  const validTimesheets = useMemo(() => employeeTimesheets.filter((t) => !t.leaveType || t.leaveType === "None"), [employeeTimesheets]);

  const currentPeriod = useMemo(() => getPeriodRange(viewType.value), [viewType.value]);
  const previousPeriod = useMemo(() => getPreviousPeriodRange(currentPeriod, viewType.value), [currentPeriod, viewType.value]);

  // Filter timesheets based on the calculated date ranges
  const filteredCurrentTimesheets = useMemo(() => {
    return validTimesheets.filter((t) => {
      if (!t || !t.date) return false;
      try {
        const d = DateTime.fromISO(t.date);
        // Use Luxon's comparison methods
        return d >= DateTime.fromJSDate(currentPeriod.start) && d <= DateTime.fromJSDate(currentPeriod.end);
      } catch { return false; } // Handle invalid date strings
    });
  }, [validTimesheets, currentPeriod]);

  const filteredPreviousTimesheets = useMemo(() => {
    return validTimesheets.filter((t) => {
      if (!t || !t.date) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= DateTime.fromJSDate(previousPeriod.start) && d <= DateTime.fromJSDate(previousPeriod.end);
      } catch { return false; }
    });
  }, [validTimesheets, previousPeriod]);

  // Summary calculations...
  const totalHoursAllSummary = useMemo(() => allTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [allTimesheets]);
  const validTimesheetsForAvgAll = useMemo(() => allTimesheets.filter((ts) => !ts.leaveType || ts.leaveType === "None"), [allTimesheets]);
  const avgHoursAllSummary = validTimesheetsForAvgAll.length ? (totalHoursAllSummary / validTimesheetsForAvgAll.length) : 0;

  const totalHoursEmployeeSummary = useMemo(() => filteredCurrentTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [filteredCurrentTimesheets]);
  const avgHoursEmployeeSummary = filteredCurrentTimesheets.length ? (totalHoursEmployeeSummary / filteredCurrentTimesheets.length) : 0;

  // Format hours for display
  const formattedTotalHoursAll = convertDecimalToTime(totalHoursAllSummary);
  const formattedAvgHoursAll = convertDecimalToTime(avgHoursAllSummary);
  const formattedTotalHoursEmployee = convertDecimalToTime(totalHoursEmployeeSummary);
  const formattedAvgHoursEmployee = convertDecimalToTime(avgHoursEmployeeSummary);

  // Determine which hours to display based on selection
  const displayTotalHours = selectedEmployee.value === "All" ? formattedTotalHoursAll : formattedTotalHoursEmployee;
  const displayAvgHours = selectedEmployee.value === "All" ? formattedAvgHoursAll : formattedAvgHoursEmployee;

  // Other summary stats
  const totalLeaves = useMemo(() => employeeTimesheets.filter(t => t.leaveType && !["None", "Public Holiday", "Annual"].includes(t.leaveType)).length, [employeeTimesheets]);
  const lunchBreakEntries = useMemo(() => validTimesheets.filter((t) => t.lunchBreak === "Yes"), [validTimesheets]);
  const totalLunchDuration = useMemo(() => lunchBreakEntries.reduce((acc, t) => {
    if (!t.lunchDuration || !t.lunchDuration.includes(':')) return acc;
    const [h, m] = t.lunchDuration.split(":").map(Number);
    return acc + (h + m / 60); // Convert HH:MM to decimal hours
  }, 0), [lunchBreakEntries]);
  const avgLunchBreak = lunchBreakEntries.length > 0 ? convertDecimalToTime(totalLunchDuration / lunchBreakEntries.length) : "00:00";
  const projectsWorked = useMemo(() => new Set(validTimesheets.map((t) => t.projectId?._id || t.projectId).filter(Boolean)).size, [validTimesheets]);
  const clientsWorked = useMemo(() => new Set(validTimesheets.map((t) => t.clientId?._id || t.clientId).filter(Boolean)).size, [validTimesheets]);

  // Chart data generation...
  const { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel } = useMemo(() => {
    let labels = [];
    let currentData = [];
    let previousData = [];
    let thisPeriodLabel = "";
    let lastPeriodLabel = "";
    const currentStart = currentPeriod.start;
    const previousStart = previousPeriod.start;
    let weeks = 1; // Default for Weekly

    if (viewType.value === "Weekly") {
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      currentData = getDayTotals(filteredCurrentTimesheets, currentStart);
      previousData = getDayTotals(filteredPreviousTimesheets, previousStart);
      thisPeriodLabel = "This Week";
      lastPeriodLabel = "Last Week";
    } else if (viewType.value === "Fortnightly") {
      labels = ["Week 1", "Week 2"];
      weeks = 2;
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, weeks);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, weeks);
      thisPeriodLabel = "This Fortnight";
      lastPeriodLabel = "Last Fortnight";
    } else if (viewType.value === "Monthly") {
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      weeks = 4;
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, weeks);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, weeks);
      thisPeriodLabel = "This Month";
      lastPeriodLabel = "Last Month";
    }
    return { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel };
  }, [viewType.value, filteredCurrentTimesheets, filteredPreviousTimesheets, currentPeriod, previousPeriod]);

  //  Chart Rendering Effects
  useEffect(() => {
    const ctx = document.getElementById("graphCanvas")?.getContext("2d");
    if (!ctx) return; // Exit if canvas context not found

    // Destroy previous chart instance if it exists
    if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
    }

    // Create new chart instance
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: thisPeriodLabel, data: currentData, backgroundColor: "rgba(54, 162, 235, 0.6)", borderColor: "rgba(54, 162, 235, 1)", borderWidth: 1 },
          { label: lastPeriodLabel, data: previousData, backgroundColor: "rgba(255, 99, 132, 0.6)", borderColor: "rgba(255, 99, 132, 1)", borderWidth: 1 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Allow chart to fill container height
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours Worked' } } },
        plugins: { legend: { position: 'top' } }
      }
    });

    // Cleanup function to destroy chart on component unmount or before re-render
    return () => {
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }
    };
  }, [labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel]); // Re-run effect when chart data changes

  // Client Pie Chart Data & Effect
  const clientChartData = useMemo(() => {
    const hoursByClient = groupBy("clientId", filteredCurrentTimesheets);
    const data = Object.values(hoursByClient).map(item => item.totalHours);
    const labels = Object.values(hoursByClient).map(item => item.name || 'Unknown Client');
    return { labels, data };
  }, [filteredCurrentTimesheets]);

  useEffect(() => {
    const clientCtx = document.getElementById("clientsGraph")?.getContext("2d");
    if (!clientCtx) return;

    if (clientsChartRef.current) {
        clientsChartRef.current.destroy();
        clientsChartRef.current = null;
    }

    // Display message if no data
    if (clientChartData.data.length === 0 || clientChartData.data.every(d => d === 0)) {
        clientCtx.clearRect(0, 0, clientCtx.canvas.width, clientCtx.canvas.height);
        clientCtx.font = "16px Arial";
        clientCtx.fillStyle = "#888";
        clientCtx.textAlign = "center";
        clientCtx.fillText("No client data for this period", clientCtx.canvas.width / 2, clientCtx.canvas.height / 2);
        return; // Don't create chart if no data
    }

    clientsChartRef.current = new Chart(clientCtx, {
      type: "pie",
      data: {
        labels: clientChartData.labels,
        datasets: [{ data: clientChartData.data, backgroundColor: ["#7b61ff", "#a6c0fe", "#d782d9", "#4f86f7", "#ffcb8a", "#a1e8cc", "#f17c67", "#b9e8f0"] }], // Example colors
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: {
                  position: "bottom",
                  labels: { boxWidth: 12 }
              }
          }
      },
    });

     return () => {
        if (clientsChartRef.current) {
            clientsChartRef.current.destroy();
            clientsChartRef.current = null;
        }
    };
  }, [clientChartData]); // Re-run when client data changes

  // Project Pie Chart Data & Effect
  const projectChartData = useMemo(() => {
    const hoursByProject = groupBy("projectId", filteredCurrentTimesheets);
    const data = Object.values(hoursByProject).map(item => item.totalHours);
    const labels = Object.values(hoursByProject).map(item => item.name || 'Unknown Project');
    return { labels, data };
  }, [filteredCurrentTimesheets]);

  useEffect(() => {
    const projectCtx = document.getElementById("projectsGraph")?.getContext("2d");
     if (!projectCtx) return;

    if (projectsChartRef.current) {
        projectsChartRef.current.destroy();
        projectsChartRef.current = null;
    }

    // Display message if no data
    if (projectChartData.data.length === 0 || projectChartData.data.every(d => d === 0)) {
        projectCtx.clearRect(0, 0, projectCtx.canvas.width, projectCtx.canvas.height);
        projectCtx.font = "16px Arial";
        projectCtx.fillStyle = "#888";
        projectCtx.textAlign = "center";
        projectCtx.fillText("No project data for this period", projectCtx.canvas.width / 2, projectCtx.canvas.height / 2);
        return; // Don't create chart if no data
    }

    projectsChartRef.current = new Chart(projectCtx, {
      type: "pie",
      data: {
        labels: projectChartData.labels,
        datasets: [{ data: projectChartData.data, backgroundColor: ["#9b59b6", "#3498db", "#2ecc71", "#e74c3c", "#f39c12", "#1abc9c", "#34495e", "#95a5a6"] }], // Example colors
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: {
                  position: "bottom",
                  labels: { boxWidth: 12 }
              }
          }
      },
    });

     return () => {
        if (projectsChartRef.current) {
            projectsChartRef.current.destroy();
            projectsChartRef.current = null;
        }
    };
  }, [projectChartData]); // Re-run when project data changes


  //  JSX Rendering
  // Determine loading state for employee dropdown based on Redux status
  const isEmployeeDropdownLoading = employeeStatus === 'loading';
  // Determine loading state for main dashboard content (timesheets) based on local state
  const isDashboardContentLoading = isLoading;
  // Combine loading states
  const showLoading = isAuthLoading || isEmployeeDropdownLoading || isDashboardContentLoading;

  // Determine combined error state
  const combinedError = error || employeesError; // Show local timesheet error first, then employee error

  return (
    <div className="view-dashboard-page">
      {/* Filters Section */}
      <div className="dashboard-filters-container">
        <div className="greeting">
            <h4>Hello, {user?.name || "User"}!</h4>
            <p>Here is your company status report.</p>
        </div>
        <div className="filters">
          <div className="select-container">
            <label htmlFor="employeeSelect">Select Employee:</label>
            <Select
              inputId="employeeSelect"
              options={employeeOptions}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              className="react-select-container"
              classNamePrefix="react-select"
              // Disable if any loading is happening
              isDisabled={showLoading}
              isLoading={isEmployeeDropdownLoading} // Show loading indicator based on employee fetch status
            />
          </div>
          <div className="select-container">
            <label htmlFor="viewTypeSelect">Period of Time:</label>
            <Select
              inputId="viewTypeSelect"
              options={viewOptions}
              value={viewType}
              onChange={setViewType}
              className="react-select-container"
              classNamePrefix="react-select"
              // Disable if any loading is happening
              isDisabled={showLoading}
            />
          </div>
        </div>
      </div>

      {/* Combined Loading Indicator */}
      {showLoading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>{isAuthLoading ? 'Authenticating...' : (isEmployeeDropdownLoading ? 'Loading employees...' : 'Loading dashboard data...')}</p>
        </div>
      )}

      {/* Combined Error Message Display - Show only if not loading */}
      {combinedError && !showLoading && (
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{combinedError}</p>
          {/* Add appropriate retry logic or guidance */}
          {combinedError === 'Not authorized, no token provided' || combinedError === 'Authentication required.' ? (
             <p>Please try logging in again.</p>
          ) : (
             // Generic retry for other errors (might need refinement)
             <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry Page Load</button>
          )}
        </div>
      )}

      {/* Main Content Area - Render only if not loading AND there are no errors */}
      {!showLoading && !combinedError && (
        <>
          {/* Summary Cards */}
          <div className="dashboard-summary-grid">
            {selectedEmployee.value === "All" ? (
              <>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faUsers} className="summary-icon users" />
                  <div className="summary-content">
                    {/* Ensure employees is an array */}
                    <h3>{(Array.isArray(employees) ? employees.length : 0)}</h3>
                    <p>Total Employees</p>
                  </div>
                </div>
                 <div className="summary-card">
                  <FontAwesomeIcon icon={faClock} className="summary-icon hours" />
                  <div className="summary-content">
                    <h3>{displayTotalHours}</h3>
                    <p>Total Hours</p>
                  </div>
                </div>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faStopwatch} className="summary-icon avg-hours" />
                  <div className="summary-content">
                    <h3>{displayAvgHours}</h3>
                    <p>Avg. Hours</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                 <div className="summary-card">
                  <FontAwesomeIcon icon={faClock} className="summary-icon hours" />
                  <div className="summary-content">
                    <h3>{displayTotalHours}</h3>
                    <p>Total Hours Worked</p>
                  </div>
                </div>
                 <div className="summary-card">
                  <FontAwesomeIcon icon={faStopwatch} className="summary-icon avg-hours" />
                  <div className="summary-content">
                    <h3>{displayAvgHours}</h3>
                    <p>Avg. Hours Worked</p>
                  </div>
                </div>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faUtensils} className="summary-icon lunch" />
                   <div className="summary-content">
                    <h3>{avgLunchBreak}</h3>
                    <p>Avg. Lunch Break</p>
                  </div>
                </div>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faCalendarAlt} className="summary-icon leaves" />
                   <div className="summary-content">
                    <h3>{totalLeaves}</h3>
                    <p>Total Leaves Taken</p>
                  </div>
                </div>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faBriefcase} className="summary-icon clients" />
                   <div className="summary-content">
                    <h3>{clientsWorked || 0}</h3>
                    <p>Clients Worked</p>
                  </div>
                </div>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faTasks} className="summary-icon projects" />
                   <div className="summary-content">
                    <h3>{projectsWorked || 0}</h3>
                    <p>Projects Worked</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bar Chart */}
          <div className="chart-card">
            <h4>This {viewType.label.split(' ')[2]} vs Last {viewType.label.split(' ')[2]} Hours</h4>
            <div className="chart-container bar-chart-container">
                {/* Canvas element for the chart */}
                <canvas id="graphCanvas"></canvas>
            </div>
          </div>

          {/* Pie Charts */}
          <div className="dashboard-pie-grid">
            <div className="chart-card">
              <h4>Hours Spent on Clients</h4>
              <div className="chart-total">
                Total: <span>{displayTotalHours}</span>
              </div>
              <div className="chart-container pie-chart-container">
                <canvas id="clientsGraph"></canvas>
              </div>
            </div>
            <div className="chart-card">
              <h4>Hours Spent on Projects</h4>
               <div className="chart-total">
                 Total: <span>{displayTotalHours}</span>
              </div>
              <div className="chart-container pie-chart-container">
                <canvas id="projectsGraph"></canvas>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
