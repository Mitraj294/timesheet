import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { getEmployees } from "../../redux/actions/employeeActions";
import { getTimesheets } from "../../redux/actions/timesheetActions";
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
  faPen,
  faArrowLeft,
  faArrowRight,
  faPlus,
  faChevronDown,
  faChevronUp,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import Chart from "chart.js/auto";
import { format } from "date-fns";
import "../../styles/Dashboard.scss";


const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

//UTILITY FUNCTIONS  

// Convert decimal hours to "HH:MM" format.
const convertDecimalToTime = (decimalHours) => {
  if (isNaN(decimalHours)) return "00:00";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
};

// Group data by a given key and sum the totalHours values.
const groupBy = (key, data = []) => {
  return data.reduce((acc, entry) => {
    if (!entry[key]) return acc;
    const id = entry[key]?.["_id"] ?? entry[key] ?? "Unknown";
    if (!id) return acc;
    acc[id] = (acc[id] || 0) + (parseFloat(entry.totalHours) || 0);
    return acc;
  }, {});
};

// Get the Monday of the week for a given date.
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get the period range based on view type //Weekly, Fortnightly, Monthly
const getPeriodRange = (view) => {
  const today = new Date();
  let start, end;
  if (view === "Weekly") {
    start = getWeekStart(today);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (view === "Fortnightly") {
    start = getWeekStart(today);
    if (today.getDate() - start.getDate() >= 7) {
      start.setDate(start.getDate() - 7);
    }
    end = new Date(start);
    end.setDate(start.getDate() + 13);
  } else if (view === "Monthly") {
    start = getWeekStart(today);
    start.setDate(start.getDate() - 21);
    end = new Date(start);
    end.setDate(start.getDate() + 27);
  }
  return { start, end };
};

// Get the previous period range by subtracting the length of the current period.
const getPreviousPeriodRange = (currentRange) => {
  const { start, end } = currentRange;
  const periodLength = end.getTime() - start.getTime() + 24 * 60 * 60 * 1000;
  const prevStart = new Date(start.getTime() - periodLength);
  const prevEnd = new Date(end.getTime() - periodLength);
  return { start: prevStart, end: prevEnd };
};

// Calculate daily totals from the provided data for a given period start.
const getDayTotals = (data, periodStart) => {
  const dailyTotals = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(periodStart);
    day.setDate(day.getDate() + i);
    const total = data
      .filter((t) => {
        const d = new Date(t.date);
        return d.toDateString() === day.toDateString();
      })
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
    dailyTotals.push(total);
  }
  return dailyTotals;
};

// Calculate weekly totals from the provided data for a given number of weeks.
const getWeeklyTotals = (data, periodStart, weeks) => {
  const weeklyTotals = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(periodStart);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekTotal = data
      .filter((t) => {
        const d = new Date(t.date);
        return d >= weekStart && d <= new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      })
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
    weeklyTotals.push(weekTotal);
  }
  return weeklyTotals;
};

 //DASHBOARD COMPONENT 

const Dashboard = () => {
  const dispatch = useDispatch();
  const { employees } = useSelector((state) => state.employees);
  const { user } = useSelector((state) => state.auth);

  // States for timesheets and filters.
  const [allTimesheets, setAllTimesheets] = useState([]);
  const [employeeTimesheets, setEmployeeTimesheets] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState({ value: "All", label: "All Employees" });
  const [viewType, setViewType] = useState({ value: "Weekly", label: "View by Weekly" });
  const [clients, setClients] = useState([]);

  const [projects, setProjects] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  // Refs for Chart.js instances.
  const chartRef = useRef(null);
  const clientsChartRef = useRef(null);
  const projectsChartRef = useRef(null);

  // DATA FETCHING  
  useEffect(() => {
    fetchAllTimesheets();
    dispatch(getTimesheets());
    dispatch(getEmployees());
  }, [dispatch]);

  // Fetch clients only if the user is an employer.
  useEffect(() => {
    if (user && user.token && user.role === "employer") {
      const fetchClients = async () => {
        try {
          const response = await axios.get(`${API_URL}/clients`, {
            headers: { Authorization: `Bearer ${user.token}` },
          });
          setClients(response.data.clients || []);
        } catch (error) {
          console.error("Error fetching clients:", error);
        }
      };
      
      fetchClients();
    }
  }, [user]);

  // Update employee timesheets when the selected employee changes.
  useEffect(() => {
    if (selectedEmployee.value === "All") {
      setEmployeeTimesheets(allTimesheets);
    } else {
      fetchEmployeeTimesheets(selectedEmployee.value);
    }
  }, [selectedEmployee, allTimesheets]);

  // Fetch all timesheets.
  const fetchAllTimesheets = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/timesheets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllTimesheets(response.data?.timesheets || []);
    } catch (err) {
      console.error("Failed to fetch all timesheets:", err);
    }
  };
  

  // Fetch timesheets for a specific employee.
  const fetchEmployeeTimesheets = async (employeeId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/timesheets/employee/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployeeTimesheets(
        response.data.timesheets && response.data.timesheets.length > 0
          ? response.data.timesheets
          : []
      );
    } catch (err) {
      console.error(`Failed to fetch timesheets for Employee ${employeeId}:`, err);
      setEmployeeTimesheets([]);
    }
  };
  

  // Fetch clients.
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data.clients || []);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };
  

  // DROPDOWN OPTIONS  
  const employeeOptions = [
    { value: "All", label: "All Employees" },
    ...(employees ? employees.map((emp) => ({ value: emp._id, label: emp.name })) : []),
  ];
  const viewOptions = [
    { value: "Weekly", label: "View by Weekly" },
    { value: "Fortnightly", label: "View by Fortnightly" },
    { value: "Monthly", label: "View by Monthly" },
  ];
  const clientOptions = useMemo(() => {
    return [
      { value: "All", label: "All Clients" },
      ...clients.map((client) => ({ value: client._id, label: client.name })),
    ];
  }, [clients]);

  // DATA PROCESSING & SUMMARY  
  // Filter timesheets with no leave for work-hour calculations.
  const validTimesheets = employeeTimesheets.filter((t) => t.leaveType === "None");

  // Total hours for all employees.
  const totalHoursAllSummary = allTimesheets.reduce(
    (acc, sheet) => acc + (sheet.totalHours || 0),
    0
  );
  // For average, only include timesheets where leaveType is null/undefined or "None".
  const validTimesheetsForAvg = allTimesheets.filter((ts) => !ts.leaveType || ts.leaveType === "None");
  const avgHoursAllSummary = validTimesheetsForAvg.length
    ? (totalHoursAllSummary / validTimesheetsForAvg.length).toFixed(2)
    : "00:00";

  // Get the current and previous period ranges.
  const currentPeriod = useMemo(() => getPeriodRange(viewType.value), [viewType.value]);
  const previousPeriod = useMemo(() => getPreviousPeriodRange(currentPeriod), [currentPeriod]);

  // Filter timesheets in the current period.
  const filteredCurrentTimesheets = useMemo(() => {
    return validTimesheets.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d >= currentPeriod.start && d <= currentPeriod.end;
    });
  }, [validTimesheets, currentPeriod]);

  // Filter timesheets in the previous period.
  const filteredPreviousTimesheets = useMemo(() => {
    return validTimesheets.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d >= previousPeriod.start && d <= previousPeriod.end;
    });
  }, [validTimesheets, previousPeriod]);

  // Calculate selected employee summary.
  const totalHoursEmployeeSummary = filteredCurrentTimesheets.reduce(
    (acc, sheet) => acc + (sheet.totalHours || 0),
    0
  );
  const avgHoursEmployeeSummary = filteredCurrentTimesheets.length
    ? (totalHoursEmployeeSummary / filteredCurrentTimesheets.length).toFixed(2)
    : "00:00";

  // Format summary values.
  const formattedTotalHoursAll = totalHoursAllSummary > 0 ? convertDecimalToTime(totalHoursAllSummary) : "00:00";
  const formattedAvgHoursAll = avgHoursAllSummary !== "00:00" ? convertDecimalToTime(parseFloat(avgHoursAllSummary)) : "00:00";
  const formattedTotalHoursEmployee = totalHoursEmployeeSummary > 0 ? convertDecimalToTime(totalHoursEmployeeSummary) : "00:00";
  const formattedAvgHoursEmployee = avgHoursEmployeeSummary !== "00:00" ? convertDecimalToTime(parseFloat(avgHoursEmployeeSummary)) : "00:00";

  const formattedTotalHours = selectedEmployee.value === "All" ? formattedTotalHoursAll : formattedTotalHoursEmployee;

  // Projects Pie Chart Calculation (for all clients, filtered by selected employee and period).
  const totalHoursProjectFiltered = allTimesheets
    .filter((t) => {
      // If "All" employees selected, include all; else, filter by selected employee.
      if (selectedEmployee.value !== "All" && (t.employeeId?._id || t.employeeId) !== selectedEmployee.value)
        return false;
      return true;
    })
    .filter((t) => {
      // Filter by period.
      if (!t.date) return false;
      const d = new Date(t.date);
      const { start, end } = getPeriodRange(viewType.value);
      return d >= start && d <= end;
    })
    .reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0);
  

  // Total leaves: Count timesheets with leaveType not equal to "None", "Public Holiday", or "Annual".
  const totalLeaves = employeeTimesheets.filter(
    (t) => t.leaveType && !["None", "Public Holiday", "Annual"].includes(t.leaveType)
  ).length;

  // Lunch break calculations.
  const lunchBreakEntries = validTimesheets.filter((t) => t.lunchBreak === "Yes");
  const totalLunchDuration = lunchBreakEntries.reduce((acc, t) => {
    const [h, m] = t.lunchDuration.split(":").map(Number);
    return acc + (h + m / 60);
  }, 0);
  const avgLunchBreak = lunchBreakEntries.length > 0 ? convertDecimalToTime(totalLunchDuration / lunchBreakEntries.length) : "00:00";

  // Count projects and clients worked.
  const projectsWorked = new Set(validTimesheets.map((t) => t.projectId?._id || t.projectId).filter(Boolean)).size;
  const clientsWorked = new Set(validTimesheets.map((t) => t.clientId?._id || t.clientId).filter(Boolean)).size;

  // GRAPH DATA CALCULATION  
  // Calculate daily totals.
  const getDayTotalsCalc = (data, periodStart) => {
    const dailyTotals = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(periodStart);
      day.setDate(day.getDate() + i);
      const total = data
        .filter((t) => {
          const d = new Date(t.date);
          return d.toDateString() === day.toDateString();
        })
        .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
      dailyTotals.push(total);
    }
    return dailyTotals;
  };

  // Calculate weekly totals.
  const getWeeklyTotalsCalc = (data, periodStart, weeksCount) => {
    const weeklyTotals = [];
    for (let w = 0; w < weeksCount; w++) {
      const weekStart = new Date(periodStart);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const weekTotal = data
        .filter((t) => {
          const d = new Date(t.date);
          return d >= weekStart && d < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        })
        .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
      weeklyTotals.push(weekTotal);
    }
    return weeklyTotals;
  };

  // Prepare bar chart data based on view type.
  const { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel } = useMemo(() => {
    let labels = [];
    let currentData = [];
    let previousData = [];
    let thisPeriodLabel = "";
    let lastPeriodLabel = "";
    if (viewType.value === "Weekly") {
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const currentWeekStart = getWeekStart(new Date());
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(currentWeekStart.getDate() - 7);
      currentData = getDayTotalsCalc(filteredCurrentTimesheets, currentWeekStart);
      previousData = getDayTotalsCalc(filteredPreviousTimesheets, previousWeekStart);
      thisPeriodLabel = "This Week";
      lastPeriodLabel = "Last Week";
    } else if (viewType.value === "Fortnightly") {
      labels = ["Week 1", "Week 2"];
      const currentFortnight = getPeriodRange("Fortnightly");
      const previousFortnight = getPreviousPeriodRange(currentFortnight);
      currentData = getWeeklyTotalsCalc(filteredCurrentTimesheets, currentFortnight.start, 2);
      previousData = getWeeklyTotalsCalc(filteredPreviousTimesheets, previousFortnight.start, 2);
      thisPeriodLabel = "This Fortnight";
      lastPeriodLabel = "Last Fortnight";
    } else if (viewType.value === "Monthly") {
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const currentMonth = getPeriodRange("Monthly");
      const previousMonth = getPreviousPeriodRange(currentMonth);
      currentData = getWeeklyTotalsCalc(filteredCurrentTimesheets, currentMonth.start, 4);
      previousData = getWeeklyTotalsCalc(filteredPreviousTimesheets, previousMonth.start, 4);
      thisPeriodLabel = "This Month";
      lastPeriodLabel = "Last Month";
    }
    return { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel };
  }, [viewType, filteredCurrentTimesheets, filteredPreviousTimesheets]);

  // CHARTS RENDERING  
  // Render Bar Chart.
  useEffect(() => {
    const ctx = document.getElementById("graphCanvas");
    if (!ctx) return;
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: thisPeriodLabel,
            data: currentData,
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
          },
          {
            label: lastPeriodLabel,
            data: previousData,
            backgroundColor: "rgba(255, 99, 132, 0.5)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
          },
        ],
      },
    });
  }, [labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel]);

  // Prepare data for Clients Pie Chart.
  const filteredForPie = useMemo(() => {
    const data = selectedEmployee.value === "All" ? allTimesheets : employeeTimesheets;
    return data.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      const { start, end } = getPeriodRange(viewType.value);
      return d >= start && d <= end;
    });
  }, [selectedEmployee, allTimesheets, employeeTimesheets, viewType]);

  // Render Clients Pie Chart.
  useEffect(() => {
    if (clientsChartRef.current) {
      clientsChartRef.current.destroy();
      clientsChartRef.current = null;
    }
    const clientCtx = document.getElementById("clientsGraph");
    if (!clientCtx) return;
    const hoursByClient = groupBy("clientId", filteredForPie);
    const clientLabels = Object.keys(hoursByClient).map((id) => {
      // Find client name from filtered data, or fallback to the ID.
      const clientObj = filteredForPie.find((item) => {
        const client = item.clientId;
        const clientId = typeof client === "string" ? client : client?._id;
        return clientId === id;
      })?.clientId;
      return clientObj?.name || id;
    });
    clientsChartRef.current = new Chart(clientCtx, {
      type: "pie",
      data: {
        labels: clientLabels,
        datasets: [
          {
            data: Object.values(hoursByClient),
            backgroundColor: ["#7b61ff", "#a6c0fe", "#d782d9", "#4f86f7"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
  }, [filteredForPie, clients]);

  // Render Projects Pie Chart.
  useEffect(() => {
    if (projectsChartRef.current) {
      projectsChartRef.current.destroy();
      projectsChartRef.current = null;
    }
    const projectCtx = document.getElementById("projectsGraph");
    if (!projectCtx) return;

    // Filter timesheets by selected employee and period.
    let filteredProjects = selectedEmployee.value === "All"
      ? allTimesheets
      : allTimesheets.filter((t) => (t.employeeId?._id || t.employeeId) === selectedEmployee.value);

    const { start, end } = getPeriodRange(viewType.value);
    filteredProjects = filteredProjects.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    // Group by projectId and sum total hours.
    const hoursByProject = {};
    filteredProjects.forEach((item) => {
      const id = item.projectId?._id || item.projectId;
      hoursByProject[id] = (hoursByProject[id] || 0) + (parseFloat(item.totalHours) || 0);
    });

    // Map project IDs to project names.
    const projectLabels = Object.keys(hoursByProject).map((id) => {
      // Try to find the project info in the timesheets first.
      const projectItem = filteredProjects.find((item) => (item.projectId?._id || item.projectId) === id);
      // If not found, fallback to the projects state.
      const projectObj = projectItem?.projectId || projects.find((p) => p._id === id);
      return projectObj?.name || id;
    });
    const projectData = Object.values(hoursByProject);

    projectsChartRef.current = new Chart(projectCtx, {
      type: "pie",
      data: {
        labels: projectLabels,
        datasets: [
          {
            data: projectData,
            backgroundColor: [
              "#9b59b6",
              "#3498db",
              "#2ecc71",
              "#e74c3c",
              "#f39c12",
              "#1abc9c",
              "#34495e",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
      },
    });
    
  }, [allTimesheets, selectedEmployee, viewType, projects]);

  // RENDERING THE DASHBOARD  
  return (
    <div className="dashboard-container">
      {/* Filters Section */}
      <div className="dashboard-filters">
        <h4>Hello, {user?.name || "User"}!</h4>
        <p>Here is your company status report.</p>
        <div className="filters">
          <div className="select-container">
            <label>Select Employee:</label>
            <Select
              options={employeeOptions}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              className="custom-select"
            />
          </div>
          <div className="select-container">
            <label>Period of Time:</label>
            <Select
              options={viewOptions}
              value={viewType}
              onChange={setViewType}
              className="custom-select"
            />
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="dashboard-grid">
        {selectedEmployee.value === "All" ? (
          <>
            <div className="dashboard-card">
              <h3>{employees.length || 0}</h3>
              <p>Number of Employees</p>
              <FontAwesomeIcon icon={faUsers} className="dashboard-icon" />
            </div>
            <div className="dashboard-card">
              <h3>{formattedTotalHoursAll}</h3>
              <p>Total Employee Hours</p>
              <FontAwesomeIcon icon={faClock} className="dashboard-icon" />
            </div>
            <div className="dashboard-card">
              <h3>{formattedAvgHoursAll}</h3>
              <p>Avg. Employee Hours</p>
              <FontAwesomeIcon icon={faStopwatch} className="dashboard-icon" />
            </div>
          </>
        ) : (
          <>
            <div className="dashboard-card">
              <h3>{formattedAvgHoursEmployee}</h3>
              <p>Avg. Hours Worked</p>
              <FontAwesomeIcon icon={faStopwatch} className="dashboard-icon" />
            </div>
            <div className="dashboard-card">
              <h3>{formattedTotalHoursEmployee}</h3>
              <p>Total Hours Worked</p>
              <FontAwesomeIcon icon={faClock} className="dashboard-icon" />
            </div>
            <div className="dashboard-card">
              <h3>{avgLunchBreak} hrs</h3>
              <p>Avg. Lunch Break</p>
              <FontAwesomeIcon icon={faUtensils} className="dashboard-icon" />
            </div>
            <div className="dashboard-card">
              <h3>{totalLeaves}</h3>
              <p>Total Leaves Taken</p>
              <FontAwesomeIcon icon={faCalendarAlt} className="dashboard-icon" />
            </div>
            <div className="dashboard-card">
              <h3>{clientsWorked || 0}</h3>
              <p>Clients Worked</p>
              <FontAwesomeIcon icon={faBriefcase} className="dashboard-icon blue" />
            </div>
            <div className="dashboard-card">
              <h3>{projectsWorked || 0}</h3>
              <p>Projects Worked</p>
              <FontAwesomeIcon icon={faTasks} className="dashboard-icon red" />
            </div>
          </>
        )}
      </div>

      {/* Bar Chart Section */}
      <div className="dashboard-card">
        <h4>
          This {viewType.value} vs Last {viewType.value}
        </h4>
        <canvas id="graphCanvas" className="dashboard-graph"></canvas>
      </div>

      {/* Pie Charts Section */}
      <div className="dashboard-grid">
        {/* Clients Pie Chart */}
        <div className="dashboard-card">
          <h4>Hours Spent on Clients</h4>
          <div className="dashboard-card-content">
            <h5>
              Total Hours: <span>{formattedTotalHours}</span>
            </h5>
          </div>
          <div className="dashboard-card-graph">
            <canvas id="clientsGraph" className="dashboard-pie-graph"></canvas>
          </div>
        </div>
        {/* Projects Pie Chart  */}
        <div className="dashboard-card">
          <h4>Hours Spent on Projects</h4>
          <div className="dashboard-card-content">
            <h5>
              Total Hours: <span>{formattedTotalHours}</span>
            </h5>
          </div>
          <div className="dashboard-card-graph">
            <canvas id="projectsGraph" className="dashboard-pie-graph"></canvas>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
