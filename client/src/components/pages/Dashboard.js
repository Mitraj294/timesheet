// /home/digilab/timesheet/client/src/components/pages/Dashboard.js
import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from "../../redux/slices/employeeSlice";
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

// --- Helper Functions ---
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
      acc[id] = { totalHours: 0, name: name || `Unknown (${String(id).substring(0, 6)}...)` };
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
    startDt = today.minus({ weeks: 1 }).startOf('week');
    endDt = startDt.plus({ days: 13 }).endOf('day');
  } else if (view === "Monthly") {
    startDt = today.startOf('month').startOf('week');
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
  let duration = DateTime.fromJSDate(currentRange.end).diff(startDt, 'days').days;

  if (view === "Weekly") {
    prevStartDt = startDt.minus({ weeks: 1 });
  } else if (view === "Fortnightly") {
    prevStartDt = startDt.minus({ weeks: 2 });
  } else if (view === "Monthly") {
     prevStartDt = startDt.minus({ days: duration + 1 });
  } else { // Default to Weekly
    prevStartDt = startDt.minus({ weeks: 1 });
  }
  const prevEndDt = prevStartDt.plus({ days: duration }).endOf('day');
  return { start: prevStartDt.toJSDate(), end: prevEndDt.toJSDate() };
};

const getDayTotals = (data, periodStart) => {
  const dailyTotals = [];
  const startDt = DateTime.fromJSDate(periodStart);
  for (let i = 0; i < 7; i++) {
    const currentDay = startDt.plus({ days: i });
    const total = data
      .filter((t) => {
        if (!t || !t.date) return false;
        try {
            const entryDt = DateTime.fromISO(t.date);
            return entryDt.hasSame(currentDay, 'day');
        } catch (e) { return false; }
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
    const weekEndDt = weekStartDt.endOf('week');
    const weekTotal = data
      .filter((t) => {
        if (!t || !t.date) return false;
        try {
            const entryDt = DateTime.fromISO(t.date);
            return entryDt >= weekStartDt && entryDt <= weekEndDt;
        } catch (e) { return false; }
      })
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
    weeklyTotals.push(weekTotal);
  }
  return weeklyTotals;
};


// Main Dashboard Component
const Dashboard = () => {
  const dispatch = useDispatch();

  // --- Redux State Selectors ---
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employeesError = useSelector(selectEmployeeError);
  const { token, isLoading: isAuthLoading, isAuthenticated, user } = useSelector((state) => state.auth || {});

  // --- Component State ---
  const [allTimesheets, setAllTimesheets] = useState([]);
  const [employeeTimesheets, setEmployeeTimesheets] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState({ value: "All", label: "All Employees" });
  const [viewType, setViewType] = useState({ value: "Weekly", label: "View by Weekly" });
  const [isLoadingTimesheets, setIsLoadingTimesheets] = useState(true);
  const [timesheetError, setTimesheetError] = useState(null);
  // State for the client dropdown within the project card
  const [selectedProjectClient, setSelectedProjectClient] = useState({ value: "All", label: "All Clients" });

  // --- Refs for Charts ---
  const chartRef = useRef(null);
  const clientsChartRef = useRef(null);
  const projectsChartRef = useRef(null);

  // --- Effect for Fetching Data ---
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchDashboardData = async () => {
      if (isAuthLoading) {
        console.log(`[${new Date().toISOString()}] Dashboard: Waiting for auth loading.`);
        setIsLoadingTimesheets(false);
        return;
      }
      console.log(`[${new Date().toISOString()}] Dashboard: fetchDashboardData started.`);
      setIsLoadingTimesheets(true);
      setTimesheetError(null);
      const currentToken = token || localStorage.getItem("token");
      if (!currentToken) {
        console.log(`[${new Date().toISOString()}] Dashboard: No token, skipping fetch.`);
        setTimesheetError("Authentication required.");
        setIsLoadingTimesheets(false);
        return;
      }
      const config = { headers: { Authorization: `Bearer ${currentToken}` }, signal };
      if (employeeStatus === 'idle') {
        console.log(`[${new Date().toISOString()}] Dashboard: Dispatching fetchEmployees.`);
        dispatch(fetchEmployees());
      }
      try {
        console.log(`[${new Date().toISOString()}] Dashboard: Fetching timesheets...`);
        const tsRes = await axios.get(`${API_URL}/timesheets`, config);
        if (!signal.aborted) {
            console.log(`[${new Date().toISOString()}] Dashboard: Timesheets fetched.`);
            setAllTimesheets(tsRes.data?.timesheets || []);
        }
      } catch (err) {
        if (axios.isCancel(err)) {
            console.log(`[${new Date().toISOString()}] Dashboard: Timesheet fetch cancelled.`);
        } else if (!signal.aborted) {
            console.error(`[${new Date().toISOString()}] Dashboard: Failed to fetch timesheets:`, err.response?.data?.message || err.message);
            let message = "Failed to load timesheet data.";
            if (err.response) {
                message = `Server Error: ${err.response.status} - ${err.response.data?.message || 'Unknown error'}`;
                if (err.response.status === 401) message = "Authentication failed. Please log in again.";
            } else if (err.request) {
                message = "Network Error: Could not reach the server.";
            } else { message = `Error: ${err.message}`; }
            setTimesheetError(message);
        }
      } finally {
        if (!signal.aborted) {
            setIsLoadingTimesheets(false);
            console.log(`[${new Date().toISOString()}] Dashboard: Finished fetching timesheets.`);
        }
      }
    };
    fetchDashboardData();
    return () => {
        console.log(`[${new Date().toISOString()}] Dashboard: Cleaning up fetch effect.`);
        controller.abort();
    };
  }, [dispatch, employeeStatus, token, isAuthLoading]);

   // --- Effect to Filter Timesheets by Employee ---
  useEffect(() => {
    if (selectedEmployee.value === "All") {
      setEmployeeTimesheets(allTimesheets);
    } else {
      setEmployeeTimesheets(
        allTimesheets.filter(ts => (ts.employeeId?._id || ts.employeeId) === selectedEmployee.value)
      );
    }
  }, [selectedEmployee, allTimesheets]);

  // --- Memoized Data for Performance ---
  const employeeOptions = useMemo(() => [
    { value: "All", label: "All Employees" },
    ...(Array.isArray(employees) ? employees.map((emp) => ({ value: emp._id, label: emp.name })) : []),
  ], [employees]);

  const viewOptions = useMemo(() => [
    { value: "Weekly", label: "View by Weekly" },
    { value: "Fortnightly", label: "View by Fortnightly" },
    { value: "Monthly", label: "View by Monthly" },
  ], []);

  // Calculate current and previous periods based on viewType
  const currentPeriod = useMemo(() => getPeriodRange(viewType.value), [viewType.value]);
  const previousPeriod = useMemo(() => getPreviousPeriodRange(currentPeriod, viewType.value), [currentPeriod, viewType.value]);

  // Filter ALL timesheets by the current period (for "All Employees" summary)
  const filteredAllCurrentTimesheets = useMemo(() => {
    const start = DateTime.fromJSDate(currentPeriod.start);
    const end = DateTime.fromJSDate(currentPeriod.end);
    // Filter out leave entries from all timesheets for this period
    return allTimesheets.filter((t) => {
      if (!t?.date || (t.leaveType && t.leaveType !== "None")) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= start && d <= end;
      } catch { return false; }
    });
  }, [allTimesheets, currentPeriod]);

  // Filter the currently selected employee's timesheets by the current period (for single employee summary & charts)
  const validTimesheets = useMemo(() => employeeTimesheets.filter((t) => !t.leaveType || t.leaveType === "None"), [employeeTimesheets]);
  const filteredCurrentTimesheets = useMemo(() => {
    const start = DateTime.fromJSDate(currentPeriod.start);
    const end = DateTime.fromJSDate(currentPeriod.end);
    return validTimesheets.filter((t) => {
      if (!t?.date) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= start && d <= end;
      } catch { return false; }
    });
  }, [validTimesheets, currentPeriod]);

  // Filter the currently selected employee's timesheets by the previous period (for bar chart comparison)
  const filteredPreviousTimesheets = useMemo(() => {
    const start = DateTime.fromJSDate(previousPeriod.start);
    const end = DateTime.fromJSDate(previousPeriod.end);
    return validTimesheets.filter((t) => {
      if (!t?.date) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= start && d <= end;
      } catch { return false; }
    });
  }, [validTimesheets, previousPeriod]);

  // --- Loading and Error States ---
  const isEmployeeLoading = employeeStatus === 'loading';
  const showLoading = isAuthLoading || isEmployeeLoading || isLoadingTimesheets;
  const combinedError = timesheetError || employeesError;

  // --- Summary Calculations ---

  // Calculate totals for ALL employees within the CURRENT PERIOD
  const totalHoursAllPeriodSummary = useMemo(() => filteredAllCurrentTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [filteredAllCurrentTimesheets]);
  const avgHoursAllPeriodSummary = useMemo(() => filteredAllCurrentTimesheets.length ? (totalHoursAllPeriodSummary / filteredAllCurrentTimesheets.length) : 0, [totalHoursAllPeriodSummary, filteredAllCurrentTimesheets]);

  // Calculate totals for the SELECTED employee within the CURRENT PERIOD
  const totalHoursEmployeeSummary = useMemo(() => filteredCurrentTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [filteredCurrentTimesheets]);
  const avgHoursEmployeeSummary = useMemo(() => filteredCurrentTimesheets.length ? (totalHoursEmployeeSummary / filteredCurrentTimesheets.length) : 0, [totalHoursEmployeeSummary, filteredCurrentTimesheets]);

  // Format hours for display
  const formattedTotalHoursAllPeriod = convertDecimalToTime(totalHoursAllPeriodSummary);
  const formattedAvgHoursAllPeriod = convertDecimalToTime(avgHoursAllPeriodSummary);
  const formattedTotalHoursEmployee = convertDecimalToTime(totalHoursEmployeeSummary);
  const formattedAvgHoursEmployee = convertDecimalToTime(avgHoursEmployeeSummary);

  // Determine which hours to display based on selection AND period
  const displayTotalHours = selectedEmployee.value === "All" ? formattedTotalHoursAllPeriod : formattedTotalHoursEmployee;
  const displayAvgHours = selectedEmployee.value === "All" ? formattedAvgHoursAllPeriod : formattedAvgHoursEmployee;

  // Other summary stats (based on selected employee's timesheets within the current period)
  const totalLeaves = useMemo(() => filteredCurrentTimesheets.filter(t => t.leaveType && !["None", "Public Holiday", "Annual"].includes(t.leaveType)).length, [filteredCurrentTimesheets]);
  const lunchBreakEntries = useMemo(() => filteredCurrentTimesheets.filter((t) => t.lunchBreak === "Yes"), [filteredCurrentTimesheets]);
  const totalLunchDuration = useMemo(() => lunchBreakEntries.reduce((acc, t) => {
    if (!t.lunchDuration || !t.lunchDuration.includes(':')) return acc;
    try {
        const [h, m] = t.lunchDuration.split(":").map(Number);
        return acc + (h + m / 60);
    } catch { return acc; }
  }, 0), [lunchBreakEntries]);
  const avgLunchBreak = useMemo(() => lunchBreakEntries.length > 0 ? convertDecimalToTime(totalLunchDuration / lunchBreakEntries.length) : "00:00", [totalLunchDuration, lunchBreakEntries]);
  const projectsWorked = useMemo(() => new Set(filteredCurrentTimesheets.map((t) => t.projectId?._id || t.projectId).filter(Boolean)).size, [filteredCurrentTimesheets]);
  const clientsWorked = useMemo(() => new Set(filteredCurrentTimesheets.map((t) => t.clientId?._id || t.clientId).filter(Boolean)).size, [filteredCurrentTimesheets]);

  // --- Project Card Specific Calculations ---

  // Generate client options specifically for the project card dropdown
  const projectCardClientOptions = useMemo(() => {
    if (showLoading || combinedError) return [{ value: "All", label: "All Clients" }];
    const clients = new Map();
    clients.set("All", { value: "All", label: "All Clients" });
    filteredCurrentTimesheets.forEach(ts => {
        const client = ts.clientId;
        if (client && client._id && !clients.has(client._id)) {
            clients.set(client._id, { value: client._id, label: client.name || `Unknown (${client._id.substring(0, 6)}...)` });
        } else if (typeof client === 'string' && !clients.has(client)) {
             clients.set(client, { value: client, label: `Unknown (${client.substring(0, 6)}...)` });
        }
    });
    return Array.from(clients.values());
  }, [filteredCurrentTimesheets, showLoading, combinedError]);

  // Filter timesheets further based on the client selected within the project card
  const projectCardFilteredTimesheets = useMemo(() => {
    if (selectedProjectClient.value === "All") {
        return filteredCurrentTimesheets;
    }
    return filteredCurrentTimesheets.filter(ts => {
        const clientId = ts.clientId?._id || ts.clientId;
        return clientId === selectedProjectClient.value;
    });
  }, [filteredCurrentTimesheets, selectedProjectClient]);

  // Calculate total hours specifically for the projects shown in the project card
  const projectCardTotalHours = useMemo(() => {
    const total = projectCardFilteredTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0);
    return convertDecimalToTime(total);
  }, [projectCardFilteredTimesheets]);


  // --- Chart Data Generation ---
  const { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel } = useMemo(() => {
    if (showLoading || combinedError) {
        return { labels: [], currentData: [], previousData: [], thisPeriodLabel: "", lastPeriodLabel: "" };
    }
    let labels = [], currentData = [], previousData = [], thisPeriodLabel = "", lastPeriodLabel = "", weeks = 1;
    const currentStart = currentPeriod.start;
    const previousStart = previousPeriod.start;
    if (viewType.value === "Weekly") {
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      currentData = getDayTotals(filteredCurrentTimesheets, currentStart);
      previousData = getDayTotals(filteredPreviousTimesheets, previousStart);
      thisPeriodLabel = "This Week"; lastPeriodLabel = "Last Week";
    } else if (viewType.value === "Fortnightly") {
      labels = ["Week 1", "Week 2"]; weeks = 2;
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, weeks);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, weeks);
      thisPeriodLabel = "This Fortnight"; lastPeriodLabel = "Last Fortnight";
    } else if (viewType.value === "Monthly") {
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"]; weeks = 4;
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, weeks);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, weeks);
      thisPeriodLabel = "This Month"; lastPeriodLabel = "Last Month";
    }
    return { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel };
  }, [viewType.value, filteredCurrentTimesheets, filteredPreviousTimesheets, currentPeriod, previousPeriod, showLoading, combinedError]);

  const clientChartData = useMemo(() => {
    if (showLoading || combinedError) return { labels: [], data: [] };
    const hoursByClient = groupBy("clientId", filteredCurrentTimesheets);
    const data = Object.values(hoursByClient).map(item => item.totalHours);
    const labels = Object.values(hoursByClient).map(item => item.name);
    return { labels, data };
  }, [filteredCurrentTimesheets, showLoading, combinedError]);

  // Update project chart data to use the further filtered timesheets
  const projectChartData = useMemo(() => {
    if (showLoading || combinedError) return { labels: [], data: [] };
    // *** Use projectCardFilteredTimesheets here ***
    const hoursByProject = groupBy("projectId", projectCardFilteredTimesheets);
    const data = Object.values(hoursByProject).map(item => item.totalHours);
    const labels = Object.values(hoursByProject).map(item => item.name);
    return { labels, data };
    // *** Update dependencies ***
  }, [projectCardFilteredTimesheets, showLoading, combinedError]);


  // --- Chart Rendering Effects ---
  useEffect(() => {
    if (showLoading || !labels.length) {
        const ctx = document.getElementById("graphCanvas")?.getContext("2d");
        if (ctx && chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
        return;
    }
    const ctx = document.getElementById("graphCanvas")?.getContext("2d");
    if (!ctx) return;
    if (chartRef.current) chartRef.current.destroy();
    console.log(`[${new Date().toISOString()}] Dashboard: Rendering Bar Chart.`);
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [ { label: thisPeriodLabel, data: currentData, backgroundColor: "rgba(54, 162, 235, 0.6)", borderColor: "rgba(54, 162, 235, 1)", borderWidth: 1 }, { label: lastPeriodLabel, data: previousData, backgroundColor: "rgba(255, 99, 132, 0.6)", borderColor: "rgba(255, 99, 132, 1)", borderWidth: 1 }, ] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours Worked' } } }, plugins: { legend: { position: 'top' } } }
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel, showLoading]);

  useEffect(() => {
    const clientCtx = document.getElementById("clientsGraph")?.getContext("2d");
    if (!clientCtx) return;
    if (clientsChartRef.current) { clientsChartRef.current.destroy(); clientsChartRef.current = null; }
    clientCtx.clearRect(0, 0, clientCtx.canvas.width, clientCtx.canvas.height);
    if (showLoading) return;
    if (!clientChartData.labels.length || clientChartData.data.every(d => d === 0)) {
        clientCtx.font = "16px Arial"; clientCtx.fillStyle = "#888"; clientCtx.textAlign = "center";
        clientCtx.fillText("No client data for this period", clientCtx.canvas.width / 2, clientCtx.canvas.height / 2);
        return;
    }
    console.log(`[${new Date().toISOString()}] Dashboard: Rendering Client Pie Chart.`);
    clientsChartRef.current = new Chart(clientCtx, {
      type: "pie",
      data: { labels: clientChartData.labels, datasets: [{ data: clientChartData.data, backgroundColor: ["#7b61ff", "#a6c0fe", "#d782d9", "#4f86f7", "#ffcb8a", "#a1e8cc", "#f17c67", "#b9e8f0"] }], },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } } },
    });
     return () => { if (clientsChartRef.current) clientsChartRef.current.destroy(); };
  }, [clientChartData, showLoading]);

  // Update project chart effect to depend on projectChartData
  useEffect(() => {
    const projectCtx = document.getElementById("projectsGraph")?.getContext("2d");
    if (!projectCtx) return;
    if (projectsChartRef.current) { projectsChartRef.current.destroy(); projectsChartRef.current = null; }
    projectCtx.clearRect(0, 0, projectCtx.canvas.width, projectCtx.canvas.height);
    if (showLoading) return;
    if (!projectChartData.labels.length || projectChartData.data.every(d => d === 0)) {
        projectCtx.font = "16px Arial"; projectCtx.fillStyle = "#888"; projectCtx.textAlign = "center";
        projectCtx.fillText("No project data for this period/client", projectCtx.canvas.width / 2, projectCtx.canvas.height / 2); // Updated message
        return;
    }
    console.log(`[${new Date().toISOString()}] Dashboard: Rendering Project Pie Chart.`);
    projectsChartRef.current = new Chart(projectCtx, {
      type: "pie",
      data: { labels: projectChartData.labels, datasets: [{ data: projectChartData.data, backgroundColor: ["#9b59b6", "#3498db", "#2ecc71", "#e74c3c", "#f39c12", "#1abc9c", "#34495e", "#95a5a6"] }], },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } } },
    });
     return () => { if (projectsChartRef.current) projectsChartRef.current.destroy(); };
  }, [projectChartData, showLoading]); // Depends on projectChartData


  // --- JSX Rendering ---
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
              isDisabled={showLoading}
              isLoading={isEmployeeLoading}
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
              isDisabled={showLoading}
            />
          </div>
        </div>
      </div>

      {/* Combined Loading Indicator */}
      {showLoading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>{isAuthLoading ? 'Authenticating...' : (isEmployeeLoading ? 'Loading employees...' : 'Loading dashboard data...')}</p>
        </div>
      )}

      {/* Combined Error Message Display */}
      {combinedError && !showLoading && (
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{combinedError}</p>
          {(combinedError.includes('Authentication') || combinedError.includes('token')) ? (
             <p>Please try logging in again.</p>
          ) : (
             <button className="btn btn-secondary" onClick={() => window.location.reload()}>Retry Page Load</button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      {!showLoading && !combinedError && (
        <>
          {/* Summary Cards */}
          <div className="dashboard-summary-grid">
            {selectedEmployee.value === "All" ? (
              <>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faUsers} className="summary-icon users" />
                  <div className="summary-content">
                    <h3>{(Array.isArray(employees) ? employees.length : 0)}</h3>
                    <p>Total Employees</p>
                  </div>
                </div>
                 <div className="summary-card">
                  <FontAwesomeIcon icon={faClock} className="summary-icon hours" />
                  <div className="summary-content">
                    <h3>{displayTotalHours}</h3>
                    <p>Total Hours ({viewType.label.split(' ')[2]})</p>
                  </div>
                </div>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faStopwatch} className="summary-icon avg-hours" />
                  <div className="summary-content">
                    <h3>{displayAvgHours}</h3>
                    <p>Avg. Hours ({viewType.label.split(' ')[2]})</p>
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
                <canvas id="graphCanvas"></canvas>
            </div>
          </div>

          {/* Pie Charts */}
          <div className="dashboard-pie-grid">
            <div className="chart-card">
              <h4>Hours Spent on Clients ({viewType.label.split(' ')[2]})</h4>
              <div className="chart-total">
                Total: <span>{displayTotalHours}</span>
              </div>
              <div className="chart-container pie-chart-container">
                <canvas id="clientsGraph"></canvas>
              </div>
            </div>
            {/* Updated Project Card */}
            <div className="chart-card">
              <h4>Hours Spent on Projects ({viewType.label.split(' ')[2]})</h4>
               <div className="chart-total">
                 Total: <span>{projectCardTotalHours}</span> {/* Use project-card specific total */}
              </div>
              {/* Client Dropdown for Project Card */}
              <div className="select-container project-card-client-select">
                <Select
                  inputId="projectCardClientSelect"
                  options={projectCardClientOptions}
                  value={selectedProjectClient}
                  onChange={setSelectedProjectClient}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  isDisabled={showLoading}
                  placeholder="Filter by Client..."
                  isSearchable={projectCardClientOptions.length > 5}
                />
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
