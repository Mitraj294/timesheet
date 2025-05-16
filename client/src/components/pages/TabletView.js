// /home/digilab/timesheet/client/src/components/pages/TabletView.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Make sure axios is imported
import '../../styles/TabletView.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash,faSignInAlt, faSignOutAlt, faSearch,  faArrowLeft, faSpinner, faTimes, faPen, faCalendarAlt, faUtensils, faStickyNote, faClock } from '@fortawesome/free-solid-svg-icons';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  selectEmployerSettings,
  fetchEmployerSettings, // To fetch settings if not available
  selectSettingsStatus as selectEmployerSettingsStatus // Alias to avoid conflict if other settingsStatus is used
} from '../../redux/slices/settingsSlice';
import { selectAuthUser, setTabletViewUnlocked, selectIsTabletViewUnlocked } from '../../redux/slices/authSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import {
  createTimesheet,
  updateTimesheet, // Import updateTimesheet
  checkTimesheetExists, // Import checkTimesheetExists
  clearCheckStatus, // Import to clear check status
  selectTimesheetCheckStatus, // To monitor check status
  selectTimesheetCheckResult // To get check result
} from '../../redux/slices/timesheetSlice';

import { DateTime } from 'luxon'; // Import Luxon
const TabletView = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // State for employee list and search
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeFetchError, setEmployeeFetchError] = useState(null);

  // Redux Selectors
  const currentUser = useSelector(selectAuthUser);
  const isTabletViewUnlocked = useSelector(selectIsTabletViewUnlocked);
  const employerSettings = useSelector(selectEmployerSettings);
  const employerSettingsStatus = useSelector(selectEmployerSettingsStatus);


  // State for initial password authentication
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // State for Exit password modal
  const [showExitPasswordModal, setShowExitPasswordModal] = useState(false);
  const [exitPasswordInput, setExitPasswordInput] = useState('');
  const [exitPasswordError, setExitPasswordError] = useState(null);
  const [showExitPassword, setShowExitPassword] = useState(false);
  const [isVerifyingExitPassword, setIsVerifyingExitPassword] = useState(false);

  // State for employee-specific password modal (if required by settings)
  const [showEmployeePasswordModal, setShowEmployeePasswordModal] = useState(false);
  const [selectedEmployeeForAction, setSelectedEmployeeForAction] = useState(null); // Employee whose action button was clicked
  const [employeePasswordInput, setEmployeePasswordInput] = useState('');
  const [employeePasswordError, setEmployeePasswordError] = useState(null);
  const [showEmployeeEnteredPassword, setShowEmployeeEnteredPassword] = useState(false);
  const [isVerifyingEmployeePassword, setIsVerifyingEmployeePassword] = useState(false);

  // State for Log Time Modal (if recording type is manual)
  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const [logTimeData, setLogTimeData] = useState({
    startTime: '',
    showEndTimeDetails: false,
    endTime: '',
    lunchBreak: 'No',
    lunchDuration: '00:30',
    notes: ''
  });
  const [logTimeCalculatedHours, setLogTimeCalculatedHours] = useState('0.00');
  const [isSubmittingLogTime, setIsSubmittingLogTime] = useState(false);
  const [logTimeError, setLogTimeError] = useState(null);

  // State for active clock-ins: { employeeId: { id: timesheetId, date: timesheetDate } }
  const [activeClockIns, setActiveClockIns] = useState({});
  const [showSignInSuccessModal, setShowSignInSuccessModal] = useState(false);
  const [signInSuccessMessage, setSignInSuccessMessage] = useState("");

  // State to track initial status checks
  const [initialStatusChecked, setInitialStatusChecked] = useState(false);


  // --- Effects ---

  // Effect to fetch employees when the view is unlocked or currentUser changes
  const fetchEmployeesCallback = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoadingEmployees(true);
    setEmployeeFetchError(null);
    try {
       if (currentUser.role === 'employer') {
        // Employers should fetch employees associated with them
        const response = await axios.get(`/api/employees`); // Ensure backend scopes this to the employer
        setEmployees(response.data || []);
       } else if (currentUser.role === 'employee') {
         // Employees should fetch their own record
         // This ensures the `_id` field is consistently available.
         // Assumes an endpoint like /api/employees/me or similar that returns the logged-in employee's full record.
         const response = await axios.get(`/api/employees/me`);
         setEmployees(response.data ? [response.data] : []);
       } else {
         setEmployees([]);
       }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployeeFetchError("Failed to load employees. Please try again.");
      setEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [currentUser?.id, currentUser?.role, dispatch]); // Added dispatch, refined currentUser dependency

  useEffect(() => {
    if (isTabletViewUnlocked && currentUser?.id) {
      fetchEmployeesCallback();
      // When employees are (re)fetched, reset initialStatusChecked
      // so that the status check runs for the (potentially new) list of employees.
      setInitialStatusChecked(false);
    }
  }, [isTabletViewUnlocked, currentUser?.id, fetchEmployeesCallback]); // currentUser.id ensures it re-runs if user changes

  // Effect to fetch employer settings if the user is an employer and settings are not loaded
  useEffect(() => {
    if (currentUser?.role === 'employer' && (!employerSettings || employerSettingsStatus === 'idle' || employerSettingsStatus === 'failed')) {
      dispatch(fetchEmployerSettings());
    }
  }, [dispatch, currentUser, employerSettings, employerSettingsStatus]);

  // Effect to handle navigation restrictions when tablet view is unlocked (popstate only)
  useEffect(() => {
    const handlePopState = () => {
      if (isTabletViewUnlocked && location.pathname !== '/tablet-view') {
        navigate('/tablet-view', { replace: true });
        dispatch(setAlert('Navigation is restricted while in Tablet View. Please use the "Exit Tablet View" button.', 'warning', 3000));
      }
    };

    if (isTabletViewUnlocked) {
      if (location.pathname !== '/tablet-view') {
          // Force navigation back to /tablet-view if unlocked and not on the correct path
          navigate('/tablet-view', { replace: true });
          // The alert dispatch that was here for this specific scenario is now removed
          // dispatch(setAlert('Redirected: Tablet View is active. Navigation restricted.', 'warning', 3000));
      }
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isTabletViewUnlocked, navigate, location.pathname, dispatch]);

  // Effect to check initial sign-in status of employees when view is unlocked and employees are loaded
  useEffect(() => {
    if (isTabletViewUnlocked && employees.length > 0 && !initialStatusChecked) {
      const checkInitialStatuses = async () => {
        const todayDate = new Date().toISOString().split('T')[0];
        const newActiveClockIns = {};
        for (const emp of employees) {
          if (!emp._id) continue; // Skip if employee object doesn't have _id
          try {
            // Dispatch Redux thunk to check timesheet
            const checkAction = await dispatch(checkTimesheetExists({ employee: emp._id, date: todayDate })).unwrap();
            if (checkAction.exists && checkAction.timesheet && !checkAction.timesheet.endTime) {
              newActiveClockIns[emp._id] = { id: checkAction.timesheet._id, date: checkAction.timesheet.date };
            }
          } catch (error) {
            console.warn(`Failed to check initial status for ${emp.name}:`, error.message || error);
          }
        }
        setActiveClockIns(prev => ({ ...prev, ...newActiveClockIns }));
        setInitialStatusChecked(true); // Mark as checked to prevent re-running for this set of employees
      };
      checkInitialStatuses();
    }
  }, [isTabletViewUnlocked, employees, dispatch, initialStatusChecked]);

  // Effect to persist/restore isTabletViewUnlocked state using sessionStorage
  useEffect(() => {
    // On component mount, check if sessionStorage has the unlocked flag
    // and if the current Redux state is still 'locked'.
    if (sessionStorage.getItem('tabletViewUnlocked') === 'true' && !isTabletViewUnlocked) {
      dispatch(setTabletViewUnlocked(true));
    }
  }, [dispatch]); // Run once on mount to check sessionStorage

  useEffect(() => {
    // When isTabletViewUnlocked changes, update sessionStorage
    if (isTabletViewUnlocked) {
      sessionStorage.setItem('tabletViewUnlocked', 'true');
    } else {
      // If explicitly locked (e.g., user exits), remove the flag
      sessionStorage.removeItem('tabletViewUnlocked');
    }
  }, [isTabletViewUnlocked]);



  // --- Handlers ---

  // Initial Password Prompt Handlers
  const handlePasswordChange = (e) => {
    setPasswordInput(e.target.value);
    setPasswordError(null);
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setIsVerifyingPassword(true);

    if (!currentUser || !currentUser.id) {
      setPasswordError('User information not available. Please try logging in again.');
      setIsVerifyingPassword(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/verify-password', {
        userId: currentUser.id,
        password: passwordInput,
      });

      if (response.status === 200 && response.data.success) {
        dispatch(setTabletViewUnlocked(true));
        setPasswordInput('');
      } else {
        setPasswordError(response.data.message || 'Incorrect password.');
      }
    } catch (error) {
      console.error("Password verification error:", error);
      setPasswordError(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Exit Password Modal Handlers
  const handleExitPasswordChange = (e) => {
    setExitPasswordInput(e.target.value);
    setExitPasswordError(null);
  };

  const toggleShowExitPassword = () => {
    setShowExitPassword(!showExitPassword);
  };

  const handleExitPasswordSubmit = async (e) => {
    e.preventDefault();
    setExitPasswordError(null);
    setIsVerifyingExitPassword(true);
    if (!currentUser || !currentUser.id) {
      setExitPasswordError('User info missing. Please log in again.');
      setIsVerifyingExitPassword(false);
      return;
    }
    try {
      const response = await axios.post('/api/auth/verify-password', {
        userId: currentUser.id,
        password: exitPasswordInput,
      });

      if (response.status === 200 && response.data.success) {
        handlePerformExit();
      } else {
        setExitPasswordError(response.data.message || 'Incorrect password.');
      }
    } catch (error) {
      console.error('Exit password verification error:', error);
      setExitPasswordError(error.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsVerifyingExitPassword(false);
    }
  };

  const handleExitTabletView = () => {
    setShowExitPasswordModal(true);
    setExitPasswordInput('');
    setExitPasswordError(null);
    setShowExitPassword(false);
  };

  const handlePerformExit = () => {
    setPasswordInput('');
    setSearchTerm('');
    setEmployees([]);
    setEmployeeFetchError(null);
    setShowExitPasswordModal(false);
    setExitPasswordInput('');
    setExitPasswordError(null);
    // dispatching setTabletViewUnlocked(false) will trigger the useEffect above to clear sessionStorage
    dispatch(setTabletViewUnlocked(false));
  };

  // Employee Action (Sign In / Log Time) Trigger
  const handleEmployeeActionTrigger = (employee) => {
    setSelectedEmployeeForAction(employee);

    if (employerSettingsStatus === 'loading') {
        dispatch(setAlert('Loading settings, please wait...', 'info', 2000));
        return;
    }
    if (employerSettingsStatus === 'failed') {
        dispatch(setAlert('Could not load tablet view settings. Please try again.', 'danger', 3000));
        return;
    }

    const passwordRequired = employerSettings?.tabletViewPasswordRequired === true || String(employerSettings?.tabletViewPasswordRequired).toLowerCase() === 'true';

    if (passwordRequired) {
      setEmployeePasswordInput('');
      setEmployeePasswordError(null);
      setShowEmployeeEnteredPassword(false);
      setShowEmployeePasswordModal(true);
    } else {
      executeFinalEmployeeAction(employee);
    }
  };

  // Employee Password Modal Handlers (if required)
  const handleEmployeePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeForAction || !selectedEmployeeForAction.userId) {
      setEmployeePasswordError("Selected employee data is missing or invalid.");
      setIsVerifyingEmployeePassword(false);
      return;
    }

    const actualUserId = typeof selectedEmployeeForAction.userId === 'object' && selectedEmployeeForAction.userId !== null
      ? selectedEmployeeForAction.userId._id
      : selectedEmployeeForAction.userId;

    if (!actualUserId) {
      setEmployeePasswordError("Valid employee user ID could not be determined.");
      setIsVerifyingEmployeePassword(false);
      return;
    }

    setEmployeePasswordError(null);
    setIsVerifyingEmployeePassword(true);

    try {
      const response = await axios.post('/api/auth/verify-password', {
        userId: actualUserId,
        password: employeePasswordInput,
      });

      if (response.status === 200 && response.data.success) {
        setShowEmployeePasswordModal(false);
        executeFinalEmployeeAction(selectedEmployeeForAction);
      } else {
        setEmployeePasswordError(response.data.message || 'Incorrect password.');
      }
    } catch (error) {
      console.error("Employee password verification error:", error);
      setEmployeePasswordError(error.response?.data?.message || 'An error occurred.');
    } finally {
      setIsVerifyingEmployeePassword(false);
    }
  };

  // Execute the final action (Sign In or Open Log Time Modal)
  const executeFinalEmployeeAction = async (employee) => { // Made async
    const recordingType = employerSettings?.tabletViewRecordingType || 'Automatically Record';

    // Always set selectedEmployeeForAction for potential use in alerts/modals
    setSelectedEmployeeForAction(employee);

    if (recordingType === 'Automatically Record') {
      console.log(`PERFORM SIGN IN for employee ID: ${employee.id || employee._id}, Name: ${employee.name}`);
      setIsSubmittingLogTime(true);
      dispatch(clearCheckStatus()); // Clear previous check status

      try {
        const now = new Date();
        const todayDate = now.toISOString().split('T')[0];

        // 1. Check if already clocked in or completed shift for today
        const checkAction = await dispatch(checkTimesheetExists({ employee: employee._id, date: todayDate })).unwrap();

        if (checkAction.exists && checkAction.timesheet) {
          if (!checkAction.timesheet.endTime) {
            // Already clocked in and active
            setActiveClockIns(prev => ({ ...prev, [employee._id]: checkAction.timesheet._id }));
            setSignInSuccessMessage(`${employee.name} is already signed in.`);
            setShowSignInSuccessModal(true);
            setIsSubmittingLogTime(false);
            // No need to clear selectedEmployeeForAction here if modal uses it, modal close will handle
            return;
          } else {
            // Already worked and clocked out today
            dispatch(setAlert(`${employee.name} has already completed a shift today. Further clock-ins on the same day are not supported via Tablet View.`, 'warning', 5000));
            setIsSubmittingLogTime(false);
            setSelectedEmployeeForAction(null); // Clear as no further action
            return;
          }
        }

        // 2. If not clocked in, proceed to create timesheet (clock-in)
        // Ensure `employee` object has `_id` for payload
        if (!employee._id) {
            console.error("Employee object is missing _id for timesheet creation:", employee);
            dispatch(setAlert("Cannot sign in: Employee data is incomplete.", "danger"));
            setIsSubmittingLogTime(false);
            setSelectedEmployeeForAction(null);
            return;
        }

        // --- Payload for new clock-in timesheet ---
        const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const localTimeToUtcISO = (timeStr, dateStr, tz) => {
          if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
            throw new Error(`Invalid time string (HH:MM format required): '${timeStr}'`);
          }
          if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            throw new Error(`Invalid or missing Date string (YYYY-MM-DD format required): '${dateStr}'`);
          }
          if (!tz || !DateTime.local().setZone(tz).isValid) {
            throw new Error(`Invalid or missing timezone: '${tz}'`);
          }
          try {
            const localDateTime = DateTime.fromISO(`${dateStr}T${timeStr}`, { zone: tz });
            if (!localDateTime.isValid) {
              throw new Error(`Failed to parse date/time. Reason: ${localDateTime.invalidReason || 'unknown'}. Explanation: ${localDateTime.invalidExplanation || 'none'}. Input: ${dateStr}T${timeStr}, Zone: ${tz}`);
            }
            return localDateTime.toUTC().toISO();
          } catch (err) {
            console.error(`Error in localTimeToUtcISO for ${dateStr}T${timeStr} in ${tz}:`, err);
            throw new Error(`Time conversion failed: ${err.message}`);
          }
        };

        const timesheetPayload = {
          employeeId: employee._id,
          date: currentDate,
          startTime: localTimeToUtcISO(currentTimeStr, currentDate, userTimezone),
          endTime: null, // Clock-in, so no end time yet
          lunchBreak: 'No',
          lunchDuration: '00:00', // No lunch at clock-in
          totalHours: 0, // No hours calculated at clock-in
          notes: 'Clocked in via Tablet View',
          timezone: userTimezone,
          leaveType: 'None',
          clientId: null,
          projectId: null,
          hourlyWage: employee?.wage || 0,
        };

        const createdTimesheetAction = await dispatch(createTimesheet(timesheetPayload)).unwrap();
        if (createdTimesheetAction && createdTimesheetAction.data) {
            setActiveClockIns(prev => ({ ...prev, [employee._id]: createdTimesheetAction.data._id }));
            // Store more details for sign-out
            setActiveClockIns(prev => ({
                ...prev,
                [employee._id]: { id: createdTimesheetAction.data._id, date: createdTimesheetAction.data.date }
            }));
            setSignInSuccessMessage(`${employee.name} signed in successfully at ${currentTimeStr}.`);
            setShowSignInSuccessModal(true);
        } else {
            // Should not happen if unwrap() doesn't throw, but as a safeguard
            dispatch(setAlert(`Sign in attempt for ${employee.name} did not return expected data.`, 'warning'));
        }
      } catch (error) {
        console.error("Error during automatic sign-in (create timesheet):", error);
        // error from unwrap() will be the backend message or thunk rejection payload
        dispatch(setAlert(error || `Failed to sign in ${employee.name}.`, 'danger', 5000));
      } finally {
        setIsSubmittingLogTime(false);
        // Don't clear selectedEmployeeForAction here if modal might use it. Modal close can handle it.
      }
    } else { // Manually Record
      console.log(`OPEN MANUAL LOG TIME for employee ID: ${employee.id || employee._id}, Name: ${employee.name}`);
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setLogTimeData({
        startTime: currentTime,
        showEndTimeDetails: false,
        endTime: '',
        lunchBreak: 'No',
        lunchDuration: '00:30',
        notes: ''
      });
      setLogTimeCalculatedHours('0.00');
      setLogTimeError(null);
      setShowLogTimeModal(true);
    }
  };

  const handleSignOut = async (employeeId) => {
    if (!activeClockIns[employeeId] || !activeClockIns[employeeId].id || !activeClockIns[employeeId].date) {
        dispatch(setAlert("Error: Active clock-in data is incomplete or missing.", "danger"));
        return;
    }
    const timesheetIdToUpdate = activeClockIns[employeeId].id;
    const originalTimesheetDate = activeClockIns[employeeId].date; // Date of the clock-in

    // Ensure selectedEmployeeForAction is set if not already (e.g. if page reloaded)
    // This is now handled by the button's onClick setting it.
    const currentEmployee = selectedEmployeeForAction || employees.find(emp => (emp._id || emp.id) === employeeId);

    setIsSubmittingLogTime(true);
    try {
        const now = new Date();
        // const currentDate = now.toISOString().split('T')[0]; // Not needed if using originalTimesheetDate for context
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const localTimeToUtcISO = (timeStr, dateStr, tz) => {
            if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
                throw new Error(`Invalid time string (HH:MM format required): '${timeStr}'`);
            }
            if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                throw new Error(`Invalid or missing Date string (YYYY-MM-DD format required): '${dateStr}'`);
            }
            if (!tz || !DateTime.local().setZone(tz).isValid) {
                throw new Error(`Invalid or missing timezone: '${tz}'`);
            }
            try {
                const localDateTime = DateTime.fromISO(`${dateStr}T${timeStr}`, { zone: tz });
                if (!localDateTime.isValid) {
                    throw new Error(`Failed to parse date/time. Reason: ${localDateTime.invalidReason || 'unknown'}. Explanation: ${localDateTime.invalidExplanation || 'none'}. Input: ${dateStr}T${timeStr}, Zone: ${tz}`);
                }
                return localDateTime.toUTC().toISO();
            } catch (err) {
                console.error(`Error in localTimeToUtcISO for ${dateStr}T${timeStr} in ${tz}:`, err);
                throw new Error(`Time conversion failed: ${err.message}`);
            }
        };

        const updatePayload = {
            date: originalTimesheetDate, // Send the original date of the timesheet
            endTime: localTimeToUtcISO(currentTimeStr, originalTimesheetDate, userTimezone), // Use original date for endTime context
            lunchBreak: "Yes", // Default to Yes
            lunchDuration: "00:30", // Default 30 min lunch
            notes: (currentEmployee?.tabletViewSignOutNotes || "") + " Clocked out via Tablet View",
        };

        await dispatch(updateTimesheet({ id: timesheetIdToUpdate, timesheetData: updatePayload })).unwrap();

        setActiveClockIns(prev => {
            const newState = { ...prev };
            delete newState[employeeId];
            return newState;
        });
        dispatch(setAlert(`${currentEmployee?.name || 'Employee'} signed out successfully at ${currentTimeStr}.`, 'success', 4000));
    } catch (error) {
        console.error("Error during sign-out (update timesheet):", error);
        // error from unwrap() will be the backend message or thunk rejection payload
        dispatch(setAlert(error.message || error || `Failed to sign out ${currentEmployee?.name || 'employee'}.`, 'danger', 5000));
    } finally {
        setIsSubmittingLogTime(false);
        setSelectedEmployeeForAction(null);
    }
  };

  // Log Time Modal Handlers
  const handleLogTimeDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLogTimeData(prev => {
      const newState = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'showEndTimeDetails' && !checked) {
        newState.endTime = '';
        newState.lunchBreak = 'No';
        newState.lunchDuration = '00:30';
      }
      if (name === 'lunchBreak' && value === 'No') {
        newState.lunchDuration = '00:30';
      }
      return newState;
    });
    setLogTimeError(null);
  };

  useEffect(() => {
    const { startTime, showEndTimeDetails, endTime, lunchBreak, lunchDuration } = logTimeData;

    if (!startTime || (showEndTimeDetails && !endTime)) {
      setLogTimeCalculatedHours('0.00');
      return;
    }

    if (!showEndTimeDetails) {
        setLogTimeCalculatedHours('0.00');
        return;
    }

    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
        setLogTimeCalculatedHours('0.00'); return;
      }

      let startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;

      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
      }

      let durationMinutes = endMinutes - startMinutes;

      if (lunchBreak === 'Yes' && lunchDuration) {
        const [lunchH, lunchM] = lunchDuration.split(':').map(Number);
        if (!isNaN(lunchH) && !isNaN(lunchM)) {
          const lunchMinutesVal = lunchH * 60 + lunchM;
          durationMinutes -= lunchMinutesVal;
        }
      }
      setLogTimeCalculatedHours(Math.max(0, durationMinutes / 60).toFixed(2));
    } catch (calcError) {
      console.error("Error calculating hours:", calcError);
      setLogTimeCalculatedHours('Error');
    }
  }, [logTimeData.startTime, logTimeData.endTime, logTimeData.lunchBreak, logTimeData.lunchDuration, logTimeData.showEndTimeDetails]);


  const handleLogTimeSubmit = async (e) => {
    e.preventDefault();
    setLogTimeError(null);
    if (!selectedEmployeeForAction) {
      setLogTimeError("No employee selected for logging time.");
      return;
    }
    if (!logTimeData.startTime) {
      setLogTimeError("Start time is required.");
      return;
    }
    if (logTimeData.showEndTimeDetails) {
      if (!logTimeData.endTime) {
        setLogTimeError("End time is required when 'Add End Time' is checked.");
        return;
      }
      const [startH, startM] = logTimeData.startTime.split(':').map(Number);
      const [endH, endM] = logTimeData.endTime.split(':').map(Number);
      if ((endH * 60 + endM) <= (startH * 60 + startM) && parseFloat(logTimeCalculatedHours) <= 0) {
          setLogTimeError("End time must be after start time, resulting in positive duration.");
          return;
      }
      if (logTimeData.lunchBreak === 'Yes' && !/^\d{2}:\d{2}$/.test(logTimeData.lunchDuration)) {
        setLogTimeError("Valid lunch duration (HH:MM) is required when 'Lunch Break' is Yes.");
        return;
      }
    }

    setIsSubmittingLogTime(true);
    try {
      const employeeId = selectedEmployeeForAction._id;
      const todayDate = new Date().toISOString().split('T')[0]; // Use todayDate for check

      // 1. Check if a timesheet already exists for this employee and date
      const checkAction = await dispatch(checkTimesheetExists({ employee: employeeId, date: todayDate })).unwrap();

      if (checkAction.exists && checkAction.timesheet) {
        // A timesheet (either active or completed) already exists for today.
        // Dispatch a new alert message and navigate to the edit page.
        const existingTimesheetId = checkAction.timesheet._id;
        dispatch(setAlert(`${selectedEmployeeForAction.name} has already recorded time for today. You can edit the existing entry.`, 'info', 7000));
        setIsSubmittingLogTime(false);
        setShowLogTimeModal(false); // Close the modal as well
        setSelectedEmployeeForAction(null); // Clear selected employee
        // Navigate to the edit timesheet page.
        // Ensure this path matches your application's route for editing timesheets.
        navigate(`/edit-timesheet/${existingTimesheetId}`); // Or e.g., `/employee/timesheets/${existingTimesheetId}/edit`
        return; // Stop further processing
      }

      // If no existing timesheet for today, proceed to create one.
      const currentDate = new Date().toISOString().split('T')[0];
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const localTimeToUtcISO = (timeStr, dateStr, tz) => {
        if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) { throw new Error(`Invalid time string: '${timeStr}'`); }
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) { throw new Error(`Invalid date string: '${dateStr}'`); }
        if (!tz || !DateTime.local().setZone(tz).isValid) { throw new Error(`Invalid timezone: '${tz}'`); }
        try {
          const localDateTime = DateTime.fromISO(`${dateStr}T${timeStr}`, { zone: tz });
          if (!localDateTime.isValid) {
            throw new Error(`Luxon parse error: ${localDateTime.invalidReason} - ${localDateTime.invalidExplanation}`);
          }
          return localDateTime.toUTC().toISO();
        } catch (err) {
          console.error(`Error in localTimeToUtcISO (manual log) for ${dateStr}T${timeStr} in ${tz}:`, err);
          throw new Error(`Manual log time conversion failed: ${err.message}`);
        }
      };
      const timesheetPayload = {
        employeeId: employeeId, // Use the employeeId variable
        date: currentDate,
        startTime: localTimeToUtcISO(logTimeData.startTime, currentDate, userTimezone),
        endTime: logTimeData.showEndTimeDetails ? localTimeToUtcISO(logTimeData.endTime, currentDate, userTimezone) : null,
        lunchBreak: logTimeData.showEndTimeDetails ? logTimeData.lunchBreak : 'No',
        lunchDuration: logTimeData.showEndTimeDetails && logTimeData.lunchBreak === 'Yes' ? logTimeData.lunchDuration : '00:00',
        totalHours: parseFloat(logTimeCalculatedHours) || 0,
        notes: logTimeData.notes,
        timezone: userTimezone,
        leaveType: 'None',
        clientId: null,
        projectId: null,
        hourlyWage: selectedEmployeeForAction?.wage || 0,
      };
      await dispatch(createTimesheet(timesheetPayload)).unwrap();

      dispatch(setAlert(`Timesheet logged for ${selectedEmployeeForAction.name}.`, 'success', 3000));
      setShowLogTimeModal(false);
      setSelectedEmployeeForAction(null);
      setLogTimeData({ startTime: '', showEndTimeDetails: false, endTime: '', lunchBreak: 'No', lunchDuration: '00:30', notes: '' });
      setLogTimeCalculatedHours('0.00');

    } catch (error) {
      console.error("Error submitting log time:", error);
      // The specific check above handles the "already exists" case by dispatching an alert.
      // This catch block will now primarily handle other errors during timesheet creation
      // or if the checkTimesheetExists thunk itself fails.
      // Dispatch a global alert for other errors too.
      const errorMessage = error.message || (error.response && error.response.data && error.response.data.message) || "Failed to log time.";
      dispatch(setAlert(errorMessage, 'danger', 5000));
    } finally {
      setIsSubmittingLogTime(false);
    }
  };


  // --- Render Helpers ---

  const filteredEmployees = employees.filter(emp =>
    emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderBreadcrumbHeader = () => (
    <div className="tv-breadcrumbs-container">
      <div>
        <h4 className="tv-page-title">Tablet View</h4>
        <div className="tv-breadcrumbs-links">
          <div className="tv-breadcrumb-link-wrapper">
            <Link to={currentUser?.role === 'employer' ? "/employer/dashboard" : "/employee/dashboard"} className="tv-breadcrumb-link">Dashboard</Link>
            <p className="tv-breadcrumb-separator">/</p>
          </div>
          <span className="tv-breadcrumb-current-page">Tablet View</span>
        </div>
      </div>
    </div>
  );

  const renderExitPasswordModal = () => {
     if (!showExitPasswordModal) return null;
     return (
       <div className="modal-overlay">
         <div className="tv-password-prompt-container">
           <div className="tv-card">
             <h5 className="tv-card-heading">
               Enter your password to exit tablet view
               <button type="button" className="tv-modal-close-button" onClick={() => setShowExitPasswordModal(false)}>
                 <FontAwesomeIcon icon={faTimes} />
               </button>
             </h5>
             <form onSubmit={handleExitPasswordSubmit} className="tv-form">
                <input
                  type="text"
                  name="username"
                  value={currentUser?.email || ''}
                  autoComplete="username"
                  style={{ display: 'none' }}
                  readOnly
                />
               <div className="input-container password-input-container tv-input-margin-bottom">
                 <input
                   type={showExitPassword ? 'text' : 'password'}
                   className="form-input"
                   id="exitPassword"
                   name="exitPassword"
                   autoComplete="current-password"
                   value={exitPasswordInput}
                   onChange={handleExitPasswordChange}
                   placeholder="Password"
                 />
                 <FontAwesomeIcon
                   icon={showExitPassword ? faEyeSlash : faEye}
                   className="toggle-password-icon"
                   onClick={toggleShowExitPassword}
                 />
               </div>
               {exitPasswordError && <p className="error-text">{exitPasswordError}</p>}
               <div className="tv-button-group">
                  <button
                    type="submit"
                    className="tv-button tv-button--solid tv-button--violet" // Changed to violet
                    disabled={isVerifyingExitPassword || !currentUser?.id}
                  >
                 
                    <span className="tv-button-text"> {/* Added span for text structure */}
                      {isVerifyingExitPassword ? <><FontAwesomeIcon icon={faSpinner} spin /> Verifying...</> : 'Proceed'}
                    </span>
                  </button>
               </div>
             </form>
           </div>
         </div>
       </div>
     );
   };

   const renderEmployeePasswordModal = () => {
     if (!showEmployeePasswordModal || !selectedEmployeeForAction) return null;
     return (
       <div className="modal-overlay">
         <div className="modal-content tv-card">
           <div className="modal-header">
            {/* Adjusted structure: button is now inside h5 for consistent styling context */}
             <h5 className="tv-card-heading">
               Hi {selectedEmployeeForAction.name}, please enter your password
              <button
                type="button"
                className="tv-modal-close-button" // Standardized class name
                onClick={() => {
                  setShowEmployeePasswordModal(false);
                  setSelectedEmployeeForAction(null);
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
             </h5>
           </div>
           <div className="modal-body">
             <form onSubmit={handleEmployeePasswordSubmit} className="tv-form">
                <input
                  type="text"
                  name="username"
                  value={selectedEmployeeForAction?.email || selectedEmployeeForAction?.userId?.email || ''}
                   autoComplete="username"
                  style={{ display: 'none' }}
                  readOnly
                />
               <div className="input-container password-input-container tv-input-margin-bottom">
                 <input
                   type={showEmployeeEnteredPassword ? 'text' : 'password'}
                   className="form-input"
                   id="employeePassword"
                   name="employeePassword"
                   autoComplete="current-password"
                   value={employeePasswordInput}
                   onChange={(e) => setEmployeePasswordInput(e.target.value)}
                   placeholder="Password"
                 />
                 <FontAwesomeIcon
                   icon={showEmployeeEnteredPassword ? faEyeSlash : faEye}
                   className="toggle-password-icon"
                   onClick={() => setShowEmployeeEnteredPassword(!showEmployeeEnteredPassword)}
                 />
               </div>
               {employeePasswordError && <p className="error-text">{employeePasswordError}</p>}
               <div className="tv-button-group">
                 <button type="submit" className="tv-button tv-button--solid tv-button--green" disabled={isVerifyingEmployeePassword}>
                   {isVerifyingEmployeePassword ? <><FontAwesomeIcon icon={faSpinner} spin /> Verifying...</> : 'Proceed'}
                 </button>
               </div>
             </form>
           </div>
         </div>
       </div>
     );
   };

   const renderLogTimeModal = () => {
    if (!showLogTimeModal || !selectedEmployeeForAction) return null;

    return (
      <div className="tv-modal-overlay">
        <div className="tv-modal tv-modal-sm" tabIndex="-1" role="dialog" aria-label="Input Timesheet Modal" aria-modal="true">
          <h5 className="tv-modal-title">
            Input Timesheet
            <button type="button" className="tv-modal-close-button" id="closeModal" onClick={() => { setShowLogTimeModal(false); setSelectedEmployeeForAction(null); }}>
              <FontAwesomeIcon icon={faTimes} className="tv-modal-close-icon" />
            </button>
          </h5>
          <div className="tv-modal-content">
            <form onSubmit={handleLogTimeSubmit}>
              <div className="tv-input-container">
                <input
                  type="time"
                  className="tv-input tv-input-with-icon"
                  id="startTime"
                  name="startTime"
                  value={logTimeData.startTime}
                  onChange={handleLogTimeDataChange}
                  required
                />
                <label htmlFor="startTime" className="tv-input-label">Start Time*</label>
                <FontAwesomeIcon icon={faCalendarAlt} className="tv-input-icon" />
              </div>

              <div className="tv-mt-1">
                <input
                  data-test="checkbox"
                  type="checkbox"
                  className="tv-checkbox-input"
                  name="showEndTimeDetails"
                  id="showEndTimeDetails"
                  checked={logTimeData.showEndTimeDetails}
                  onChange={handleLogTimeDataChange}
                />
                <label htmlFor="showEndTimeDetails" className="tv-checkbox-label">Add End Time?</label>
              </div>

              {logTimeData.showEndTimeDetails && (
                <>
                  <div className="tv-mt-1 tv-input-container">
                    <input
                      type="time"
                      className="tv-input tv-input-with-icon"
                      id="endTime"
                      name="endTime"
                      value={logTimeData.endTime}
                      onChange={handleLogTimeDataChange}
                      required
                    />
                    <label htmlFor="endTime" className="tv-input-label">End Time*</label>
                    <FontAwesomeIcon icon={faCalendarAlt} className="tv-input-icon" />
                  </div>

                  <div className="tv-mt-1 tv-input-container">
                    <select
                      name="lunchBreak"
                      id="lunchBreak"
                      value={logTimeData.lunchBreak}
                      onChange={handleLogTimeDataChange}
                      className="tv-input"
                      style={{paddingLeft: '0.5rem', width: '100%'}}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                    <label htmlFor="lunchBreak" className="tv-input-label">Lunch Break*</label>
                  </div>


                  {logTimeData.lunchBreak === 'Yes' && (
                    <div className="tv-mt-1 tv-input-container">
                      <input
                        type="time"
                        className="tv-input tv-input-with-icon"
                        id="lunchDuration"
                        name="lunchDuration"
                        value={logTimeData.lunchDuration}
                        onChange={handleLogTimeDataChange}
                        required={logTimeData.lunchBreak === 'Yes'}
                      />
                      <label htmlFor="lunchDuration" className="tv-input-label">Lunch Duration*</label>
                      <FontAwesomeIcon icon={faUtensils} className="tv-input-icon" />
                    </div>
                  )}

                  <div className="tv-mt-1 tv-input-container">
                    <input
                      data-test="input"
                      type="text"
                      className="tv-input tv-input-with-icon tv-input-disabled"
                      id="hours"
                      name="hours"
                      disabled
                      autoComplete="off"
                      value={logTimeCalculatedHours}
                    />
                    <label htmlFor="hours" className="tv-input-label tv-input-label-active">Hours</label>
                    <FontAwesomeIcon icon={faClock} className="tv-input-icon" />
                  </div>

                  <div className="tv-mt-1 tv-textarea-container">
                    <textarea
                      className="tv-textarea tv-textarea-with-icon"
                      name="notes"
                      id="notes"
                      value={logTimeData.notes}
                      onChange={handleLogTimeDataChange}
                      placeholder=" "
                    ></textarea>
                    <label htmlFor="notes" className="tv-textarea-label">Notes</label>
                    <FontAwesomeIcon icon={faStickyNote} className="tv-textarea-icon" />
                  </div>
                </>
              )}
              {/* logTimeError display is removed from here, as errors will now be global alerts */}
              {/* {logTimeError && <p className="error-text" style={{textAlign: 'center', marginTop: '1rem'}}>{logTimeError}</p>} */}
            </form>
            {/* Summary Section - Outside the form, before the footer */}
            {logTimeData.showEndTimeDetails && (logTimeData.startTime || logTimeData.endTime) && (
              <div className="log-time-summary tv-mt-1">
                <p><strong>Summary:</strong></p>
                <ul>
                  {logTimeData.startTime && <li>Start: {logTimeData.startTime}</li>}
                  {logTimeData.endTime && <li>End: {logTimeData.endTime}</li>}
                  {logTimeData.lunchBreak === 'Yes' && logTimeData.lunchDuration && (
                    <li>Lunch: {logTimeData.lunchDuration}</li>
                  )}
                  <li>Hours: {logTimeCalculatedHours}</li>
                </ul>
              </div>
            )}
             {!logTimeData.showEndTimeDetails && logTimeData.startTime && (
                <div className="log-time-summary tv-mt-1">
                    <p><strong>Clock In:</strong> {logTimeData.startTime}</p>
                </div>
            )}
          </div>
          <div className="tv-modal-footer">
            <div className="">
              <button
                data-test="button"
                type="button"
                className="tv-button-footer-action" // Uses new specific class from SCSS
                tabIndex="0"
                onClick={handleLogTimeSubmit}
                disabled={isSubmittingLogTime}
              >
                {isSubmittingLogTime ? <><FontAwesomeIcon icon={faSpinner} spin /> Submitting...</> : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSignInSuccessModal = () => {
    if (!showSignInSuccessModal) return null;
    return (
        <div className="tv-modal-overlay">
            <div className="tv-modal tv-modal-sm" role="dialog" aria-modal="true" aria-labelledby="signInSuccessTitle">
                <h5 className="tv-modal-title" id="signInSuccessTitle">
                    Success
                    <button type="button" className="tv-modal-close-button" onClick={() => {
                        setShowSignInSuccessModal(false);
                        setSignInSuccessMessage("");
                        setSelectedEmployeeForAction(null); // Clear after modal is closed
                    }}>
                        <FontAwesomeIcon icon={faTimes} className="tv-modal-close-icon" />
                    </button>
                </h5>
                <div className="tv-modal-content">
                    <p className="tv-text-body" style={{ textAlign: 'center', margin: '1rem 0', fontWeight: 'bold' }}>
                        {signInSuccessMessage}
                    </p>
                </div>
                <div className="tv-modal-footer">
                    <button type="button" className="tv-button-footer-action" onClick={() => { setShowSignInSuccessModal(false); setSignInSuccessMessage(""); setSelectedEmployeeForAction(null); }}>
                        Finish
                    </button>
                </div>
            </div>
        </div>
    );
  };

  // --- Main Render ---

  return (
    <div className={`tv-page-wrapper ${isTabletViewUnlocked && (showExitPasswordModal || showEmployeePasswordModal || showLogTimeModal) ? 'modal-open-background' : ''}`}>
           {!isTabletViewUnlocked && renderBreadcrumbHeader()}

      {!isTabletViewUnlocked ? (
        <div className="tv-password-prompt-container">
          <div className="tv-card">
            <h5 className="tv-card-heading">Enter your password to proceed</h5>
            <form onSubmit={handlePasswordSubmit} className="tv-form">
              <input
                type="text"
                name="username"
                value={currentUser?.email || ''}
                  autoComplete="username"
                style={{ display: 'none' }}
                readOnly
              />
              <div className="input-container password-input-container tv-input-margin-bottom">
                <input
                  data-test="input"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={handlePasswordChange}
                  placeholder="Password"
                />
                <FontAwesomeIcon
                  icon={showPassword ? faEyeSlash : faEye}
                  className="toggle-password-icon"
                  onClick={toggleShowPassword}
                />
              </div>
              {passwordError && <p className="error-text">{passwordError}</p>}
              <div className="tv-button-group">
                <button
                  data-test="button"
                  type="submit"
                  className="tv-button tv-button--solid tv-button--violet" // Updated class
                  disabled={isVerifyingPassword || !currentUser?.id}
                >
                  <span className="tv-button-text">
                    {isVerifyingPassword ? <><FontAwesomeIcon icon={faSpinner} spin /> Verifying...</> : 'Proceed'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="tv-main-content-card">
          <div className="tv-top-bar">
            <button className="tv-button-exit-view" onClick={handleExitTabletView}> {/* Updated class */}
              <FontAwesomeIcon icon={faArrowLeft} className="button-icon-left" /> Exit Tablet View
            </button>
            <div className="input-container search-input-container">
              <input
                data-test="input"
                type="text"
                className="form-input"
                id="search"
                name="search"
                autoComplete="off"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Employee"
              />
               <FontAwesomeIcon icon={faSearch} className="search-icon" />
            </div>
          </div>

          <div className="tv-employee-grid">
            <div className="tv-grid-column tv-grid-header">Employee Name</div>
            <div className="tv-grid-column tv-grid-header">Action</div>

            {isLoadingEmployees || employerSettingsStatus === 'loading' ? (
              <div className="tv-grid-column loading-text" style={{ gridColumn: '1 / -1' }}>
                <FontAwesomeIcon icon={faSpinner} spin /> Loading {isLoadingEmployees ? 'employees' : 'settings'}...
              </div>
            ) : employeeFetchError || employerSettingsStatus === 'failed' ? (
               <div className="tv-grid-column error-text" style={{ gridColumn: '1 / -1' }}>
                {employeeFetchError || `Failed to load settings: ${employerSettingsStatus === 'failed' ? 'Check console' : ''}`}
              </div>
            ) : (
              <>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map(emp => {
                    const employeeId = emp._id || emp.id; // Ensure we have a consistent ID
                    const isClockedIn = !!activeClockIns[employeeId];
                    const isProcessingThisEmployee = (isSubmittingLogTime || isVerifyingEmployeePassword) && selectedEmployeeForAction?._id === employeeId; // Check _id

                    return (
                      <React.Fragment key={employeeId}>
                        <div className="tv-grid-column">{emp.name}</div>
                        <div className="tv-grid-column">
                          <button
                            className={`tv-button-grid-action ${isClockedIn ? 'tv-button--red' : 'tv-button--green'}`} // Updated classes
                            onClick={() => {
                                setSelectedEmployeeForAction(emp); // Set before calling action
                                if (isClockedIn) { handleSignOut(employeeId); }
                                else { handleEmployeeActionTrigger(emp); }
                            }}
                            disabled={employerSettingsStatus === 'loading' || employerSettingsStatus === 'failed' || isProcessingThisEmployee}
                          >
                            <FontAwesomeIcon icon={isClockedIn ? faSignOutAlt : (employerSettings?.tabletViewRecordingType === 'Manually Record' ? faPen : faSignInAlt)} className="button-icon-left" />
                            {isProcessingThisEmployee ? <FontAwesomeIcon icon={faSpinner} spin style={{marginRight: '5px'}}/> : null}
                            {isClockedIn ? 'Sign Out' : (employerSettings?.tabletViewRecordingType === 'Manually Record' ? 'Log Time' : 'Sign In')}
                          </button>
                        </div>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <div className="tv-grid-column tv-no-results" style={{ gridColumn: '1 / -1' }}>No employees found.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {isTabletViewUnlocked && renderExitPasswordModal()}
      {isTabletViewUnlocked && renderEmployeePasswordModal()}
      {isTabletViewUnlocked && showLogTimeModal && renderLogTimeModal()}
      {isTabletViewUnlocked && renderSignInSuccessModal()}
    </div>
  );
};

export default TabletView;
