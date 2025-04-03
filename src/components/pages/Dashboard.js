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
} from "@fortawesome/free-solid-svg-icons";
import Chart from "chart.js/auto";
import "../../styles/Dashboard.scss";

// Utility: Convert decimal hours to HH:MM format.
const convertDecimalToTime = (decimalHours) => {
  if (isNaN(decimalHours)) return "00:00";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
};

// Utility: Group data by key.
const groupBy = (key, data = []) => {
  return data.reduce((acc, entry) => {
    if (!entry[key]) return acc;
    const id = entry[key]?.["_id"] ?? entry[key] ?? "Unknown";
    if (!id) return acc;
    acc[id] = (acc[id] || 0) + (parseFloat(entry.totalHours) || 0);
    return acc;
  }, {});
};

// Utility: Get the start of the week (Monday) for a given date.
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Utility: Get the current period range based on view type.
// Weekly: 7-day period (Mon–Sun)
// Fortnightly: 14-day period starting on Monday (current fortnight)
// Monthly: 28-day period starting on Monday (current month period)
const getPeriodRange = (view) => {
  const today = new Date();
  let start, end;
  if (view === "Weekly") {
    start = getWeekStart(today);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (view === "Fortnightly") {
    start = getWeekStart(today);
    // If today is in the second week, adjust back one week.
    if (today.getDate() - start.getDate() >= 7) {
      start.setDate(start.getDate() - 7);
    }
    end = new Date(start);
    end.setDate(start.getDate() + 13);
  } else if (view === "Monthly") {
    start = getWeekStart(today);
    // For a 28-day period, assume current period is the last 4 full weeks ending today.
    // Adjust start to 3 weeks before current week.
    start.setDate(start.getDate() - 21);
    end = new Date(start);
    end.setDate(start.getDate() + 27);
  }
  return { start, end };
};

// Utility: Get the previous period range by subtracting the period length.
const getPreviousPeriodRange = (currentRange) => {
  const { start, end } = currentRange;
  const periodLength = end.getTime() - start.getTime() + 24 * 60 * 60 * 1000;
  const prevStart = new Date(start.getTime() - periodLength);
  const prevEnd = new Date(end.getTime() - periodLength);
  return { start: prevStart, end: prevEnd };
};

// Utility: For Weekly view, get daily totals from a dataset starting at periodStart.
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

// Utility: For Fortnightly/Monthly view, get weekly totals.
// data: array of timesheets, periodStart: starting date of the period, weeks: number of weeks.
const getWeeklyTotals = (data, periodStart, weeks) => {
  const weeklyTotals = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(periodStart);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekTotal = data
      .filter((t) => {
        const d = new Date(t.date);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
    weeklyTotals.push(weekTotal);
  }
  return weeklyTotals;
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const { employees } = useSelector((state) => state.employees);
  const { user } = useSelector((state) => state.auth);

  // Local states for timesheets.
  const [allTimesheets, setAllTimesheets] = useState([]);
  const [employeeTimesheets, setEmployeeTimesheets] = useState([]);

  // Dropdown states.
  const [selectedEmployee, setSelectedEmployee] = useState({
    value: "All",
    label: "All Employees",
  });
  const [viewType, setViewType] = useState({
    value: "Weekly",
    label: "View by Weekly",
  });

  // Clients (for Projects card).
  const [clients, setClients] = useState([]);
  const [selectedProjectClient, setSelectedProjectClient] = useState({
    value: "All",
    label: "All Clients",
  });
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState([]);

  // Refs for charts.
  const chartRef = useRef(null);
  const clientsChartRef = useRef(null);
  const projectsChartRef = useRef(null);

  // ---------------------------
  // DATA FETCHING
  // ---------------------------
  useEffect(() => {
    fetchAllTimesheets();
    dispatch(getTimesheets());
    dispatch(getEmployees());
  }, [dispatch]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/clients"); // Adjust API URL
        if (response.data) {
          setClients(response.data);
          setClientOptions(
            response.data.map((client) => ({
              value: client._id, // Assuming client has _id field
              label: client.name, // Assuming client has a name field
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedEmployee.value === "All") {
      setEmployeeTimesheets(allTimesheets);
    } else {
      fetchEmployeeTimesheets(selectedEmployee.value);
    }
  }, [selectedEmployee, allTimesheets]);

  const fetchAllTimesheets = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/timesheets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllTimesheets(response.data?.timesheets || []);
    } catch (err) {
      console.error("Failed to fetch all timesheets:", err);
    }
  };

  const fetchEmployeeTimesheets = async (employeeId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/timesheets/employee/${employeeId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data.clients || []);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    }
  };

  // ---------------------------
  // DROPDOWN OPTIONS
  // ---------------------------
  const employeeOptions = [
    { value: "All", label: "All Employees" },
    ...(employees ? employees.map((emp) => ({ value: emp._id, label: emp.name })) : []),
  ];
  const viewOptions = [
    { value: "Weekly", label: "View by Weekly" },
    { value: "Fortnightly", label: "View by Fortnightly" },
    { value: "Monthly", label: "View by Monthly" },
  ];
  const clientOptions = [
    { value: "All", label: "All Clients" },
    ...clients.map((client) => ({ value: client._id, label: client.name })),
  ];

  // ---------------------------
  // DATA PROCESSING
  // ---------------------------
  // For work-hour calculations, we include only timesheets with no leave.
  const validTimesheets = employeeTimesheets.filter(
    (t) => t.leaveType === "None"
  );

  // For pie charts, use all timesheets (filtered by selected employee).
  const usedTimesheets = selectedEmployee.value === "All" ? allTimesheets : employeeTimesheets;
  const projectFilteredTimesheets =
    selectedProjectClient.value === "All"
      ? usedTimesheets
      : usedTimesheets.filter(
          (t) => t.clientId?._id === selectedProjectClient.value
        );

  // SUMMARY STATISTICS
  // For all employees (overall, not period-filtered)
  const totalHoursAllSummary = allTimesheets.reduce(
    (acc, sheet) => acc + (sheet.totalHours || 0),
    0
  );
  const avgHoursAllSummary = allTimesheets.length
    ? (totalHoursAllSummary / allTimesheets.length).toFixed(2)
    : "00:00";
  // For selected employee, using valid timesheets (no leave) in the current period.
  // Get current period range.
  const currentPeriod = useMemo(() => getPeriodRange(viewType.value), [viewType.value]);
  const previousPeriod = useMemo(() => getPreviousPeriodRange(currentPeriod), [currentPeriod]);
  const filteredCurrentTimesheets = useMemo(() => {
    return validTimesheets.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d >= currentPeriod.start && d <= currentPeriod.end;
    });
  }, [validTimesheets, currentPeriod]);
  const filteredPreviousTimesheets = useMemo(() => {
    return validTimesheets.filter((t) => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d >= previousPeriod.start && d <= previousPeriod.end;
    });
  }, [validTimesheets, previousPeriod]);
  const totalHoursEmployeeSummary = filteredCurrentTimesheets.reduce(
    (acc, sheet) => acc + (sheet.totalHours || 0),
    0
  );
  const avgHoursEmployeeSummary = filteredCurrentTimesheets.length
    ? (totalHoursEmployeeSummary / filteredCurrentTimesheets.length).toFixed(2)
    : "00:00";

  const formattedTotalHoursAll = totalHoursAllSummary > 0 ? convertDecimalToTime(totalHoursAllSummary) : "00:00";
  const formattedAvgHoursAll = avgHoursAllSummary !== "00:00" ? convertDecimalToTime(parseFloat(avgHoursAllSummary)) : "00:00";
  const formattedTotalHoursEmployee = totalHoursEmployeeSummary > 0 ? convertDecimalToTime(totalHoursEmployeeSummary) : "00:00";
  const formattedAvgHoursEmployee = avgHoursEmployeeSummary !== "00:00" ? convertDecimalToTime(parseFloat(avgHoursEmployeeSummary)) : "00:00";

  const formattedTotalHours = selectedEmployee.value === "All" ? formattedTotalHoursAll : formattedTotalHoursEmployee;

  const totalHoursProjectFiltered = projectFilteredTimesheets.reduce(
    (acc, sheet) => acc + (sheet.totalHours || 0),
    0
  );
  const formattedTotalHoursProjectFiltered = totalHoursProjectFiltered > 0 ? convertDecimalToTime(totalHoursProjectFiltered) : "00:00";

  const totalLeaves = employeeTimesheets.filter((t) => t.leaveType === "Annual").length;
  const lunchBreakEntries = validTimesheets.filter((t) => t.lunchBreak === "Yes");
  const totalLunchDuration = lunchBreakEntries.reduce((acc, t) => {
    const [h, m] = t.lunchDuration.split(":").map(Number);
    return acc + (h + m / 60);
  }, 0);
  const avgLunchBreak = lunchBreakEntries.length > 0 ? convertDecimalToTime(totalLunchDuration / lunchBreakEntries.length) : "00:00";

  const projectsWorked = new Set(validTimesheets.map((t) => t.projectId?._id || t.projectId).filter(Boolean)).size;
  const clientsWorked = new Set(validTimesheets.map((t) => t.clientId?._id || t.clientId).filter(Boolean)).size;

  // ---------------------------
  // GRAPH DATA CALCULATION
  // ---------------------------
  // For Weekly view, get day-level totals.
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

  // For Fortnightly/Monthly view, aggregate data by full weeks.
  const getWeeklyTotals = (data, periodStart, weeksCount) => {
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

  // Prepare graph data based on view type.
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
      currentData = getDayTotals(filteredCurrentTimesheets, currentWeekStart);
      previousData = getDayTotals(filteredPreviousTimesheets, previousWeekStart);
      thisPeriodLabel = "This Week";
      lastPeriodLabel = "Last Week";
    } else if (viewType.value === "Fortnightly") {
      labels = ["Week 1", "Week 2"];
      const currentFortnight = getPeriodRange("Fortnightly");
      const previousFortnight = getPreviousPeriodRange(currentFortnight);
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentFortnight.start, 2);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousFortnight.start, 2);
      thisPeriodLabel = "This Fortnight";
      lastPeriodLabel = "Last Fortnight";
    } else if (viewType.value === "Monthly") {
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"];
      const currentMonth = getPeriodRange("Monthly");
      const previousMonth = getPreviousPeriodRange(currentMonth);
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentMonth.start, 4);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousMonth.start, 4);
      thisPeriodLabel = "This Month";
      lastPeriodLabel = "Last Month";
    }
    return { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel };
  }, [viewType, filteredCurrentTimesheets, filteredPreviousTimesheets]);

  // ---------------------------
  // CHARTS
  // ---------------------------
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

  // Pie Chart for Clients (using all timesheets filtered by period)
  const filteredForPie = useMemo(() => {
    const data = selectedEmployee.value === "All" ? allTimesheets : employeeTimesheets;
    return data.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      const { start, end } = getPeriodRange(viewType.value);
      return d >= start && d <= end;
    });
  }, [selectedEmployee, allTimesheets, employeeTimesheets, viewType]);

  useEffect(() => {
    if (clientsChartRef.current) {
      clientsChartRef.current.destroy();
      clientsChartRef.current = null;
    }
    const clientCtx = document.getElementById("clientsGraph");
    if (clientCtx) {
      const hoursByClient = groupBy("clientId", filteredForPie);
      clientsChartRef.current = new Chart(clientCtx, {
        type: "pie",
        data: {
          labels: Object.keys(hoursByClient).map((id) => {
            const client = filteredForPie.find(
              (t) => (t.clientId?._id || t.clientId) === id
            )?.clientId;
            return client?.name || id;
          }),
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
    }
  }, [filteredForPie]);

  // Pie Chart for Projects (filtered by selected client)
  useEffect(() => {
    if (projectsChartRef.current) {
      projectsChartRef.current.destroy();
      projectsChartRef.current = null;
    }
    const projectCtx = document.getElementById("projectsGraph");
    if (projectCtx) {
      const filteredProjects = selectedProjectClient.value === "All"
        ? allTimesheets
        : allTimesheets.filter(
            (t) => t.clientId?._id === selectedProjectClient.value
          );
      const filteredProjectsPeriod = filteredProjects.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        const { start, end } = getPeriodRange(viewType.value);
        return d >= start && d <= end;
      });
      const hoursByProject = groupBy("projectId", filteredProjectsPeriod);
      projectsChartRef.current = new Chart(projectCtx, {
        type: "pie",
        data: {
          labels: Object.keys(hoursByProject).map((id) => {
            const project = filteredProjectsPeriod.find(
              (t) => (t.projectId?._id || t.projectId) === id
            )?.projectId ?? {};
            return project?.name || "Unknown Project";
          }),
          datasets: [
            {
              data: Object.values(hoursByProject),
              backgroundColor: ["#9b59b6", "#3498db", "#2ecc71", "#e74c3c"],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } },
        },
      });
    }
  }, [allTimesheets, selectedProjectClient, viewType]);

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <div className="dashboard-container">
      {/* FILTERS SECTION */}
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

      {/* SUMMARY SECTION */}
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

      {/* GRAPH SECTION */}
      <div className="dashboard-card">
        <h4>
          This {viewType.value} vs Last {viewType.value}
        </h4>
        <canvas id="graphCanvas" className="dashboard-graph"></canvas>
      </div>

      {/* PIE CHARTS */}
      <div className="dashboard-grid">
        {/* Hours Spent on Clients Card */}
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

        {/* Hours Spent on Projects Card with its own Client Selector */}
        <div className="dashboard-card">
          <h4>Hours Spent on Projects</h4>
          <div className="dashboard-card-content">
          <Select
  options={clientOptions}
  value={clientOptions.find((option) => option.value === selectedProjectClient)}
  onChange={(selected) => setSelectedProjectClient(selected?.value || null)}
  className="custom-select"
  placeholder="Select Client for Projects"
/>

            <h5>
              Total Hours: <span>{formattedTotalHoursProjectFiltered}</span>
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
