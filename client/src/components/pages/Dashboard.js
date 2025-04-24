import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { getEmployees } from "../../redux/actions/employeeActions";
// Removed getTimesheets import as timesheets are fetched locally
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Select from "react-select"; // Keep react-select
import {
  faTachometerAlt, // Changed icon for Dashboard
  faUsers,
  faClock,
  faStopwatch,
  faUtensils,
  faCalendarAlt,
  faTasks,
  faBriefcase,
  faSpinner, // Keep spinner
  faExclamationCircle, // Keep error icon
  // Removed unused icons like faPen, faArrow*, faPlus, faChevron*, faTrash
} from "@fortawesome/free-solid-svg-icons";
import Chart from "chart.js/auto";
// Removed date-fns format as Luxon is used
import "../../styles/Dashboard.scss"; // Keep specific SCSS
import { DateTime } from "luxon"; // Keep Luxon

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// --- UTILITY FUNCTIONS (Unchanged) ---

// Convert decimal hours to "HH:MM" format.
const convertDecimalToTime = (decimalHours) => {
  if (isNaN(decimalHours) || decimalHours == null) return "00:00"; // Added null check
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`; // Pad hours too
};

// Group data by a given key and sum the totalHours values.
const groupBy = (key, data = []) => {
  return data.reduce((acc, entry) => {
    if (!entry || !entry[key]) return acc; // Added check for entry existence
    const idField = entry[key];
    const id = typeof idField === 'object' && idField !== null ? idField._id : idField;
    const name = typeof idField === 'object' && idField !== null ? idField.name : id; // Get name for label later

    if (!id) return acc; // Skip if no valid ID

    if (!acc[id]) {
      acc[id] = { totalHours: 0, name: name || id }; // Store name along with hours
    }
    acc[id].totalHours += (parseFloat(entry.totalHours) || 0);
    return acc;
  }, {});
};


// Get the Monday of the week for a given date using Luxon.
const getWeekStart = (date) => {
  return DateTime.fromJSDate(date).startOf('week').toJSDate();
};

// Get the period range based on view type using Luxon.
const getPeriodRange = (view) => {
  const today = DateTime.local();
  let startDt, endDt;
  if (view === "Weekly") {
    startDt = today.startOf('week');
    endDt = startDt.endOf('week');
  } else if (view === "Fortnightly") {
    startDt = today.startOf('week');
    // Determine if we are in the first or second week of the fortnight relative to some anchor if needed
    // Simple approach: show current week and previous week
    startDt = startDt.minus({ weeks: 1 });
    endDt = startDt.plus({ days: 13 }).endOf('day');
  } else if (view === "Monthly") {
    // Show 4 weeks starting from the week containing the 1st of the month
    startDt = today.startOf('month').startOf('week');
    endDt = startDt.plus({ days: 27 }).endOf('day'); // 4 weeks * 7 days - 1 day
  } else {
    // Default to weekly if view is unknown
    startDt = today.startOf('week');
    endDt = startDt.endOf('week');
  }
  return { start: startDt.toJSDate(), end: endDt.toJSDate() };
};

// Get the previous period range using Luxon.
const getPreviousPeriodRange = (currentRange, view) => {
  const startDt = DateTime.fromJSDate(currentRange.start);
  let prevStartDt;
  if (view === "Weekly") {
    prevStartDt = startDt.minus({ weeks: 1 });
  } else if (view === "Fortnightly") {
    prevStartDt = startDt.minus({ weeks: 2 });
  } else if (view === "Monthly") {
    // Assuming monthly view is 4 weeks, go back 4 weeks
    prevStartDt = startDt.minus({ weeks: 4 });
  } else {
    prevStartDt = startDt.minus({ weeks: 1 }); // Default previous week
  }
  const prevEndDt = prevStartDt.plus({ days: DateTime.fromJSDate(currentRange.end).diff(startDt, 'days').days }).endOf('day');
  return { start: prevStartDt.toJSDate(), end: prevEndDt.toJSDate() };
};


// Calculate daily totals from the provided data for a given period start using Luxon.
const getDayTotals = (data, periodStart) => {
  const dailyTotals = [];
  const startDt = DateTime.fromJSDate(periodStart);
  for (let i = 0; i < 7; i++) {
    const currentDay = startDt.plus({ days: i });
    const total = data
      .filter((t) => {
        if (!t || !t.date) return false;
        const entryDt = DateTime.fromISO(t.date);
        return entryDt.hasSame(currentDay, 'day');
      })
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
    dailyTotals.push(total);
  }
  return dailyTotals;
};

// Calculate weekly totals from the provided data for a given number of weeks using Luxon.
const getWeeklyTotals = (data, periodStart, weeks) => {
  const weeklyTotals = [];
  const startDt = DateTime.fromJSDate(periodStart);
  for (let w = 0; w < weeks; w++) {
    const weekStartDt = startDt.plus({ weeks: w });
    const weekEndDt = weekStartDt.endOf('week');
    const weekTotal = data
      .filter((t) => {
        if (!t || !t.date) return false;
        const entryDt = DateTime.fromISO(t.date);
        return entryDt >= weekStartDt && entryDt <= weekEndDt;
      })
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
    weeklyTotals.push(weekTotal);
  }
  return weeklyTotals;
};

// --- DASHBOARD COMPONENT ---

const Dashboard = () => {
  const dispatch = useDispatch();
  const { employees = [], loading: employeesLoading } = useSelector((state) => state.employees || {}); // Destructure loading state
  const { user } = useSelector((state) => state.auth || {});

  const [allTimesheets, setAllTimesheets] = useState([]);
  const [employeeTimesheets, setEmployeeTimesheets] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState({ value: "All", label: "All Employees" });
  const [viewType, setViewType] = useState({ value: "Weekly", label: "View by Weekly" });
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]); // Added projects state
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [error, setError] = useState(null); // Combined error state

  const chartRef = useRef(null);
  const clientsChartRef = useRef(null);
  const projectsChartRef = useRef(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required.");
        setIsLoading(false);
        // Consider redirecting: navigate('/login');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${token}` } };

      try {
        // Fetch employees via Redux if not already loaded
        if (!employees.length && !employeesLoading) {
          dispatch(getEmployees()); // Let Redux handle employee fetching
        }

        // Fetch timesheets, clients, projects directly
        const [tsRes, clientRes, projectRes] = await Promise.all([
          axios.get(`${API_URL}/timesheets`, config),
          axios.get(`${API_URL}/clients`, config),
          axios.get(`${API_URL}/projects`, config) // Fetch projects
        ]);

        setAllTimesheets(tsRes.data?.timesheets || []);
        setClients(clientRes.data || []); // Assuming API returns array directly
        setProjects(projectRes.data || []); // Assuming API returns array directly

      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError(err.response?.data?.message || "Failed to load dashboard data.");
        // Handle potential auth errors
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [dispatch, employees.length, employeesLoading]); // Depend on Redux state

  // Update employee timesheets when selection or allTimesheets change
  useEffect(() => {
    if (selectedEmployee.value === "All") {
      setEmployeeTimesheets(allTimesheets);
    } else {
      setEmployeeTimesheets(
        allTimesheets.filter(ts => (ts.employeeId?._id || ts.employeeId) === selectedEmployee.value)
      );
    }
  }, [selectedEmployee, allTimesheets]);

  // --- DROPDOWN OPTIONS ---
  const employeeOptions = useMemo(() => [
    { value: "All", label: "All Employees" },
    ...(employees ? employees.map((emp) => ({ value: emp._id, label: emp.name })) : []),
  ], [employees]);

  const viewOptions = [
    { value: "Weekly", label: "View by Weekly" },
    { value: "Fortnightly", label: "View by Fortnightly" },
    { value: "Monthly", label: "View by Monthly" },
  ];

  // --- DATA PROCESSING & SUMMARY ---
  const validTimesheets = useMemo(() => employeeTimesheets.filter((t) => !t.leaveType || t.leaveType === "None"), [employeeTimesheets]);

  const currentPeriod = useMemo(() => getPeriodRange(viewType.value), [viewType.value]);
  const previousPeriod = useMemo(() => getPreviousPeriodRange(currentPeriod, viewType.value), [currentPeriod, viewType.value]);

  const filteredCurrentTimesheets = useMemo(() => {
    return validTimesheets.filter((t) => {
      if (!t || !t.date) return false;
      const d = DateTime.fromISO(t.date);
      return d >= DateTime.fromJSDate(currentPeriod.start) && d <= DateTime.fromJSDate(currentPeriod.end);
    });
  }, [validTimesheets, currentPeriod]);

  const filteredPreviousTimesheets = useMemo(() => {
    return validTimesheets.filter((t) => {
      if (!t || !t.date) return false;
      const d = DateTime.fromISO(t.date);
      return d >= DateTime.fromJSDate(previousPeriod.start) && d <= DateTime.fromJSDate(previousPeriod.end);
    });
  }, [validTimesheets, previousPeriod]);

  // --- Summary Calculations ---
  const totalHoursAllSummary = useMemo(() => allTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [allTimesheets]);
  const validTimesheetsForAvgAll = useMemo(() => allTimesheets.filter((ts) => !ts.leaveType || ts.leaveType === "None"), [allTimesheets]);
  const avgHoursAllSummary = validTimesheetsForAvgAll.length ? (totalHoursAllSummary / validTimesheetsForAvgAll.length) : 0;

  const totalHoursEmployeeSummary = useMemo(() => filteredCurrentTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [filteredCurrentTimesheets]);
  const avgHoursEmployeeSummary = filteredCurrentTimesheets.length ? (totalHoursEmployeeSummary / filteredCurrentTimesheets.length) : 0;

  const formattedTotalHoursAll = convertDecimalToTime(totalHoursAllSummary);
  const formattedAvgHoursAll = convertDecimalToTime(avgHoursAllSummary);
  const formattedTotalHoursEmployee = convertDecimalToTime(totalHoursEmployeeSummary);
  const formattedAvgHoursEmployee = convertDecimalToTime(avgHoursEmployeeSummary);

  // Determine which total/avg to display
  const displayTotalHours = selectedEmployee.value === "All" ? formattedTotalHoursAll : formattedTotalHoursEmployee;
  const displayAvgHours = selectedEmployee.value === "All" ? formattedAvgHoursAll : formattedAvgHoursEmployee;

  // Other summary stats
  const totalLeaves = useMemo(() => employeeTimesheets.filter(t => t.leaveType && !["None", "Public Holiday", "Annual"].includes(t.leaveType)).length, [employeeTimesheets]);
  const lunchBreakEntries = useMemo(() => validTimesheets.filter((t) => t.lunchBreak === "Yes"), [validTimesheets]);
  const totalLunchDuration = useMemo(() => lunchBreakEntries.reduce((acc, t) => {
    if (!t.lunchDuration || !t.lunchDuration.includes(':')) return acc;
    const [h, m] = t.lunchDuration.split(":").map(Number);
    return acc + (h + m / 60);
  }, 0), [lunchBreakEntries]);
  const avgLunchBreak = lunchBreakEntries.length > 0 ? convertDecimalToTime(totalLunchDuration / lunchBreakEntries.length) : "00:00";
  const projectsWorked = useMemo(() => new Set(validTimesheets.map((t) => t.projectId?._id || t.projectId).filter(Boolean)).size, [validTimesheets]);
  const clientsWorked = useMemo(() => new Set(validTimesheets.map((t) => t.clientId?._id || t.clientId).filter(Boolean)).size, [validTimesheets]);

  // --- GRAPH DATA CALCULATION ---
  const { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel } = useMemo(() => {
    let labels = [];
    let currentData = [];
    let previousData = [];
    let thisPeriodLabel = "";
    let lastPeriodLabel = "";
    const currentStart = currentPeriod.start;
    const previousStart = previousPeriod.start;

    if (viewType.value === "Weekly") {
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      currentData = getDayTotals(filteredCurrentTimesheets, currentStart);
      previousData = getDayTotals(filteredPreviousTimesheets, previousStart);
      thisPeriodLabel = "This Week";
      lastPeriodLabel = "Last Week";
    } else if (viewType.value === "Fortnightly") {
      labels = ["Week 1", "Week 2"];
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, 2);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, 2);
      thisPeriodLabel = "This Fortnight";
      lastPeriodLabel = "Last Fortnight";
    } else if (viewType.value === "Monthly") {
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, 4);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, 4);
      thisPeriodLabel = "This Month";
      lastPeriodLabel = "Last Month";
    }
    return { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel };
  }, [viewType.value, filteredCurrentTimesheets, filteredPreviousTimesheets, currentPeriod, previousPeriod]); // Added dependencies

  // --- CHARTS RENDERING ---
  useEffect(() => {
    const ctx = document.getElementById("graphCanvas")?.getContext("2d"); // Use getContext
    if (!ctx) return;
    if (chartRef.current) chartRef.current.destroy();

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
        maintainAspectRatio: false, // Allow chart to resize height
        scales: { y: { beginAtZero: true, title: { display: true, text: 'Hours Worked' } } },
        plugins: { legend: { position: 'top' } }
      }
    });
    // Cleanup function
    return () => {
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }
    };
  }, [labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel]);

  // Clients Pie Chart Data & Rendering
  const clientChartData = useMemo(() => {
    const hoursByClient = groupBy("clientId", filteredCurrentTimesheets); // Use filteredCurrentTimesheets
    const data = Object.values(hoursByClient).map(item => item.totalHours);
    const labels = Object.values(hoursByClient).map(item => item.name || 'Unknown Client');
    return { labels, data };
  }, [filteredCurrentTimesheets]); // Depend only on filtered data

  useEffect(() => {
    const clientCtx = document.getElementById("clientsGraph")?.getContext("2d");
    if (!clientCtx || clientChartData.data.length === 0) {
         if (clientsChartRef.current) clientsChartRef.current.destroy(); // Destroy if no data
         return;
    }
    if (clientsChartRef.current) clientsChartRef.current.destroy();

    clientsChartRef.current = new Chart(clientCtx, {
      type: "pie",
      data: {
        labels: clientChartData.labels,
        datasets: [{ data: clientChartData.data, backgroundColor: ["#7b61ff", "#a6c0fe", "#d782d9", "#4f86f7", "#ffcb8a", "#a1e8cc"] }], // Added more colors
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } } },
    });
     return () => {
        if (clientsChartRef.current) {
            clientsChartRef.current.destroy();
            clientsChartRef.current = null;
        }
    };
  }, [clientChartData]); // Depend on processed chart data

  // Projects Pie Chart Data & Rendering
  const projectChartData = useMemo(() => {
    const hoursByProject = groupBy("projectId", filteredCurrentTimesheets); // Use filteredCurrentTimesheets
    const data = Object.values(hoursByProject).map(item => item.totalHours);
    const labels = Object.values(hoursByProject).map(item => item.name || 'Unknown Project');
    return { labels, data };
  }, [filteredCurrentTimesheets]); // Depend only on filtered data

  useEffect(() => {
    const projectCtx = document.getElementById("projectsGraph")?.getContext("2d");
    if (!projectCtx || projectChartData.data.length === 0) {
        if (projectsChartRef.current) projectsChartRef.current.destroy(); // Destroy if no data
        return;
    }
    if (projectsChartRef.current) projectsChartRef.current.destroy();

    projectsChartRef.current = new Chart(projectCtx, {
      type: "pie",
      data: {
        labels: projectChartData.labels,
        datasets: [{ data: projectChartData.data, backgroundColor: ["#9b59b6", "#3498db", "#2ecc71", "#e74c3c", "#f39c12", "#1abc9c", "#34495e"] }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } } },
    });
     return () => {
        if (projectsChartRef.current) {
            projectsChartRef.current.destroy();
            projectsChartRef.current = null;
        }
    };
  }, [projectChartData]); // Depend on processed chart data

  // --- RENDER ---
  return (
    <div className="view-dashboard-page"> {/* Use standard page class */}
      {/* Filters Section - Using standard container */}
      <div className="dashboard-filters-container"> {/* Changed class */}
        <div className="greeting">
            <h4>Hello, {user?.name || "User"}!</h4>
            <p>Here is your company status report.</p>
        </div>
        <div className="filters">
          <div className="select-container">
            <label htmlFor="employeeSelect">Select Employee:</label>
            <Select
              inputId="employeeSelect" // Added id for label association
              options={employeeOptions}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              className="react-select-container" // Class for react-select wrapper
              classNamePrefix="react-select" // Prefix for internal elements
              isDisabled={isLoading} // Disable while loading
            />
          </div>
          <div className="select-container">
            <label htmlFor="viewTypeSelect">Period of Time:</label>
            <Select
              inputId="viewTypeSelect" // Added id for label association
              options={viewOptions}
              value={viewType}
              onChange={setViewType}
              className="react-select-container"
              classNamePrefix="react-select"
              isDisabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading dashboard data...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
          {/* Optional: Add a retry button */}
        </div>
      )}

      {/* Summary Section - Keep original grid structure but use standard card class */}
      {!isLoading && !error && (
        <>
          <div className="dashboard-summary-grid"> {/* Changed class */}
            {selectedEmployee.value === "All" ? (
              <>
                <div className="summary-card"> {/* Use standard card class */}
                  <FontAwesomeIcon icon={faUsers} className="summary-icon users" />
                  <div className="summary-content">
                    <h3>{employees.length || 0}</h3>
                    <p>Employees</p>
                  </div>
                </div>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faClock} className="summary-icon hours" />
                  <div className="summary-content">
                    <h3>{displayTotalHours}</h3>
                    <p>Total Hours (All)</p>
                  </div>
                </div>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faStopwatch} className="summary-icon avg-hours" />
                  <div className="summary-content">
                    <h3>{displayAvgHours}</h3>
                    <p>Avg. Hours (All)</p>
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

          {/* Bar Chart Section - Use standard card container */}
          <div className="chart-card"> {/* Use standard card class */}
            <h4>This {viewType.label.split(' ')[2]} vs Last {viewType.label.split(' ')[2]} Hours</h4>
            <div className="chart-container bar-chart-container"> {/* Wrapper for canvas */}
                <canvas id="graphCanvas"></canvas>
            </div>
          </div>

          {/* Pie Charts Section - Use standard grid and card containers */}
          <div className="dashboard-pie-grid"> {/* Changed class */}
            <div className="chart-card"> {/* Use standard card class */}
              <h4>Hours Spent on Clients</h4>
              <div className="chart-total">
                Total: <span>{displayTotalHours}</span>
              </div>
              <div className="chart-container pie-chart-container"> {/* Wrapper for canvas */}
                <canvas id="clientsGraph"></canvas>
              </div>
            </div>
            <div className="chart-card"> {/* Use standard card class */}
              <h4>Hours Spent on Projects</h4>
               <div className="chart-total">
                 Total: <span>{displayTotalHours}</span>
              </div>
              <div className="chart-container pie-chart-container"> {/* Wrapper for canvas */}
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
