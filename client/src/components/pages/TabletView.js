// /home/digilab/timesheet/client/src/components/pages/TabletView.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../../styles/TabletView.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash,faSignInAlt, faSignOutAlt, faSearch,  faArrowLeft, faSpinner, faTimes, faPen, faCalendarAlt, faUtensils, faStickyNote, faClock } from '@fortawesome/free-solid-svg-icons';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom'; // Removed useLocation as it's not used
import {
  selectEmployerSettings,
  fetchEmployerSettings,
  selectSettingsStatus as selectEmployerSettingsStatus
} from '../../redux/slices/settingsSlice';
import { selectAuthUser, setTabletViewUnlocked, selectIsTabletViewUnlocked } from '../../redux/slices/authSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import {
  createTimesheet,
  updateTimesheet,
  checkTimesheetExists,
  clearCheckStatus,
  fetchIncompleteTimesheets, // Import the new thunk
  selectIncompleteTimesheets, // Import selector for incomplete timesheets
  selectIncompleteStatus,     // Import status selector for incomplete timesheets
  clearIncompleteStatus     // Import clear action for incomplete timesheets
} from '../../redux/slices/timesheetSlice';

import { DateTime } from 'luxon';

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

const TabletView = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeFetchError, setEmployeeFetchError] = useState(null);

  const currentUser = useSelector(selectAuthUser);
  const isTabletViewUnlocked = useSelector(selectIsTabletViewUnlocked);
  const employerSettings = useSelector(selectEmployerSettings);
  const employerSettingsStatus = useSelector(selectEmployerSettingsStatus);

  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  const [showExitPasswordModal, setShowExitPasswordModal] = useState(false);
  const [exitPasswordInput, setExitPasswordInput] = useState('');
  const [exitPasswordError, setExitPasswordError] = useState(null);
  const [showExitPassword, setShowExitPassword] = useState(false);
  const [isVerifyingExitPassword, setIsVerifyingExitPassword] = useState(false);

  const [showEmployeePasswordModal, setShowEmployeePasswordModal] = useState(false);
  const [selectedEmployeeForAction, setSelectedEmployeeForAction] = useState(null);
  const [employeePasswordInput, setEmployeePasswordInput] = useState('');
  const [employeePasswordError, setEmployeePasswordError] = useState(null);
  const [showEmployeeEnteredPassword, setShowEmployeeEnteredPassword] = useState(false);
  const [isVerifyingEmployeePassword, setIsVerifyingEmployeePassword] = useState(false);

  const [showLogTimeModal, setShowLogTimeModal] = useState(false);
  const [logTimeData, setLogTimeData] = useState({
    startTime: '',
    showEndTimeDetails: false,
    endTime: '',
    lunchBreak: 'No',
    notes: ''
  });
  const [logTimeCalculatedHours, setLogTimeCalculatedHours] = useState('0.00');
  const [isSubmittingLogTime, setIsSubmittingLogTime] = useState(false);
  const [logTimeError, setLogTimeError] = useState(null);

  const [activeClockIns, setActiveClockIns] = useState({});
  const [showSignInSuccessModal, setShowSignInSuccessModal] = useState(false);
  const [activeManualEntries, setActiveManualEntries] = useState({}); // For today's incomplete manual entries
  const [signInSuccessMessage, setSignInSuccessMessage] = useState("");
  const [initialStatusChecked, setInitialStatusChecked] = useState(false);

  // State for prompting about older incomplete entries
  const [showOldIncompletePrompt, setShowOldIncompletePrompt] = useState(false);
  const [oldestIncompleteEntry, setOldestIncompleteEntry] = useState(null);

  const incompleteTimesheetsForSelected = useSelector(selectIncompleteTimesheets);
  const incompleteStatusForSelected = useSelector(selectIncompleteStatus);


  const fetchEmployeesCallback = useCallback(async () => {
    if (!currentUser?.id) return;
    setIsLoadingEmployees(true);
    setEmployeeFetchError(null);
    try {
       if (currentUser.role === 'employer') {
        const response = await axios.get(`/api/employees`);
        setEmployees(response.data || []);
       } else if (currentUser.role === 'employee') {
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
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (isTabletViewUnlocked && currentUser?.id) {
      fetchEmployeesCallback();
      setInitialStatusChecked(false);
    }
  }, [isTabletViewUnlocked, currentUser?.id, fetchEmployeesCallback]);

  useEffect(() => {
    if (currentUser?.role === 'employer' && (!employerSettings || employerSettingsStatus === 'idle' || employerSettingsStatus === 'failed')) {
      dispatch(fetchEmployerSettings());
    }
  }, [dispatch, currentUser, employerSettings, employerSettingsStatus]);

  // Helper function to get current geolocation
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Geolocation API returns [latitude, longitude]
          // MongoDB GeoJSON Point expects [longitude, latitude]
          resolve({
            type: 'Point',
            coordinates: [position.coords.longitude, position.coords.latitude],
            // Optionally add address if you perform reverse geocoding
            // address: '...' 
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);
  // Effect to check initial timesheet statuses (clocked-in or incomplete manual for *today*)
  useEffect(() => {
    if (isTabletViewUnlocked && employees.length > 0 && !initialStatusChecked && employerSettingsStatus === 'succeeded') {
      const checkInitialStatuses = async () => {
        const todayDate = new Date().toISOString().split('T')[0];
        const newActiveClockIns = {};
        const newActiveManualEntries = {}; // For today's entries
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        for (const emp of employees) {
          if (!emp._id) continue;
          try {
            dispatch(clearCheckStatus());
            const checkAction = await dispatch(checkTimesheetExists({ employee: emp._id, date: todayDate })).unwrap();

            if (checkAction.exists && checkAction.timesheet) { // checkAction.timesheet will now have isActiveStatus
              if (!checkAction.timesheet.endTime) { // Incomplete for today
                if (employerSettings?.tabletViewRecordingType === 'Automatically Record') {
                  newActiveClockIns[emp._id] = { id: checkAction.timesheet._id, date: checkAction.timesheet.date };
                } else if (employerSettings?.tabletViewRecordingType === 'Manually Record') {
                  const localStartTime = DateTime.fromISO(checkAction.timesheet.startTime).setZone(userTimezone).toFormat('HH:mm');
                  newActiveManualEntries[emp._id] = { // Store in activeManualEntries for today
                    timesheetId: checkAction.timesheet._id,
                    startTime: localStartTime,
                    date: checkAction.timesheet.date,
                    lunchBreak: checkAction.timesheet.lunchBreak || 'No',
                    notes: checkAction.timesheet.notes || ''
                  };
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to check initial status for ${emp.name}:`, error.message || error);
          }
        }
        setActiveClockIns(prev => ({ ...prev, ...newActiveClockIns }));
        setActiveManualEntries(prev => ({ ...prev, ...newActiveManualEntries }));
        setInitialStatusChecked(true);
      };
      checkInitialStatuses();
    }
  }, [isTabletViewUnlocked, employees, dispatch, initialStatusChecked, employerSettingsStatus, employerSettings?.tabletViewRecordingType]);

  useEffect(() => {
    if (isTabletViewUnlocked) {
      sessionStorage.setItem('tabletViewUnlocked', 'true');
    } else {
      sessionStorage.removeItem('tabletViewUnlocked');
    }
  }, [isTabletViewUnlocked]);

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
        password: exitPasswordInput
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
    dispatch(setTabletViewUnlocked(false));
    setTimeout(() => navigate('/dashboard'), 0);
  };

  const handleEmployeeActionTrigger = async (employee) => {
    setSelectedEmployeeForAction(employee);
    if (employerSettingsStatus === 'loading') {
        dispatch(setAlert('Loading settings, please wait...', 'info', 2000));
        return;
    }
    if (employerSettingsStatus === 'failed') {
        dispatch(setAlert('Could not load tablet view settings. Please try again.', 'danger', 3000));
        return;
    }

    // Fetch all incomplete timesheets for this employee first
    dispatch(clearIncompleteStatus()); // Clear previous results
    const incompleteResultAction = await dispatch(fetchIncompleteTimesheets(employee._id));

    if (fetchIncompleteTimesheets.fulfilled.match(incompleteResultAction)) {
        const allIncomplete = incompleteResultAction.payload;
        const todayDate = new Date().toISOString().split('T')[0];
        const todayIncomplete = allIncomplete.find(ts => ts.date === todayDate);

        if (todayIncomplete) {
            // Prioritize completing today's incomplete entry
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const localStartTime = DateTime.fromISO(todayIncomplete.startTime).setZone(userTimezone).toFormat('HH:mm');
            // Update activeManualEntries for today to ensure modal pre-fills correctly
            setActiveManualEntries(prev => ({
                ...prev,
                [employee._id]: {
                    timesheetId: todayIncomplete._id,
                    startTime: localStartTime,
                    date: todayIncomplete.date,
                    lunchBreak: todayIncomplete.lunchBreak || 'No',
                    notes: todayIncomplete.notes || ''
                }
            }));
        } else if (allIncomplete.length > 0) {
            // There are older incomplete entries, but not for today
            setOldestIncompleteEntry(allIncomplete[0]); // Assuming sorted by date, oldest first
            setShowOldIncompletePrompt(true);
            return; // Stop here, let user decide on the prompt
        }
        // If no incomplete entries at all, or if today's was found (and activeManualEntries updated), proceed
    } else {
        // Handle error fetching incomplete timesheets if necessary
        dispatch(setAlert('Could not check for incomplete entries. Proceeding with current day action.', 'warning'));
    }

    // Proceed with password check or final action
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

  const executeFinalEmployeeAction = async (employee) => {
    // This function is now called AFTER the incomplete check and potential password verification
    setSelectedEmployeeForAction(employee);
    const recordingType = employerSettings?.tabletViewRecordingType || 'Automatically Record';
    const employeeId = employee._id;
    const todayDate = new Date().toISOString().split('T')[0];
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (recordingType === 'Manually Record') {
      // Check activeManualEntries for *today's* incomplete entry (populated by initial check or by handleEmployeeActionTrigger)
      const todayIncompleteManualEntry = activeManualEntries[employeeId];

      if (todayIncompleteManualEntry && todayIncompleteManualEntry.timesheetId && todayIncompleteManualEntry.date === todayDate) {
        // An incomplete entry for *TODAY* exists, pre-fill modal for completion
        setLogTimeData({
            startTime: todayIncompleteManualEntry.startTime,
            showEndTimeDetails: true,
            endTime: '',
            lunchBreak: todayIncompleteManualEntry.lunchBreak,
            notes: todayIncompleteManualEntry.notes
        });
        setShowLogTimeModal(true);
        return;
      } else {
        // No incomplete entry for *today*. Check if a *complete* one exists for today.
        try {
          dispatch(clearCheckStatus());
          const checkAction = await dispatch(checkTimesheetExists({ employee: employeeId, date: todayDate })).unwrap();
          if (checkAction.exists && checkAction.timesheet && checkAction.timesheet.endTime) {
             dispatch(setAlert(`${employee.name} has already recorded a complete shift for today. You can edit it from the main timesheet page.`, 'info', 7000));
             return;
          }
        } catch (err) {
          console.warn("Could not check for existing complete timesheet before starting new manual log:", err);
        }

        // Proceed to log a new entry for today
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setLogTimeData({
            startTime: currentTime,
            showEndTimeDetails: false,
            endTime: '',
            lunchBreak: 'No',
            notes: ''
        });
        setLogTimeCalculatedHours('0.00');
        setLogTimeError(null);
        setShowLogTimeModal(true);
      }
    } else { // Automatically Record
      setIsSubmittingLogTime(true);
      dispatch(clearCheckStatus());
      let startLocation = null;
      try {
        const now = new Date();
        const checkAction = await dispatch(checkTimesheetExists({ employee: employee._id, date: todayDate })).unwrap();
        if (checkAction.exists && checkAction.timesheet) {
          if (!checkAction.timesheet.endTime) {
            setActiveClockIns(prev => ({ ...prev, [employee._id]: { id: checkAction.timesheet._id, date: checkAction.timesheet.date, isActiveStatus: checkAction.timesheet.isActiveStatus } })); // Store status
            setSignInSuccessMessage(`${employee.name} is already signed in.`);
            setShowSignInSuccessModal(true);
            setIsSubmittingLogTime(false);
            return;
          } else {
            dispatch(setAlert(`${employee.name} has already completed a shift today. Further clock-ins on the same day are not supported via Tablet View.`, 'warning', 5000));
            setIsSubmittingLogTime(false);
            setSelectedEmployeeForAction(null);
            return;
          }
        }
        if (!employee._id) {
            dispatch(setAlert("Cannot sign in: Employee data is incomplete.", "danger"));
            setIsSubmittingLogTime(false);
            setSelectedEmployeeForAction(null);
            return;
        }

        // Attempt to get current location for startLocation
        try {
            startLocation = await getCurrentLocation();
        } catch (geoError) {
            console.warn("Failed to get start location:", geoError.message);
        }
        const currentDate = now.toISOString().split('T')[0];
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const timesheetPayload = {
          employeeId: employee._id,
          date: currentDate,
          startTime: localTimeToUtcISO(currentTimeStr, currentDate, userTimezone),
          endTime: null,
          lunchBreak: 'No',
          lunchDuration: '00:00',
          totalHours: 0,
          notes: 'Clocked in via Tablet View',
          isActiveStatus: 'Active', // Set status for new clock-in
          timezone: userTimezone,
          leaveType: 'None',
          clientId: null,
          projectId: null,
          hourlyWage: employee?.wage || 0,
          startLocation: startLocation, // Include start location
        };
        const createdTimesheetAction = await dispatch(createTimesheet(timesheetPayload)).unwrap();
        if (createdTimesheetAction && createdTimesheetAction.data) {
            setActiveClockIns(prev => ({
                ...prev, // Keep existing active clock-ins
                [employee._id]: { id: createdTimesheetAction.data._id, date: createdTimesheetAction.data.date }
            }));
            setSignInSuccessMessage(`${employee.name} signed in successfully at ${currentTimeStr}.`);
            setShowSignInSuccessModal(true);
        } else {
            dispatch(setAlert(`Sign in attempt for ${employee.name} did not return expected data.`, 'warning'));
        }
      } catch (error) {
        console.error("Error during automatic sign-in (create timesheet):", error);
        dispatch(setAlert(error.message || error || `Failed to sign in ${employee.name}.`, 'danger', 5000));
      } finally {
        setIsSubmittingLogTime(false);
      }
    }
  };

  const handleSignOut = async (employeeId) => {
    if (!activeClockIns[employeeId] || !activeClockIns[employeeId].id || !activeClockIns[employeeId].date) {
        dispatch(setAlert("Error: Active clock-in data is incomplete or missing.", "danger"));
        return;
    }
    const timesheetIdToUpdate = activeClockIns[employeeId].id;
    const originalTimesheetDate = activeClockIns[employeeId].date;
    const currentEmployee = selectedEmployeeForAction || employees.find(emp => (emp._id || emp.id) === employeeId);
    let endLocation = null;
    setIsSubmittingLogTime(true);
    try {
        const now = new Date();
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Attempt to get current location for endLocation
        try {
            endLocation = await getCurrentLocation();
        } catch (geoError) {
            console.warn("Failed to get end location:", geoError.message);
        }

        const updatePayload = {
            endTime: localTimeToUtcISO(currentTimeStr, originalTimesheetDate, userTimezone),
            notes: (currentEmployee?.tabletViewSignOutNotes || "") + " Clocked out via Tablet View",
            isActiveStatus: 'Inactive', // Set status to Inactive on sign out
            endLocation: endLocation, // Include end location
        };
        await dispatch(updateTimesheet({ id: timesheetIdToUpdate, timesheetData: updatePayload })).unwrap();
        setActiveClockIns(prev => {
            const { [employeeId]: _, ...rest } = prev; // Remove the signed-out employee
            return rest;
        });
        dispatch(setAlert(`${currentEmployee?.name || 'Employee'} signed out successfully at ${currentTimeStr}.`, 'success', 4000));
    } catch (error) {
        console.error("Error during sign-out (update timesheet):", error);
        dispatch(setAlert(error.message || error || `Failed to sign out ${currentEmployee?.name || 'employee'}.`, 'danger', 5000));
    } finally {
        setIsSubmittingLogTime(false);
        setSelectedEmployeeForAction(null);
    }
  };

  const handleLogTimeDataChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLogTimeData(prev => {
      const newState = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'showEndTimeDetails' && !checked) {
        newState.endTime = '';
        newState.lunchBreak = 'No';
      }
      return newState;
    });
    setLogTimeError(null);
  };

  useEffect(() => {
    const { startTime, showEndTimeDetails, endTime, lunchBreak } = logTimeData;
    const lunchDuration = lunchBreak === 'Yes' ? '00:30' : '00:00';

    if (!showEndTimeDetails || !startTime || !endTime) {
      setLogTimeCalculatedHours('0.00');
      return;
    }

    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM) ||
          startH < 0 || startH > 23 || startM < 0 || startM > 59 ||
          endH < 0 || endH > 23 || endM < 0 || endM > 59) {
        setLogTimeCalculatedHours('Invalid Time');
        return;
      }

      let startMinutes = startH * 60 + startM;
      let endMinutes = endH * 60 + endM;

      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
      }

      let durationMinutes = endMinutes - startMinutes;

      if (lunchBreak === 'Yes') {
        const [lunchH, lunchM] = lunchDuration.split(':').map(Number);
         if (!isNaN(lunchH) && !isNaN(lunchM)) {
          const lunchMinutesVal = lunchH * 60 + lunchM;
          durationMinutes = Math.max(0, durationMinutes - lunchMinutesVal);
        }
      }
      setLogTimeCalculatedHours((durationMinutes / 60).toFixed(2));
    } catch (calcError) {
      console.error("Error calculating hours:", calcError);
      setLogTimeCalculatedHours('Error');
    }
  }, [logTimeData.startTime, logTimeData.endTime, logTimeData.lunchBreak, logTimeData.showEndTimeDetails]);

  const handleLogTimeSubmit = async (e) => {
    e.preventDefault();
    setLogTimeError(null);
    if (!selectedEmployeeForAction) {
      setLogTimeError("No employee selected for logging time.");
      return;
    }
    const employeeId = selectedEmployeeForAction._id;
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const actualLunchDuration = logTimeData.lunchBreak === 'Yes' ? '00:30' : '00:00';
    
    // Determine if completing an entry for *today*
    const isCompletingTodaysManualEntry = activeManualEntries[employeeId] && activeManualEntries[employeeId].date === new Date().toISOString().split('T')[0];
    const timesheetIdToUpdate = isCompletingTodaysManualEntry ? activeManualEntries[employeeId].timesheetId : null;
    const entryDate = isCompletingTodaysManualEntry ? activeManualEntries[employeeId].date : new Date().toISOString().split('T')[0];

    if (!logTimeData.startTime || !/^\d{2}:\d{2}$/.test(logTimeData.startTime)) {
        setLogTimeError("Start time is required and must be in HH:MM format.");
        return;
    }

    if (logTimeData.showEndTimeDetails || isCompletingTodaysManualEntry) { // End time is required if completing or if "Add End Time" is checked
      if (!logTimeData.endTime || !/^\d{2}:\d{2}$/.test(logTimeData.endTime)) {
        setLogTimeError("End time is required and must be in HH:MM format when completing or adding end time.");
        return;
      }
      try {
          const [startH, startM] = logTimeData.startTime.split(':').map(Number);
          const [endH, endM] = logTimeData.endTime.split(':').map(Number);
           if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
             throw new Error("Invalid time parsing");
           }
          let startMinutes = startH * 60 + startM;
          let endMinutes = endH * 60 + endM;
          if (endMinutes <= startMinutes) {
             endMinutes += 24 * 60;
          }
          if (endMinutes <= startMinutes && parseFloat(logTimeCalculatedHours) <= 0) {
              setLogTimeError("End time must be after start time, resulting in positive duration.");
              return;
          }
      } catch (e) {
           setLogTimeError("Invalid time format provided.");
           return;
      }
    }

    setIsSubmittingLogTime(true);
    let locationData = null; // For manual entries, location might not be captured automatically
    try {
      const basePayload = {
        employeeId: employeeId,
        date: entryDate,
        startTime: localTimeToUtcISO(logTimeData.startTime, entryDate, userTimezone),
        notes: logTimeData.notes || '',
        timezone: userTimezone,
        leaveType: 'None',
        clientId: null, projectId: null,
        hourlyWage: selectedEmployeeForAction?.wage || 0,
        isActiveStatus: 'Active', // Default to Active when starting a manual entry
        // startLocation and endLocation will be added below if available/needed
      };

      let timesheetPayload;

      if (!logTimeData.showEndTimeDetails && !isCompletingTodaysManualEntry) {
        dispatch(clearCheckStatus());
        const checkAction = await dispatch(checkTimesheetExists({ employee: employeeId, date: entryDate })).unwrap();
        if (checkAction.exists && checkAction.timesheet) {
           dispatch(setAlert(`${selectedEmployeeForAction.name} already has a timesheet entry for today. Please edit it from the main timesheet page or complete the existing one if prompted.`, 'warning', 7000));
           setShowLogTimeModal(false);
           setIsSubmittingLogTime(false);
           return;
        }

        timesheetPayload = {
          ...basePayload,
          endTime: null,
          lunchBreak: 'No',
          lunchDuration: '00:00',
          totalHours: 0,
          isActiveStatus: 'Active', // Ensure status is Active for start-only entry
          startLocation: locationData, // Include location if captured (optional for manual)
          notes: logTimeData.notes || 'Manually started entry.',
        };
        const createdAction = await dispatch(createTimesheet(timesheetPayload)).unwrap();
        if (createdAction && createdAction.data) {
          const localStartTime = DateTime.fromISO(createdAction.data.startTime).setZone(userTimezone).toFormat('HH:mm');
          setActiveManualEntries(prev => ({
            ...prev,
            [employeeId]: {
              timesheetId: createdAction.data._id,
              startTime: localStartTime,
              date: createdAction.data.date,
              lunchBreak: createdAction.data.lunchBreak,
              notes: createdAction.data.notes,
            }
          }));
          dispatch(setAlert(`${selectedEmployeeForAction.name}, you have successfully started a new timesheet entry.`, 'success', 4000));
        }
      } else {
        timesheetPayload = {
          ...basePayload,
          endTime: localTimeToUtcISO(logTimeData.endTime, entryDate, userTimezone),
          lunchBreak: logTimeData.lunchBreak,
          lunchDuration: actualLunchDuration,
          totalHours: parseFloat(logTimeCalculatedHours) || 0,
          endLocation: locationData, // Include location if captured (optional for manual)
          isActiveStatus: 'Inactive', // Set status to Inactive when completing
          notes: logTimeData.notes,
        };

        if (isCompletingTodaysManualEntry && timesheetIdToUpdate) {
          await dispatch(updateTimesheet({ id: timesheetIdToUpdate, timesheetData: timesheetPayload })).unwrap();
          setActiveManualEntries(prev => {
            const newState = { ...prev };
            delete newState[employeeId];
            return newState;
          });
          dispatch(setAlert(`Timesheet completed for ${selectedEmployeeForAction.name}.`, 'success', 3000));
        } else {
          dispatch(clearCheckStatus());
          const checkAction = await dispatch(checkTimesheetExists({ employee: employeeId, date: entryDate })).unwrap();
          if (checkAction.exists && checkAction.timesheet) {
             dispatch(setAlert(`${selectedEmployeeForAction.name} already has a timesheet entry for today. Please edit it from the main timesheet page or complete the existing one if prompted.`, 'warning', 7000));
             setShowLogTimeModal(false);
             setIsSubmittingLogTime(false);
             return;
          }
          await dispatch(createTimesheet(timesheetPayload)).unwrap();
          dispatch(setAlert(`Timesheet logged for ${selectedEmployeeForAction.name}.`, 'success', 3000));
        }
      }
      setShowLogTimeModal(false);
      setSelectedEmployeeForAction(null);
      setLogTimeData({ startTime: '', showEndTimeDetails: false, endTime: '', lunchBreak: 'No', notes: '' });
      setLogTimeCalculatedHours('0.00');

    } catch (error) {
      console.error("Error submitting log time:", error);
      const errorMessage = error.message || (error.response?.data?.message) || "Failed to log time.";
      setLogTimeError(errorMessage);
    } finally {
      setIsSubmittingLogTime(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderBreadcrumbHeader = () => {
    return (
      <div className="tv-breadcrumbs-container">
      <div>
        <h4 className="tv-page-title">Tablet View</h4>
        <div className="tv-breadcrumbs-links">
          <div className="tv-breadcrumb-link-wrapper">
            <Link to="/dashboard" className="tv-breadcrumb-link">Dashboard</Link>
            <p className="tv-breadcrumb-separator">/</p>
          </div>
          <span className="tv-breadcrumb-current-page">Tablet View</span>
        </div>
      </div>
    </div>
    );
  };

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
                    className="tv-button tv-button--solid tv-button--violet"
                    disabled={isVerifyingExitPassword || !currentUser?.id}
                  >
                    <span className="tv-button-text">
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
             <h5 className="tv-card-heading">
               Hi {selectedEmployeeForAction.name}, please enter your password
              <button
                type="button"
                className="tv-modal-close-button"
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
    const isCompletingTodaysManualEntry = activeManualEntries[selectedEmployeeForAction?._id] &&
                                       activeManualEntries[selectedEmployeeForAction?._id].date === new Date().toISOString().split('T')[0];

    return (
      <div className="tv-modal-overlay">
        <div className="tv-modal tv-modal-sm" tabIndex="-1" role="dialog" aria-label="Input Timesheet Modal" aria-modal="true">
          <h5 className="tv-modal-title">
            {isCompletingTodaysManualEntry ? 'Complete Today\'s Entry' : 'Input Timesheet'}
            <button type="button" className="tv-modal-close-button" id="closeModal" onClick={() => { setShowLogTimeModal(false); setSelectedEmployeeForAction(null); }}>
              <FontAwesomeIcon icon={faTimes} className="tv-modal-close-icon" />
            </button>
          </h5>
          <div className="tv-modal-content">
            <form onSubmit={handleLogTimeSubmit}>
              <div className="tv-form-group">
                <label htmlFor="startTime" className="tv-form-group-label">Start Time*</label>
                <div className="tv-input-container">
                  <input
                    type="time"
                    className="tv-input tv-input-with-icon"
                    id="startTime"
                    name="startTime"
                    value={logTimeData.startTime}
                    onChange={handleLogTimeDataChange}
                    disabled={isCompletingTodaysManualEntry}
                    required
                  />
                  <FontAwesomeIcon icon={faCalendarAlt} className="tv-input-icon" />
                </div>
              </div>

              {!isCompletingTodaysManualEntry && (
                <div className="tv-mt-1">
                  <input
                    type="checkbox"
                    className="tv-checkbox-input"
                    name="showEndTimeDetails"
                    id="showEndTimeDetails"
                    checked={logTimeData.showEndTimeDetails}
                    onChange={handleLogTimeDataChange}
                  />
                  <label htmlFor="showEndTimeDetails" className="tv-checkbox-label">Add End Time?</label>
                </div>
              )}

              {(logTimeData.showEndTimeDetails || isCompletingTodaysManualEntry) && (
                <>
                  <div className="tv-form-group tv-mt-1">
                    <label htmlFor="endTime" className="tv-form-group-label">End Time*</label>
                    <div className="tv-input-container">
                      <input
                        type="time"
                        className="tv-input tv-input-with-icon"
                        id="endTime"
                        name="endTime"
                        value={logTimeData.endTime}
                        onChange={handleLogTimeDataChange}
                        required
                      />
                      <FontAwesomeIcon icon={faCalendarAlt} className="tv-input-icon" />
                    </div>
                  </div>

                  <div className="tv-form-group tv-mt-1">
                    <label htmlFor="lunchBreak" className="tv-form-group-label">Lunch Break*</label>
                    <div className="tv-input-container">
                      <select
                        name="lunchBreak"
                        id="lunchBreak"
                        value={logTimeData.lunchBreak}
                        onChange={handleLogTimeDataChange}
                        className="tv-input tv-input-with-icon"
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                      <FontAwesomeIcon icon={faUtensils} className="tv-input-icon" />
                    </div>
                  </div>

                  <div className="tv-form-group tv-mt-1">
                    <label htmlFor="hours" className="tv-form-group-label">Hours</label>
                    <div className="tv-input-container">
                      <input
                        type="text"
                        className="tv-input tv-input-with-icon tv-input-disabled"
                        id="hours"
                        name="hours"
                        disabled
                        autoComplete="off"
                        value={logTimeCalculatedHours}
                      />
                      <FontAwesomeIcon icon={faClock} className="tv-input-icon" />
                    </div>
                  </div>

                  <div className="tv-form-group tv-mt-1">
                    <label htmlFor="notes" className="tv-form-group-label">Notes</label>
                    <div className="tv-textarea-container">
                      <textarea
                        className="tv-textarea tv-textarea-with-icon"
                        name="notes"
                        id="notes"
                        value={logTimeData.notes}
                        onChange={handleLogTimeDataChange}
                        placeholder=" "
                      ></textarea>
                      <FontAwesomeIcon icon={faStickyNote} className="tv-textarea-icon" />
                    </div>
                  </div>
                </>
              )}
            </form>

            {logTimeError && <p className="error-text" style={{ textAlign: 'center', marginTop: '10px' }}>{logTimeError}</p>}

            {(logTimeData.showEndTimeDetails || isCompletingTodaysManualEntry) && (logTimeData.startTime) ? (
              <div className="log-time-summary tv-mt-1">
                <p><strong>Summary:</strong></p>
                <ul>
                  {logTimeData.startTime && <li>Start: {logTimeData.startTime}</li>}
                  {logTimeData.endTime && <li>End: {logTimeData.endTime}</li>}
                  {logTimeData.lunchBreak === 'Yes' && (
                    <li>Lunch: 00:30</li>
                  )}
                  <li>Hours: {logTimeCalculatedHours}</li>
                </ul>
              </div>
            ) : null }
          </div>
          <div className="tv-modal-footer">
              <button
                type="button"
                className="tv-button-footer-action"
                tabIndex="0"
                onClick={handleLogTimeSubmit}
                disabled={isSubmittingLogTime}
              >
                {isSubmittingLogTime ? <><FontAwesomeIcon icon={faSpinner} spin /> Submitting...</> : 'Proceed'}
              </button>
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
                        setSelectedEmployeeForAction(null);
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

  const renderOldIncompletePromptModal = () => {
    if (!showOldIncompletePrompt || !oldestIncompleteEntry || !selectedEmployeeForAction) return null;
    const entryDateFormatted = DateTime.fromISO(oldestIncompleteEntry.date).toFormat('MMMM d, yyyy');
    return (
      <div className="tv-modal-overlay">
        <div className="tv-modal tv-modal-sm" role="dialog" aria-modal="true">
          <h5 className="tv-modal-title">
            Incomplete Entry
            <button type="button" className="tv-modal-close-button" onClick={() => {
              setShowOldIncompletePrompt(false);
              setOldestIncompleteEntry(null);
              // Proceed to log new time for today if user cancels
              executeFinalEmployeeAction(selectedEmployeeForAction);
            }}>
              <FontAwesomeIcon icon={faTimes} className="tv-modal-close-icon" />
            </button>
          </h5>
          <div className="tv-modal-content">
            <p>
              {selectedEmployeeForAction.name}, you have an incomplete timesheet entry from <strong>{entryDateFormatted}</strong>.
            </p>
            <p>Would you like to complete it now?</p>
          </div>
          <div className="tv-modal-footer" style={{ justifyContent: 'space-around' }}>
            <button
              type="button"
              className="tv-button-footer-action"
              style={{ backgroundColor: '#6c757d' }} // Grey for "No"
              onClick={() => {
                setShowOldIncompletePrompt(false);
                setOldestIncompleteEntry(null);
                // Proceed to log new time for today
                executeFinalEmployeeAction(selectedEmployeeForAction);
              }}
            >
              No, Log New
            </button>
            <button
              type="button"
              className="tv-button-footer-action" // Default green
              onClick={() => {
                setShowOldIncompletePrompt(false);
                dispatch(setTabletViewUnlocked(false)); // Explicitly unlock before navigating
                navigate(`/timesheet/create/${oldestIncompleteEntry._id}`); // Navigate to edit page
                setOldestIncompleteEntry(null);
              }}
            >
              Yes, Complete It
            </button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={`tv-page-wrapper ${isTabletViewUnlocked && (showExitPasswordModal || showEmployeePasswordModal || showLogTimeModal || showSignInSuccessModal || showOldIncompletePrompt) ? 'modal-open-background' : ''}`}>
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
                  type="submit"
                  className="tv-button tv-button--solid tv-button--violet"
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
            <button className="tv-button-exit-view" onClick={handleExitTabletView}>
              <FontAwesomeIcon icon={faArrowLeft} className="button-icon-left" /> Exit Tablet View
            </button>
            <div className="input-container search-input-container">
              <input
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

            {isLoadingEmployees || employerSettingsStatus === 'loading' || incompleteStatusForSelected === 'loading' ? (
              <div className="tv-grid-column loading-text" style={{ gridColumn: '1 / -1' }}>
                <FontAwesomeIcon icon={faSpinner} spin /> Loading...
              </div>
            ) : employeeFetchError || employerSettingsStatus === 'failed' ? (
               <div className="tv-grid-column error-text" style={{ gridColumn: '1 / -1' }}>
                {employeeFetchError || `Failed to load settings.`}
              </div>
            ) : (
              <>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map(emp => {
                    const employeeId = emp._id || emp.id;
                    const isClockedIn = !!activeClockIns[employeeId]; // Automatic mode clock-in
                    const hasIncompleteToday = activeManualEntries[employeeId] && activeManualEntries[employeeId].date === new Date().toISOString().split('T')[0]; // Still check for today's incomplete manual entry
                    // Check if there's *any* incomplete entry (today or older) to change button text
                    const hasAnyIncomplete = (incompleteTimesheetsForSelected && incompleteTimesheetsForSelected.length > 0 && selectedEmployeeForAction?._id === employeeId) || hasIncompleteToday;

                    const isProcessingThisEmployee = (isSubmittingLogTime || isVerifyingEmployeePassword || incompleteStatusForSelected === 'loading') && selectedEmployeeForAction?._id === employeeId;

                    const buttonText = isClockedIn ? 'Sign Out'
                                     : (hasAnyIncomplete ? 'Complete Entry'
                                       : (employerSettings?.tabletViewRecordingType === 'Manually Record' ? 'Log Time' : 'Sign In'));
                    const buttonIcon = isClockedIn ? faSignOutAlt
                                     : (hasAnyIncomplete ? faPen
                                       : (employerSettings?.tabletViewRecordingType === 'Manually Record' ? faPen : faSignInAlt));
                    const buttonColorClass = isClockedIn ? 'tv-button--red'
                                          : (hasAnyIncomplete ? 'tv-button--orange'
                                            : 'tv-button--green');

                    return (
                      <React.Fragment key={employeeId}>
                        <div className="tv-grid-column">{emp.name}</div>
                        <div className="tv-grid-column">
                          <button
                            className={`tv-button-grid-action ${buttonColorClass}`}
                            onClick={() => {
                                if (isClockedIn) {
                                    handleSignOut(employeeId);
                                } else {
                                    handleEmployeeActionTrigger(emp);
                                }
                            }}
                            disabled={employerSettingsStatus === 'loading' || employerSettingsStatus === 'failed' || isProcessingThisEmployee}
                          >
                            <FontAwesomeIcon icon={buttonIcon} className="button-icon-left" />
                            {isProcessingThisEmployee ? <FontAwesomeIcon icon={faSpinner} spin style={{marginRight: '5px'}}/> : null}
                            {buttonText}
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
      {isTabletViewUnlocked && renderOldIncompletePromptModal()}
    </div>
  );
};

export default TabletView;
