// /home/digilab/timesheet/client/src/components/pages/Dashboard.js
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from "../../redux/slices/employeeSlice";
import { useNavigate, useLocation } from "react-router-dom";
import { selectEmployerSettings, fetchEmployerSettings, selectSettingsStatus } from "../../redux/slices/settingsSlice";
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
  faBuildingUser, // New icon for Client Hours
  faDiagramProject // New icon for Project Hours
} from "@fortawesome/free-solid-svg-icons";
import Alert from "../layout/Alert";
import Chart from "chart.js/auto";

import ChartDataLabels from 'chartjs-plugin-datalabels';
import "../../styles/Dashboard.scss";
import { DateTime } from "luxon";

// Helper to map day names to Luxon weekday numbers
const dayNameToLuxonWeekday = {
  'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
  'Friday': 5, 'Saturday': 6, 'Sunday': 7,
};

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

// Helper to get a custom week's start and end
const getCustomWeekPeriod = (date, startDayOfWeekName = 'Monday') => {
    const targetWeekdayNum = dayNameToLuxonWeekday[startDayOfWeekName] || 1; // Default to Monday
    const currentDt = DateTime.isDateTime(date) ? date : DateTime.fromJSDate(date);

    const daysToSubtract = (currentDt.weekday - targetWeekdayNum + 7) % 7;
    const customWeekStart = currentDt.minus({ days: daysToSubtract }).startOf('day');
    const customWeekEnd = customWeekStart.plus({ days: 6 }).endOf('day');
    return { start: customWeekStart, end: customWeekEnd };
};

// Helper to get date range based on selected view and custom start day
const getPeriodRange = (view, startDayOfWeekName = 'Monday') => {
  const today = DateTime.local();
  let startDt, endDt;
  const { start: currentCustomWeekStart, end: currentCustomWeekEnd } = getCustomWeekPeriod(today, startDayOfWeekName);

  if (view === "Weekly") {
    startDt = currentCustomWeekStart;
    endDt = currentCustomWeekEnd;
  } else if (view === "Fortnightly") {
    // Current custom week + previous custom week
    startDt = currentCustomWeekStart.minus({ weeks: 1 });
    endDt = currentCustomWeekEnd; // End of the current custom week
  } else if (view === "Monthly") { // Represents a 4-week period ending with the current custom week
    startDt = currentCustomWeekStart.minus({ weeks: 3 });
    endDt = currentCustomWeekEnd; // End of the current custom week
  } else { // Default to Weekly
    startDt = currentCustomWeekStart;
    endDt = currentCustomWeekEnd;
  }
  return { start: startDt.toJSDate(), end: endDt.toJSDate() };
};

// Helper to get the previous period's date range
const getPreviousPeriodRange = (currentRange, view, startDayOfWeekName = 'Monday') => {
  const currentStartDt = DateTime.fromJSDate(currentRange.start); // This is already a custom start day
  let prevStartDt, prevEndDt, durationWeeks = 1;

  if (view === "Weekly") {
    durationWeeks = 1;
    prevStartDt = currentStartDt.minus({ weeks: 1 });
  } else if (view === "Fortnightly") {
    durationWeeks = 2;
    prevStartDt = currentStartDt.minus({ weeks: 2 });
  } else if (view === "Monthly") {
    durationWeeks = 4; // 4-week period
    prevStartDt = currentStartDt.minus({ weeks: 4 });
  } else {
    durationWeeks = 1; // Default to Weekly
    prevStartDt = currentStartDt.minus({ weeks: 1 });
  }
  prevEndDt = prevStartDt.plus({ days: (durationWeeks * 7) - 1 }).endOf('day');
  return { start: prevStartDt.toJSDate(), end: prevEndDt.toJSDate() };
};

// Helper to calculate total hours for each day of the week
const getDayTotals = (data, periodStart, startDayOfWeekName = 'Monday') => { // startDayOfWeekName added for consistency, periodStart is key
  const dailyTotals = [];
  const startDt = DateTime.fromJSDate(periodStart); // This will be the custom start day of the week
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
const getWeeklyTotals = (data, periodStart, weeks, startDayOfWeekName = 'Monday') => { // startDayOfWeekName added
  const weeklyTotals = [];
  const startDt = DateTime.fromJSDate(periodStart); // This is the custom start of the first week of the period
  for (let w = 0; w < weeks; w++) {
    const weekStartDt = startDt.plus({ weeks: w });
    const weekEndDt = weekStartDt.plus({ days: 6 }).endOf('day'); // Custom week end
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

// Helper to get ordered day names
const getOrderedDays = (startDayName = 'Monday') => {
  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const startIndex = allDays.indexOf(startDayName);
  if (startIndex === -1) {
    console.warn(`Invalid startDayName: ${startDayName}, defaulting to Monday order.`);
    return allDays;
  }
  return [...allDays.slice(startIndex), ...allDays.slice(0, startIndex)];
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const employeesFromStore = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employeesError = useSelector(selectEmployeeError);
  const allTimesheetsFromStore = useSelector(selectAllTimesheets);
  const timesheetStatus = useSelector(selectTimesheetStatus);
  const timesheetError = useSelector(selectTimesheetError);
  const employerSettings = useSelector(selectEmployerSettings);
  const settingsStatus = useSelector(selectSettingsStatus);

  const { token, isLoading: isAuthLoading, isAuthenticated, user } = useSelector((state) => state.auth || {});

  // Local component state
  const [selectedEmployee, setSelectedEmployee] = useState({ value: "All", label: "All Employees" });
  const [viewType, setViewType] = useState({ value: "Weekly", label: "View by Weekly" });
  const [selectedProjectClient, setSelectedProjectClient] = useState({ value: "All", label: "All Clients" });

  const chartRef = useRef(null);
  const clientsChartRef = useRef(null);
  const projectsChartRef = useRef(null);

  // Memoized options for view type dropdowns
  const viewOptions = useMemo(() => [
    { value: "Weekly", label: "View by Weekly" },
    { value: "Fortnightly", label: "View by Fortnightly" },
    { value: "Monthly", label: "View by Monthly" },
  ], []);

  // Effects
  useEffect(() => {
    if (!isAuthLoading && token) {
      dispatch(fetchEmployees());
      if (settingsStatus === 'idle') dispatch(fetchEmployerSettings());
    }
  }, [dispatch, token, isAuthLoading, settingsStatus]);

  useEffect(() => {
    if (!isAuthLoading && token) {
      dispatch(fetchTimesheets());
      // Settings might already be fetched by the above useEffect
    }
  }, [token, isAuthLoading, dispatch]);

  // Set default view type from settings once loaded
  useEffect(() => {
    if (settingsStatus === 'succeeded' && employerSettings?.defaultTimesheetViewType) {
      const defaultView = viewOptions.find(option => option.value === employerSettings.defaultTimesheetViewType);
      if (defaultView) {
        setViewType(defaultView);
      } else {
        // Fallback if the setting is somehow invalid, though unlikely with a select dropdown
        setViewType({ value: "Weekly", label: "View by Weekly" });
      }
    }
  }, [settingsStatus, employerSettings, viewOptions]); // Added viewOptions to dependency array

  // Find the Employee record for the logged-in user if their role is 'employee'
  const loggedInEmployeeRecord = useMemo(() => {
    if (user?.role === 'employee' && Array.isArray(employeesFromStore) && user?._id) {
      return employeesFromStore.find(emp => emp.userId === user._id);
    }
    return null;
  }, [employeesFromStore, user]);

  // Create a memoized set of employee IDs belonging to the current employer
  const employerEmployeeIds = useMemo(() => {
    if (user?.role === 'employer' && Array.isArray(employeesFromStore)) {
      return new Set(employeesFromStore.map(emp => emp._id));
    }
    return new Set();
  }, [employeesFromStore, user?.role]);

  // Filter employees to show only those belonging to the current employer
  const employerScopedEmployees = useMemo(() => {
    if (user?.role === 'employer') {
        return employeesFromStore.filter(emp => employerEmployeeIds.has(emp._id));
    }
    return employeesFromStore; // For other roles, or if not an employer, return all fetched (backend should scope)
  }, [employeesFromStore, employerEmployeeIds, user?.role]);


  // Create a "truly scoped" version of allTimesheets based on user role
  const trulyScopedAllTimesheets = useMemo(() => {
    if (user?.role === 'employer') {
      return allTimesheetsFromStore.filter(ts => {
        const employeeId = ts.employeeId?._id || ts.employeeId;
        return employerEmployeeIds.has(employeeId);
      });
    } else if (user?.role === 'employee' && loggedInEmployeeRecord) {
      return allTimesheetsFromStore.filter(ts => {
        const timesheetEmployeeId = ts.employeeId?._id || ts.employeeId;
        return timesheetEmployeeId === loggedInEmployeeRecord._id;
      });
    }
    return [];
  }, [allTimesheetsFromStore, employerEmployeeIds, user, loggedInEmployeeRecord]);

  // Memoized options for employee and view type dropdowns
  const employeeOptions = useMemo(() => {
    if (user?.role === 'employer') {
      return [
        { value: "All", label: "All Employees" },
        ...employerScopedEmployees.map((emp) => ({ value: emp._id, label: emp.name })),
      ];
    } else if (user?.role === 'employee' && loggedInEmployeeRecord) {
      return [{ value: loggedInEmployeeRecord._id, label: loggedInEmployeeRecord.name }];
    }
    return [];
  }, [user, employerScopedEmployees, loggedInEmployeeRecord]);

  // Adjust selectedEmployee state based on role and available data
  useEffect(() => {
    if (user?.role === 'employee' && loggedInEmployeeRecord) {
      if (selectedEmployee.value !== loggedInEmployeeRecord._id) {
        setSelectedEmployee({ value: loggedInEmployeeRecord._id, label: loggedInEmployeeRecord.name });
      }
    } else if (user?.role === 'employer') {
      if (selectedEmployee.value !== "All" && Array.isArray(employerScopedEmployees) && !employerScopedEmployees.find(e => e._id === selectedEmployee.value)) {
        setSelectedEmployee({ value: "All", label: "All Employees" });
      } else if (selectedEmployee.value !== "All" && Array.isArray(employerScopedEmployees) && employerScopedEmployees.length === 0) {
        setSelectedEmployee({ value: "All", label: "All Employees" });
      }
    }
  }, [user, loggedInEmployeeRecord, employerScopedEmployees, selectedEmployee.value]);

  // Filters timesheets based on the selected employee (or role)
  const employeeTimesheets = useMemo(() => {
    if (user?.role === 'employee' && loggedInEmployeeRecord) {
        return trulyScopedAllTimesheets; // Already scoped for the logged-in employee
    } else if (user?.role === 'employer') {
        if (selectedEmployee.value === "All") {
            return trulyScopedAllTimesheets;
        }
        return trulyScopedAllTimesheets.filter(ts => (ts.employeeId?._id || ts.employeeId) === selectedEmployee.value);
    }
    return [];
  }, [user, loggedInEmployeeRecord, selectedEmployee.value, trulyScopedAllTimesheets]);

  const startDayOfWeekSetting = useMemo(() => employerSettings?.timesheetStartDayOfWeek || 'Monday', [employerSettings]);

  // Memoized date ranges for current and previous periods
  const currentPeriod = useMemo(() => getPeriodRange(viewType.value, startDayOfWeekSetting), [viewType.value, startDayOfWeekSetting]);
  const previousPeriod = useMemo(() => getPreviousPeriodRange(currentPeriod, viewType.value, startDayOfWeekSetting), [currentPeriod, viewType.value, startDayOfWeekSetting]);

  // Memoized filtered timesheets for the current period (all employees under employer, or single employee)
  const filteredAllCurrentTimesheets = useMemo(() => {
    const start = DateTime.fromJSDate(currentPeriod.start);
    const end = DateTime.fromJSDate(currentPeriod.end);
    return trulyScopedAllTimesheets.filter((t) => {
      if (!t?.date || (t.leaveType && t.leaveType !== "None")) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= start.startOf('day') && d <= end.endOf('day');
      } catch { return false; }
    });
  }, [trulyScopedAllTimesheets, currentPeriod]);

  // Memoized valid timesheets (excluding leave entries) for the current view (selected employee or logged-in employee)
  const validTimesheetsForCurrentView = useMemo(() => employeeTimesheets.filter((t) => !t.leaveType || t.leaveType === "None"), [employeeTimesheets]);

  // Memoized filtered timesheets for the current period (selected employee or logged-in employee)
  const filteredCurrentTimesheets = useMemo(() => {
    const start = DateTime.fromJSDate(currentPeriod.start);
    const end = DateTime.fromJSDate(currentPeriod.end);
    return validTimesheetsForCurrentView.filter((t) => {
      if (!t?.date) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= start.startOf('day') && d <= end.endOf('day');
      } catch { return false; }
    });
  }, [validTimesheetsForCurrentView, currentPeriod]);

  // Memoized filtered timesheets for the previous period (selected employee or logged-in employee)
  const filteredPreviousTimesheets = useMemo(() => {
    const start = DateTime.fromJSDate(previousPeriod.start);
    const end = DateTime.fromJSDate(previousPeriod.end);
    return validTimesheetsForCurrentView.filter((t) => {
      if (!t?.date) return false;
      try {
        const d = DateTime.fromISO(t.date);
        return d >= start.startOf('day') && d <= end.endOf('day');
      } catch { return false; }
    });
  }, [validTimesheetsForCurrentView, previousPeriod]);

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

  // Memoized summary calculations for "All Employees" view (employer only)

  const totalHoursAllPeriodSummary = useMemo(() => filteredAllCurrentTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [filteredAllCurrentTimesheets]);


  const avgHoursAllPeriodSummary = useMemo(() => {
    // Calculate based on the number of entries for all employees in the period
    const numberOfEntries = filteredAllCurrentTimesheets.length;

    return numberOfEntries > 0
        ? (totalHoursAllPeriodSummary / numberOfEntries)
        : 0;
}, [totalHoursAllPeriodSummary, filteredAllCurrentTimesheets]);

  // Memoized summary calculations for selected/logged-in employee view
  const totalHoursEmployeeSummary = useMemo(() => filteredCurrentTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0), [filteredCurrentTimesheets]);
  const avgHoursEmployeeSummary = useMemo(() => {
      // Calculate based on the number of entries for the selected/logged-in employee
      const numberOfEntries = filteredCurrentTimesheets.length;
      return numberOfEntries > 0 ? (totalHoursEmployeeSummary / numberOfEntries) : 0;
  }, [totalHoursEmployeeSummary, filteredCurrentTimesheets]);

  // Formatted time strings for display
  const formattedTotalHoursAllPeriod = convertDecimalToTime(totalHoursAllPeriodSummary);
  const formattedAvgHoursAllPeriod = convertDecimalToTime(avgHoursAllPeriodSummary);
  const formattedTotalHoursEmployee = convertDecimalToTime(totalHoursEmployeeSummary);
  const formattedAvgHoursEmployee = convertDecimalToTime(avgHoursEmployeeSummary);

  // Determine which total/avg hours to display based on role and employee selection
  const displayTotalHours = (user?.role === 'employer' && selectedEmployee.value === "All")
    ? formattedTotalHoursAllPeriod
    : formattedTotalHoursEmployee;
  const displayAvgHours = (user?.role === 'employer' && selectedEmployee.value === "All")
    ? formattedAvgHoursAllPeriod
    : formattedAvgHoursEmployee;

  // Memoized calculation for total leaves taken by the selected/logged-in employee in the current period
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

  // Memoized calculations for lunch break statistics for selected/logged-in employee
  const lunchBreakEntries = useMemo(() => filteredCurrentTimesheets.filter((t) => t.lunchBreak === "Yes"), [filteredCurrentTimesheets]);
  const totalLunchDuration = useMemo(() => lunchBreakEntries.reduce((acc, t) => {
    if (!t.lunchDuration || !t.lunchDuration.includes(':')) return acc;
    try {
        const [h, m] = t.lunchDuration.split(":").map(Number);
        return acc + (h + m / 60);
    } catch { return acc; }
  }, 0), [lunchBreakEntries]);
  const avgLunchBreak = useMemo(() => lunchBreakEntries.length > 0 ? convertDecimalToTime(totalLunchDuration / lunchBreakEntries.length) : "00:00", [totalLunchDuration, lunchBreakEntries]);

  // Memoized calculation for number of unique projects/clients worked on by selected/logged-in employee
  const projectsWorked = useMemo(() => new Set(filteredCurrentTimesheets.map((t) => t.projectId?._id || t.projectId).filter(Boolean)).size, [filteredCurrentTimesheets]);
  const clientsWorked = useMemo(() => new Set(filteredCurrentTimesheets.map((t) => t.clientId?._id || t.clientId).filter(Boolean)).size, [filteredCurrentTimesheets]);

  // Memoized calculation for total hours spent on entries with a Client ID (for summary card)
  const totalClientHours = useMemo(() => {
    const total = filteredCurrentTimesheets.filter(t => t.clientId).reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0);
    return convertDecimalToTime(total);
  }, [filteredCurrentTimesheets]);

  // Memoized calculation for total hours spent on entries with a Project ID (for summary card)
  const totalProjectHours = useMemo(() => {
    const total = filteredCurrentTimesheets.filter(t => t.projectId).reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0);
    return convertDecimalToTime(total);
  }, [filteredCurrentTimesheets]);
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

  // Memoized total hours for the "Hours by Project" PIE CHART's own total display (sum of projects under selected client)
  const projectCardTotalHours = useMemo(() => {
    const total = projectCardFilteredTimesheets.reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0);
    return total > 0 ? convertDecimalToTime(total) : "00:00"; // Show 00:00 if no hours
  }, [projectCardFilteredTimesheets]);

  // New Memoized calculation for total hours spent on entries with BOTH a Client ID and a Project ID (for pie chart card totals)
  const totalClientAndProjectHours = useMemo(() => {
    const total = filteredCurrentTimesheets.filter(t => t.clientId && t.projectId).reduce((acc, sheet) => acc + (parseFloat(sheet.totalHours) || 0), 0);
    return convertDecimalToTime(total);
  }, [filteredCurrentTimesheets]);

  // Memoized data for the main bar chart (hours comparison)
  const { labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel, currentBarSpecificLabels, previousBarSpecificLabels } = useMemo(() => {
    if (showLoading || combinedError || settingsStatus !== 'succeeded') { // Wait for settings
        return { labels: [], currentData: [], previousData: [], thisPeriodLabel: "", lastPeriodLabel: "", currentBarSpecificLabels: [], previousBarSpecificLabels: [] };
    }
    let labels = [], currentData = [], previousData = [], weeks = 1;

    const currentStart = currentPeriod.start;
    const currentEnd = currentPeriod.end;
    const previousStart = previousPeriod.start;
    // const previousEnd = previousPeriod.end; // Not used directly for label
    const currentStartDayName = employerSettings?.timesheetStartDayOfWeek || 'Monday';

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
        } else { // Fortnightly or Monthly
          for (let w = 0; w < numItems; w++) {
            const weekStart = startDt.plus({ weeks: w });
            const weekEnd = weekStart.plus({ days: 6 }); // Use custom week end
            specificLabels.push(`${weekStart.toFormat('MMM d')} - ${weekEnd.toFormat('MMM d')}`);
          }
        }
        return specificLabels;
      };

    if (viewType.value === "Weekly") {
      labels = getOrderedDays(currentStartDayName).map(day => day.substring(0, 3));
      currentData = getDayTotals(filteredCurrentTimesheets, currentStart, currentStartDayName);
      previousData = getDayTotals(filteredPreviousTimesheets, previousStart, currentStartDayName);
      relativeThisLabel = "This Week"; relativeLastLabel = "Last Week";
      currentBarSpecificLabels = calculateSpecificLabels(currentStart, 7, "Weekly", currentStartDayName);
      previousBarSpecificLabels = calculateSpecificLabels(previousStart, 7, "Weekly", currentStartDayName);

    } else if (viewType.value === "Fortnightly") {
      labels = ["Week 1", "Week 2"]; weeks = 2;
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, weeks, currentStartDayName);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, weeks, currentStartDayName);
      relativeThisLabel = "This Fortnight"; relativeLastLabel = "Last Fortnight";
      currentBarSpecificLabels = calculateSpecificLabels(currentStart, weeks, "Fortnightly", currentStartDayName);
      previousBarSpecificLabels = calculateSpecificLabels(previousStart, weeks, "Fortnightly", currentStartDayName);

    } else if (viewType.value === "Monthly") {
      labels = ["Week 1", "Week 2", "Week 3", "Week 4"]; weeks = 4;
      currentData = getWeeklyTotals(filteredCurrentTimesheets, currentStart, weeks, currentStartDayName);
      previousData = getWeeklyTotals(filteredPreviousTimesheets, previousStart, weeks, currentStartDayName);
      relativeThisLabel = "This Month"; relativeLastLabel = "Last Month";
      currentBarSpecificLabels = calculateSpecificLabels(currentStart, weeks, "Monthly", currentStartDayName);
      previousBarSpecificLabels = calculateSpecificLabels(previousStart, weeks, "Monthly", currentStartDayName);
    }

     const thisPeriodLabelText = relativeThisLabel;
     const lastPeriodLabelText = relativeLastLabel;

    return { labels, currentData, previousData, thisPeriodLabel: thisPeriodLabelText, lastPeriodLabel: lastPeriodLabelText, currentBarSpecificLabels, previousBarSpecificLabels };
  }, [viewType.value, filteredCurrentTimesheets, filteredPreviousTimesheets, currentPeriod, previousPeriod, showLoading, combinedError, settingsStatus, employerSettings]);

  // Memoized data for the "Hours by Client" pie chart
  const clientChartData = useMemo(() => {
    if (showLoading || combinedError || !filteredCurrentTimesheets.length) return { labels: [], data: [] };
    const hoursByClient = groupBy("clientId", filteredCurrentTimesheets);
    // Filter out entries where clientId is null or undefined before creating chart data
    const validClientTimesheets = filteredCurrentTimesheets.filter(t => t.clientId); // This is for the PIE SLICES
    const hoursByValidClient = groupBy("clientId", validClientTimesheets);
    const data = Object.values(hoursByValidClient).map(item => item.totalHours);
    const labels = Object.values(hoursByClient).map(item => item.name);
    return { labels, data };
  }, [filteredCurrentTimesheets, showLoading, combinedError, settingsStatus]); // Added settingsStatus

  // Memoized data for the "Hours by Project" pie chart
  const projectChartData = useMemo(() => {
    if (showLoading || combinedError || !projectCardFilteredTimesheets.length) return { labels: [], data: [] };
    const hoursByProject = groupBy("projectId", projectCardFilteredTimesheets);
    // Filter out entries where projectId is null or undefined - This is for the PIE SLICES
    const validProjectTimesheets = projectCardFilteredTimesheets.filter(t => t.projectId); 
    const hoursByValidProject = groupBy("projectId", validProjectTimesheets);
    const data = Object.values(hoursByValidProject).map(item => item.totalHours);
    const labels = Object.values(hoursByValidProject).map(item => item.name);
    return { labels, data };
  }, [projectCardFilteredTimesheets, showLoading, combinedError, settingsStatus]); // Added settingsStatus

  // Effect to render/update the main bar chart
  useEffect(() => {
    const ctx = document.getElementById("graphCanvas")?.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
        Chart.unregister(ChartDataLabels);
        chartRef.current.destroy();
        chartRef.current = null;
    }

    if (showLoading || combinedError || !labels.length || settingsStatus !== 'succeeded') { // Wait for settings
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
  }, [labels, currentData, previousData, thisPeriodLabel, lastPeriodLabel, currentBarSpecificLabels, previousBarSpecificLabels, showLoading, combinedError, settingsStatus]);

  // Effect to render/update the "Hours by Client" pie chart
  useEffect(() => {
    const clientCtx = document.getElementById("clientsGraph")?.getContext("2d");
    if (!clientCtx) return;

    if (clientsChartRef.current) { clientsChartRef.current.destroy(); clientsChartRef.current = null; }
    clientCtx.clearRect(0, 0, clientCtx.canvas.width, clientCtx.canvas.height);
    Chart.unregister(ChartDataLabels);

    if (showLoading || combinedError || settingsStatus !== 'succeeded') return; // Wait for settings

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
  }, [clientChartData, showLoading, combinedError, settingsStatus]);

  // Effect to render/update the "Hours by Project" pie chart
  useEffect(() => {
    const projectCtx = document.getElementById("projectsGraph")?.getContext("2d");
    if (!projectCtx) return;

    if (projectsChartRef.current) { projectsChartRef.current.destroy(); projectsChartRef.current = null; }
    projectCtx.clearRect(0, 0, projectCtx.canvas.width, projectCtx.canvas.height);
    Chart.unregister(ChartDataLabels);

    if (showLoading || combinedError || settingsStatus !== 'succeeded') return; // Wait for settings

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
  }, [projectChartData, showLoading, combinedError, settingsStatus]);

  // Render
  return (
    <div className="view-dashboard-page">
      <Alert />
      <div className="dashboard-filters-container">
        <div className="greeting">
            <h4>Hello, {user?.name || "User"}!</h4>
            <p>Here is your {user?.role === 'employer' ? 'company' : 'personal'} status report.</p>
        </div>
        {user?.role === 'employer' && ( // Only show filters for employer
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
                  isDisabled={showLoading || user?.role !== 'employer'}
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
        )}
      </div>

      {showLoading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>{isAuthLoading ? 'Authenticating...' : (settingsStatus === 'loading' ? 'Loading settings...' : (isEmployeeLoading ? 'Loading employees...' : (isTimesheetLoading ? 'Loading timesheets...' : 'Loading...')))}</p>
        </div>
      )}

      {!showLoading && !combinedError && (
        <>
          <div className="dashboard-summary-grid">
            {user?.role === 'employer' && selectedEmployee.value === "All" && ( // Total Employees card only for employer and when "All Employees" is selected
                <div className="summary-card">
                  <FontAwesomeIcon icon={faUsers} className="summary-icon users" />
                  <div className="summary-content">
                    <h3>{(Array.isArray(employerScopedEmployees) ? employerScopedEmployees.length : 0)}</h3>
                    <p>Total Employees</p>
                  </div>
                </div>
            )}

            {/* Total Hours Card */}
            <div className="summary-card">
              <FontAwesomeIcon icon={faClock} className="summary-icon hours" />
              <div className="summary-content">
                <h3>{displayTotalHours}</h3>
                <p>
                  {(user?.role === 'employer' && selectedEmployee.value === "All")
                    ? `Total Hours (${viewType.label.split(' ')[2]})`
                    : `Total Hours Worked`}
                </p>
              </div>
            </div>

            {/* Average Hours Card */}
            <div className="summary-card">
              <FontAwesomeIcon icon={faStopwatch} className="summary-icon avg-hours" />
              <div className="summary-content">
                <h3>{displayAvgHours}</h3>
                <p>
                  Avg. Employee Hours
                </p>
              </div>
            </div>

            {/* Cards specific to a single employee view (selected by employer OR logged-in employee) */}
            { (user?.role === 'employer' && selectedEmployee.value !== "All") || (user?.role === 'employee') ? (
              <>
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
                {/* New Summary Cards for Client and Project Hours */}
                <div className="summary-card">
                  <FontAwesomeIcon icon={faBuildingUser} className="summary-icon client-hours" />
                  <div className="summary-content">
                    <h3>{totalClientHours}</h3>
                    <p>Total Client Hours</p>
                  </div>
                </div>
                <div className="summary-card">
                  <FontAwesomeIcon icon={faDiagramProject} className="summary-icon project-hours" />
                  <div className="summary-content">
                    <h3>{totalProjectHours}</h3>
                    <p>Total Project Hours</p>
                  </div>
                </div>
              </>
            ) : null}
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
                Total Client Hours: <span>{totalClientHours}</span> {/* Use totalClientHours for this card */}
              </div>

              <div className="client-chart-spacer"></div>
              <div className="chart-container pie-chart-container">
                <canvas id="clientsGraph"></canvas>
              </div>
            </div>
            <div className="chart-card">
              <h4>Hours Spent on Projects ({viewType.label.split(' ')[2]})</h4>
               <div className="chart-total">
                 Total Project Hours: <span>{totalProjectHours}</span> {/* Changed to use totalProjectHours from summary card */}
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
