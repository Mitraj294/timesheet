// /home/digilab/timesheet/client/src/components/pages/Dashboard.js
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from "../../redux/slices/employeeSlice";
import { useNavigate } from "react-router-dom";
import { fetchTimesheets, selectAllTimesheets, selectTimesheetStatus, selectTimesheetError, clearTimesheetError } from "../../redux/slices/timesheetSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { setAlert } from "../../redux/slices/alertSlice";
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
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import Alert from "../layout/Alert";
import Chart from "chart.js/auto";

import ChartDataLabels from 'chartjs-plugin-datalabels';
import "../../styles/Dashboard.scss";
import { DateTime } from "luxon";

// Helper to convert decimal hours to HH:MM format
const convertDecimalToTime = (decimalHours) => {
  if (isNaN(decimalHours) || decimalHours == null) return "00:00";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Helper to group data by a key (e.g., clientId, projectId) and sum totalHours
const groupBy = (key, data = []) => {
  return data.reduce((acc, entry) => {
    if (!entry || !entry[key]) return acc;
    const idField = entry[key];
    const id = typeof idField === 'object' && idField !== null ? idField._id : idField;
    const name = typeof idField === 'object' && idField !== null ? idField.name : `Unknown (${String(id).substring(0, 6)}...)`;
    if (!id) return acc;
    if (!acc[id]) {
      acc[id] = { totalHours: 0, name: name };
    }
    acc[id].totalHours += (parseFloat(entry.totalHours) || 0);
    return acc;
  }, {});
};

// Helper to get date range based on selected view (Weekly, Fortnightly, Monthly)
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
    endDt = today.endOf('week');
    startDt = today.minus({ weeks: 3 }).startOf('week');
  } else {
    startDt = today.startOf('week');
    endDt = startDt.endOf('week');
  }
  return { start: startDt.toJSDate(), end: endDt.toJSDate() };
};

// Helper to get the previous period's date range
const getPreviousPeriodRange = (currentRange, view) => {
  const startDt = DateTime.fromJSDate(currentRange.start);
  let prevStartDt, prevEndDt;
  const duration = DateTime.fromJSDate(currentRange.end).diff(startDt, ['days']).days;

  if (view === "Weekly") {
    prevStartDt = startDt.minus({ weeks: 1 });
  } else if (view === "Fortnightly") {
    prevStartDt = startDt.minus({ weeks: 2 });
  } else if (view === "Monthly") {
    prevStartDt = startDt.minus({ weeks: 4 });
  } else {
    prevStartDt = startDt.minus({ weeks: 1 });
  }
  prevEndDt = prevStartDt.plus({ days: Math.round(duration) }).endOf('day');
  return { start: prevStartDt.toJSDate(), end: prevEndDt.toJSDate() };
};

// Helper to calculate total hours for each day of the week
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

// Helper to calculate total hours for each week in a given period
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
            return entryDt >= weekStartDt.startOf('day') && entryDt <= weekEndDt.endOf('day');
        } catch (e) { return false; }
      })
      .reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
    weeklyTotals.push(weekTotal);
  }
  return weeklyTotals;
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employeesError = useSelector(selectEmployeeError);
  const allTimesheets = useSelector(selectAllTimesheets);
  const timesheetStatus = useSelector(selectTimesheetStatus);
  const timesheetError = useSelector(selectTimesheetError);
  const { token, isLoading: isAuthLoading, isAuthenticated, user } = useSelector((state) => state.auth || {});

  // Local component state
  const [employeeTimesheets, setEmployeeTimesheets] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState({ value: "All", label: "All Employees" });
  const [viewType, setViewType] = useState({ value: "Weekly", label: "View by Weekly" });
  const [selectedProjectClient, setSelectedProjectClient] = useState({ value: "All", label: "All Clients" });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const chartRef = useRef(null);
  const clientsChartRef = useRef(null);
  const projectsChartRef = useRef(null);

  // Effects
  // Fetch employees if authenticated and not already fetched
  useEffect(() => {
    if (!isAuthLoading && token && employeeStatus === 'idle') {
      dispatch(fetchEmployees());
    }
  }, [dispatch, token, isAuthLoading, employeeStatus]);

  // Fetch timesheets if authenticated and not already fetched or if fetch failed previously
  useEffect(() => {
    if (isAuthLoading || !token) {
        return;
    }
    if (timesheetStatus === 'idle' || timesheetStatus === 'failed') {
        dispatch(fetchTimesheets());
    }
  }, [token, isAuthLoading, timesheetStatus, dispatch]);

  // Handlers
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
  
    dispatch(setAlert('Logout successful!', 'success'));
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Filters timesheets based on the selected employee
  useEffect(() => {
    if (selectedEmployee.value === "All") {
      setEmployeeTimesheets(allTimesheets);
    } else {
      setEmployeeTimesheets(
        allTimesheets.filter(ts => (ts.employeeId?._id || ts.employeeId) === selectedEmployee.value)
      );
    }
  }, [selectedEmployee, allTimesheets]);

  // Memoized options for employee and view type dropdowns
  const employeeOptions = useMemo(() => [
    { value: "All", label: "All Employees" },
    ...(Array.isArray(employees) ? employees.map((emp) => ({ value: emp._id, label: emp.name })) : []),
  ], [employees]);

  const viewOptions = useMemo(() => [
    { value: "Weekly", label: "View by Weekly" },
    { value: "Fortnightly", label: "View by Fortnightly" },
    { value: "Monthly", label: "View by Monthly" },
  ], []);

  // Memoized date ranges for current and previous periods
  const currentPeriod = useMemo(() => getPeriodRange(viewType.value), [viewType.value]);
  const previousPeriod = useMemo(() => getPreviousPeriodRange(currentPeriod, viewType.value), [currentPeriod, viewType.value]);

  // Memoized filtered timesheets for the current period (all employees)
  const filteredAllCurrentTimesheets = useMemo(() => {
    const start = DateTime.fromJSDate(currentPeriod.start);
    const end = DateTime.fromJSDate(currentPeriod.end);
    return allTimesheets.filter((t) => {
      if (!t?.date || (t.leaveType && t.leaveType !== "None")) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= start.startOf('day') && d <= end.endOf('day');
      } catch { return false; }
    });
  }, [allTimesheets, currentPeriod]);

  // Memoized valid timesheets (excluding leave entries) for the selected employee
  const validTimesheets = useMemo(() => employeeTimesheets.filter((t) => !t.leaveType || t.leaveType === "None"), [employeeTimesheets]);

  // Memoized filtered timesheets for the current period (selected employee)
  const filteredCurrentTimesheets = useMemo(() => {
    const start = DateTime.fromJSDate(currentPeriod.start);
    const end = DateTime.fromJSDate(currentPeriod.end);
    return validTimesheets.filter((t) => {
      if (!t?.date) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= start.startOf('day') && d <= end.endOf('day');
      } catch { return false; }
    });
  }, [validTimesheets, currentPeriod]);

  // Memoized filtered timesheets for the previous period (selected employee)
  const filteredPreviousTimesheets = useMemo(() => {
    const start = DateTime.fromJSDate(previousPeriod.start);
    const end = DateTime.fromJSDate(previousPeriod.end);
    return validTimesheets.filter((t) => {
      if (!t?.date) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= start.startOf('day') && d <= end.endOf('day');
      } catch { return false; }
    });
  }, [validTimesheets, previousPeriod]);

  // Derived loading and error states
  const isEmployeeLoading = employeeStatus === 'loading';
  const isTimesheetLoading = timesheetStatus === 'loading';
  const showLoading = isAuthLoading || isEmployeeLoading || isTimesheetLoading;
  const combinedError = timesheetError || employeesError;

  // Effect to display combined errors as alerts
  useEffect(() => {
    if (combinedError) {
      dispatch(setAlert(combinedError, 'danger'));
    }
  }, [combinedError, dispatch]);

  // Memoized summary calculations for "All Employees" view
  const totalHoursAllPeriodSummary = useMemo(() => filteredAllCurrentTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [filteredAllCurrentTimesheets]);
  const avgHoursAllPeriodSummary = useMemo(() => {
       const totalWorkingTimesheets = filteredAllCurrentTimesheets.length;
       return totalWorkingTimesheets > 0 ? (totalHoursAllPeriodSummary / totalWorkingTimesheets) : 0;
   }, [totalHoursAllPeriodSummary, filteredAllCurrentTimesheets]);

  // Memoized summary calculations for selected employee view
  const totalHoursEmployeeSummary = useMemo(() => filteredCurrentTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [filteredCurrentTimesheets]);
  const avgHoursEmployeeSummary = useMemo(() => {
      const uniqueDaysWorked = new Set(filteredCurrentTimesheets.map(t => t.date)).size;
      return uniqueDaysWorked > 0 ? (totalHoursEmployeeSummary / uniqueDaysWorked) : 0;
  }, [totalHoursEmployeeSummary, filteredCurrentTimesheets]);

  // Formatted time strings for display
  const formattedTotalHoursAllPeriod = convertDecimalToTime(totalHoursAllPeriodSummary);
  const formattedAvgHoursAllPeriod = convertDecimalToTime(avgHoursAllPeriodSummary);
  const formattedTotalHoursEmployee = convertDecimalToTime(totalHoursEmployeeSummary);
  const formattedAvgHoursEmployee = convertDecimalToTime(avgHoursEmployeeSummary);

  // Determine which total/avg hours to display based on employee selection
  const displayTotalHours = selectedEmployee.value === "All" ? formattedTotalHoursAllPeriod : formattedTotalHoursEmployee;
  const displayAvgHours = selectedEmployee.value === "All" ? formattedAvgHoursAllPeriod : formattedAvgHoursEmployee;

  // Memoized calculation for total leaves taken by the selected employee in the current period
  const totalLeaves = useMemo(() => {
      const start = DateTime.fromJSDate(currentPeriod.start);
      const end = DateTime.fromJSDate(currentPeriod.end);
      return employeeTimesheets.filter(t => {
          if (!t?.date || !t.leaveType || t.leaveType === "None") return false;
          try {
              const d = DateTime.fromISO(t.date);
              return d >= start.startOf('day') && d <= end.endOf('day');
          } catch { return false; }
      }).length;
  }, [employeeTimesheets, currentPeriod]);

  // Memoized calculations for lunch break statistics
  const lunchBreakEntries = useMemo(() => filteredCurrentTimesheets.filter((t) => t.lunchBreak === "Yes"), [filteredCurrentTimesheets]);
  const totalLunchDuration = useMemo(() => lunchBreakEntries.reduce((acc, t) => {
    if (!t.lunchDuration || !t.lunchDuration.includes(':')) return acc;
    try {
        const [h, m] = t.lunchDuration.split(":").map(Number);
        return acc + (h + m / 60);
    } catch { return acc; }
  }, 0), [lunchBreakEntries]);
  const avgLunchBreak = useMemo(() => lunchBreakEntries.length > 0 ? convertDecimalToTime(totalLunchDuration / lunchBreakEntries.length) : "00:00", [totalLunchDuration, lunchBreakEntries]);

  // Memoized calculation for number of unique projects/clients worked on
  const projectsWorked = useMemo(() => new Set(filteredCurrentTimesheets.map((t) => t.projectId?._id || t.projectId).filter(Boolean)).size, [filteredCurrentTimesheets]);
  const clientsWorked = useMemo(() => new Set(filteredCurrentTimesheets.map((t) => t.clientId?._id || t.clientId).filter(Boolean)).size, [filteredCurrentTimesheets]);

  // Memoized options for the client filter dropdown in the "Hours by Project" card
  const projectCardClientOptions = useMemo(() => {
    if (!filteredCurrentTimesheets.length) return [{ value: "All", label: "All Clients" }];
    const clients = new Map();
    clients.set("All", { value: "All", label: "All Clients" });
    filteredCurrentTimesheets.forEach(ts => {
        const client = ts.clientId;
        if (client && client._id && !clients.has(client._id)) {
            clients.set(client._id, { value: client._id, label: client.name || `Unknown (${client._id.substring(0, 6)}...)` });
        }
        else if (typeof client === 'string' && client.length === 24 && !clients.has(client)) {
             clients.set(client, { value: client, label: `Unknown (${client.substring(0, 6)}...)` });
        }
    });
    return Array.from(clients.values());
  }, [filteredCurrentTimesheets]);

  // Memoized timesheets filtered by the selected client for the "Hours by Project" card
  const projectCardFilteredTimesheets = useMemo(() => {
    if (selectedProjectClient.value === "All") {
        return filteredCurrentTimesheets;
    }
    return filteredCurrentTimesheets.filter(ts => {
        const clientId = ts.clientId?._id || ts.clientId;
        return clientId === selectedProjectClient.value;
    });
  }, [filteredCurrentTimesheets, selectedProjectClient]);

  // Memoized total hours for the "Hours by Project" card based on filtered timesheets
  const projectCardTotalHours = useMemo(() => {
    const total = projectCardFilteredTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0);
    return convertDecimalToTime(total);
  }, [projectCardFilteredTimesheets]);

  // Memoized data for the main bar chart (hours comparison)
  const { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel, currentBarSpecificLabels, previousBarSpecificLabels } = useMemo(() => {
    if (showLoading || combinedError) {
        return { labels: [], currentData: [], previousData: [], thisPeriodLabel: "", lastPeriodLabel: "", currentBarSpecificLabels: [], previousBarSpecificLabels: [] };
    }
    let labels = [], currentData = [], previousData = [], weeks = 1;

    const currentStart = currentPeriod.start;
    const currentEnd = currentPeriod.end;
    const previousStart = previousPeriod.start;
    const previousEnd = previousPeriod.end;

    const formatRange = (start, end) => `${DateTime.fromJSDate(start).toFormat('MMM d')} - ${DateTime.fromJSDate(end).toFormat('MMM d, yyyy')}`;
    const currentRangeStr = formatRange(currentStart, currentEnd);
    const previousRangeStr = formatRange(previousStart, previousEnd);

      let relativeThisLabel = "";
      let relativeLastLabel = "";

      let currentBarSpecificLabels = [];
      let previousBarSpecificLabels = [];

      const calculateSpecificLabels = (start, numItems, view) => {
        const specificLabels = [];
        const startDt = DateTime.fromJSDate(start);
        if (view === "Weekly") {
          for (let i = 0; i < numItems; i++) {
            const day = startDt.plus({ days: i });
            specificLabels.push(day.toFormat('MMM d'));
          }
        } else {
          for (let w = 0; w < numItems; w++) {
            const weekStart = startDt.plus({ weeks: w });
            const weekEnd = weekStart.endOf('week');
            specificLabels.push(`${weekStart.toFormat('MMM d')} - ${weekEnd.toFormat('MMM d')}`);
          }
        }
        return specificLabels;
      };

    if (viewType.value === "Weekly") {
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      currentData = getDayTotals(filteredCurrentTimesheets, currentStart);
      previousData = getDayTotals(filteredPreviousTimesheets, previousStart);
      relativeThisLabel = "This Week"; relativeLastLabel = "Last Week";
      currentBarSpecificLabels = calculateSpecificLabels(currentStart, 7, "Weekly");
      previousBarSpecificLabels = calculateSpecificLabels(previousStart, 7, "Weekly");

    } else if (viewType.value === "Fortnightly") {
      labels = ["Week 1", "Week 2"]; weeks = 2;
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, weeks);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, weeks);
      relativeThisLabel = "This Fortnight"; relativeLastLabel = "Last Fortnight";
      currentBarSpecificLabels = calculateSpecificLabels(currentStart, weeks, "Fortnightly");
      previousBarSpecificLabels = calculateSpecificLabels(previousStart, weeks, "Fortnightly");

    } else if (viewType.value === "Monthly") {
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"]; weeks = 4;
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, weeks);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, weeks);
      relativeThisLabel = "This Month"; relativeLastLabel = "Last Month";
      currentBarSpecificLabels = calculateSpecificLabels(currentStart, weeks, "Monthly");
      previousBarSpecificLabels = calculateSpecificLabels(previousStart, weeks, "Monthly");
    }

     const thisPeriodLabel = relativeThisLabel;
     const lastPeriodLabel = relativeLastLabel;

    return { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel, currentBarSpecificLabels, previousBarSpecificLabels };
  }, [viewType.value, filteredCurrentTimesheets, filteredPreviousTimesheets, currentPeriod, previousPeriod, showLoading, combinedError]);

  // Memoized data for the "Hours by Client" pie chart
  const clientChartData = useMemo(() => {
    if (showLoading || combinedError || !filteredCurrentTimesheets.length) return { labels: [], data: [] };
    const hoursByClient = groupBy("clientId", filteredCurrentTimesheets);
    const data = Object.values(hoursByClient).map(item => item.totalHours);
    const labels = Object.values(hoursByClient).map(item => item.name);
    return { labels, data };
  }, [filteredCurrentTimesheets, showLoading, combinedError]);

  // Memoized data for the "Hours by Project" pie chart
  const projectChartData = useMemo(() => {
    if (showLoading || combinedError || !projectCardFilteredTimesheets.length) return { labels: [], data: [] };
    const hoursByProject = groupBy("projectId", projectCardFilteredTimesheets);
    const data = Object.values(hoursByProject).map(item => item.totalHours);
    const labels = Object.values(hoursByProject).map(item => item.name);
    return { labels, data };
  }, [projectCardFilteredTimesheets, showLoading, combinedError]);

  // Effect to render/update the main bar chart
  useEffect(() => {
    const ctx = document.getElementById("graphCanvas")?.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
        Chart.unregister(ChartDataLabels);
        chartRef.current.destroy();
        chartRef.current = null;
    }

    if (showLoading || combinedError || !labels.length) {
        return;
    }

    Chart.register(ChartDataLabels);

    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [ { label: thisPeriodLabel, data: currentData, backgroundColor: "rgba(54, 162, 235, 0.6)", borderColor: "rgba(54, 162, 235, 1)", borderWidth: 1 }, { label: lastPeriodLabel, data: previousData, backgroundColor: "rgba(255, 99, 132, 0.6)", borderColor: "rgba(255, 99, 132, 1)", borderWidth: 1 }, ] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Hours Worked' } }
        },
        plugins: {
          legend: { position: 'top' },
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value, context) => {
              const labelsArray = context.datasetIndex === 0 ? currentBarSpecificLabels : previousBarSpecificLabels;
              return value > 0 && labelsArray && labelsArray[context.dataIndex]
                ? labelsArray[context.dataIndex]
                : null;
            },
            color: '#555',
            font: { weight: 'normal', size: 10, },
            offset: -2
          }
        }
      }
    });
    return () => {
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }
        Chart.unregister(ChartDataLabels);
    };
  }, [labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel, currentBarSpecificLabels, previousBarSpecificLabels, showLoading, combinedError]);

  // Effect to render/update the "Hours by Client" pie chart
  useEffect(() => {
    const clientCtx = document.getElementById("clientsGraph")?.getContext("2d");
    if (!clientCtx) return;

    if (clientsChartRef.current) { clientsChartRef.current.destroy(); clientsChartRef.current = null; }
    clientCtx.clearRect(0, 0, clientCtx.canvas.width, clientCtx.canvas.height);
    Chart.unregister(ChartDataLabels);

    if (showLoading || combinedError) return;

    if (!clientChartData.labels.length || clientChartData.data.every(d => d === 0)) {
        clientCtx.font = "16px Arial"; clientCtx.fillStyle = "#888"; clientCtx.textAlign = "center";
        clientCtx.fillText("No client data for this period", clientCtx.canvas.width / 2, clientCtx.canvas.height / 2);
        return;
    }

    Chart.register(ChartDataLabels);
    clientsChartRef.current = new Chart(clientCtx, {
      type: "pie",
      data: { labels: clientChartData.labels, datasets: [{ data: clientChartData.data, backgroundColor: ["#7b61ff", "#a6c0fe", "#d782d9", "#4f86f7", "#ffcb8a", "#a1e8cc", "#f17c67", "#b9e8f0"] }], },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12 } },
          datalabels: { display: false }
        }
      },
    });
     return () => { if (clientsChartRef.current) { clientsChartRef.current.destroy(); clientsChartRef.current = null; } };
  }, [clientChartData, showLoading, combinedError]);

  // Effect to render/update the "Hours by Project" pie chart
  useEffect(() => {
    const projectCtx = document.getElementById("projectsGraph")?.getContext("2d");
    if (!projectCtx) return;

    if (projectsChartRef.current) { projectsChartRef.current.destroy(); projectsChartRef.current = null; }
    projectCtx.clearRect(0, 0, projectCtx.canvas.width, projectCtx.canvas.height);
    Chart.unregister(ChartDataLabels);

    if (showLoading || combinedError) return;

    if (!projectChartData.labels.length || projectChartData.data.every(d => d === 0)) {
        projectCtx.font = "16px Arial"; projectCtx.fillStyle = "#888"; projectCtx.textAlign = "center";
        projectCtx.fillText("No project data for this period/client", projectCtx.canvas.width / 2, projectCtx.canvas.height / 2);
        return;
    }

    Chart.register(ChartDataLabels);
    projectsChartRef.current = new Chart(projectCtx, {
      type: "pie",
      data: { labels: projectChartData.labels, datasets: [{ data: projectChartData.data, backgroundColor: ["#9b59b6", "#3498db", "#2ecc71", "#e74c3c", "#f39c12", "#1abc9c", "#34495e", "#95a5a6"] }], },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12 } },
          datalabels: { display: false }
        }
      },
    });
     return () => { if (projectsChartRef.current) { projectsChartRef.current.destroy(); projectsChartRef.current = null; } };
  }, [projectChartData, showLoading, combinedError]);

  // Render
  return (
    <div className="view-dashboard-page">
      <Alert />
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

    

      {showLoading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>{isAuthLoading ? 'Authenticating...' : (isEmployeeLoading ? 'Loading employees...' : (isTimesheetLoading ? 'Loading timesheets...' : 'Loading...'))}</p>
        </div>
      )}

      {!showLoading && !combinedError && (
        <>
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
                    <p>Avg. Employee Hours ({viewType.label.split(' ')[2]})</p>
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
                    <p>Avg. Daily Hours Worked</p>
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

          <div className="chart-card">
            <h4>This {viewType.label.split(' ')[2]} vs Last {viewType.label.split(' ')[2]} Hours</h4>
            <div className="chart-container bar-chart-container">
                <canvas id="graphCanvas"></canvas>
            </div>
          </div>

          <div className="dashboard-pie-grid">
            <div className="chart-card">
              <h4>Hours Spent on Clients ({viewType.label.split(' ')[2]})</h4>
              <div className="chart-total">
                Total: <span>{displayTotalHours}</span>
              </div>

              <div className="client-chart-spacer"></div>
              <div className="chart-container pie-chart-container">
                <canvas id="clientsGraph"></canvas>
              </div>
            </div>
            <div className="chart-card">
              <h4>Hours Spent on Projects ({viewType.label.split(' ')[2]})</h4>
               <div className="chart-total">
                 Total: <span>{projectCardTotalHours}</span>
              </div>
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
