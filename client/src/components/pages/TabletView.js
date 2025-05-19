// /home/digilab/timesheet/client/src/components/pages/TabletView.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../../styles/TabletView.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash,faSignInAlt, faSignOutAlt, faSearch,  faArrowLeft, faSpinner, faTimes, faPen, faCalendarAlt, faUtensils, faStickyNote, faClock } from '@fortawesome/free-solid-svg-icons';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  selectTimesheetCheckStatus, 
  selectTimesheetCheckResult 
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
  const location = useLocation();

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
    // lunchDuration is now implicitly '00:30' if lunchBreak is 'Yes', '00:00' otherwise
    notes: ''
  });
  const [logTimeCalculatedHours, setLogTimeCalculatedHours] = useState('0.00');
  const [isSubmittingLogTime, setIsSubmittingLogTime] = useState(false);
  const [logTimeError, setLogTimeError] = useState(null);

  const [activeClockIns, setActiveClockIns] = useState({});
  const [showSignInSuccessModal, setShowSignInSuccessModal] = useState(false);
  const [activeManualEntries, setActiveManualEntries] = useState({});
  const [signInSuccessMessage, setSignInSuccessMessage] = useState("");
  const [initialStatusChecked, setInitialStatusChecked] = useState(false);

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
  }, [currentUser?.id, currentUser?.role, dispatch]);

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

  useEffect(() => {
    if (isTabletViewUnlocked && employees.length > 0 && !initialStatusChecked) {
      const checkInitialStatuses = async () => {
        const todayDate = new Date().toISOString().split('T')[0];
        const newActiveClockIns = {};
        const newActiveManualEntries = {};
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        for (const emp of employees) {
          if (!emp._id) continue;
          try {
            const checkAction = await dispatch(checkTimesheetExists({ employee: emp._id, date: todayDate })).unwrap();
            if (checkAction.exists && checkAction.timesheet) {
              if (!checkAction.timesheet.endTime) {
                if (employerSettings?.tabletViewRecordingType === 'Automatically Record') {
                  newActiveClockIns[emp._id] = { id: checkAction.timesheet._id, date: checkAction.timesheet.date };
                } else if (employerSettings?.tabletViewRecordingType === 'Manually Record') {
                  const localStartTime = DateTime.fromISO(checkAction.timesheet.startTime).setZone(userTimezone).toFormat('HH:mm');
                  newActiveManualEntries[emp._id] = {
                    timesheetId: checkAction.timesheet._id,
                    startTime: localStartTime,
                    date: checkAction.timesheet.date
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
  }, [isTabletViewUnlocked, employees, dispatch, initialStatusChecked, employerSettings?.tabletViewRecordingType]);

  // Effect to sync Redux state (isTabletViewUnlocked) TO sessionStorage
  useEffect(() => {
    if (isTabletViewUnlocked) {
      console.log('[TabletView Session Write] isTabletViewUnlocked is TRUE, setting sessionStorage.');
      sessionStorage.setItem('tabletViewUnlocked', 'true');
    } else {
      // This will run when dispatch(setTabletViewUnlocked(false)) is called in handlePerformExit
      console.log('[TabletView Session Write] isTabletViewUnlocked is FALSE, removing from sessionStorage.');
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
      console.log('[TabletView] Exit password: User info missing.');
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
      console.log('[TabletView] Exit password verification FAILED in catch.');
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
    dispatch(setTabletViewUnlocked(false)); // App.js will handle navigation
  };

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
    setSelectedEmployeeForAction(employee);
    const recordingType = employerSettings?.tabletViewRecordingType || 'Automatically Record';
    const employeeId = employee._id;
    const todayDate = new Date().toISOString().split('T')[0];
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (recordingType === 'Manually Record') {
      try {
        const checkAction = await dispatch(checkTimesheetExists({ employee: employeeId, date: todayDate })).unwrap();
        if (checkAction.exists && checkAction.timesheet) {
          const existingTS = checkAction.timesheet;
          if (!existingTS.endTime) {
            const localStartTime = DateTime.fromISO(existingTS.startTime).setZone(userTimezone).toFormat('HH:mm');
            setActiveManualEntries(prev => ({
                ...prev,
                [employeeId]: { timesheetId: existingTS._id, startTime: localStartTime, date: existingTS.date }
            }));
            setLogTimeData({
                startTime: localStartTime,
                showEndTimeDetails: true,
                endTime: '',
                lunchBreak: existingTS.lunchBreak || 'No',
                notes: existingTS.notes || ''
            });
            setShowLogTimeModal(true);
            return;
          } else {
            dispatch(setAlert(`${employee.name} has already recorded a complete shift for today. You can edit it.`, 'info', 7000));
            navigate(`/timesheet/create/${existingTS._id}`);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not check for existing timesheet before manual log:", err);
      }
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setLogTimeData({ startTime: currentTime, showEndTimeDetails: false, endTime: '', lunchBreak: 'No', notes: '' });
      setLogTimeCalculatedHours('0.00');
      setLogTimeError(null);
      setShowLogTimeModal(true);
    } else { // Automatically Record
      console.log(`PERFORM SIGN IN for employee ID: ${employee.id || employee._id}, Name: ${employee.name}`);
      setIsSubmittingLogTime(true);
      dispatch(clearCheckStatus());
      try {
        const now = new Date();
        const todayDate = now.toISOString().split('T')[0];
        const checkAction = await dispatch(checkTimesheetExists({ employee: employee._id, date: todayDate })).unwrap();
        if (checkAction.exists && checkAction.timesheet) {
          if (!checkAction.timesheet.endTime) {
            setActiveClockIns(prev => ({ ...prev, [employee._id]: checkAction.timesheet._id }));
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
            console.error("Employee object is missing _id for timesheet creation:", employee);
            dispatch(setAlert("Cannot sign in: Employee data is incomplete.", "danger"));
            setIsSubmittingLogTime(false);
            setSelectedEmployeeForAction(null);
            return;
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
          timezone: userTimezone,
          leaveType: 'None',
          clientId: null,
          projectId: null,
          hourlyWage: employee?.wage || 0,
        };
        const createdTimesheetAction = await dispatch(createTimesheet(timesheetPayload)).unwrap();
        if (createdTimesheetAction && createdTimesheetAction.data) {
            setActiveClockIns(prev => ({
                ...prev,
                [employee._id]: { id: createdTimesheetAction.data._id, date: createdTimesheetAction.data.date }
            }));
            setSignInSuccessMessage(`${employee.name} signed in successfully at ${currentTimeStr}.`);
            setShowSignInSuccessModal(true);
        } else {
            dispatch(setAlert(`Sign in attempt for ${employee.name} did not return expected data.`, 'warning'));
        }
      } catch (error) {
        console.error("Error during automatic sign-in (create timesheet):", error);
        dispatch(setAlert(error || `Failed to sign in ${employee.name}.`, 'danger', 5000));
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
    setIsSubmittingLogTime(true);
    try {
        const now = new Date();
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const updatePayload = {
            date: originalTimesheetDate,
            endTime: localTimeToUtcISO(currentTimeStr, originalTimesheetDate, userTimezone),
            lunchBreak: "Yes", 
            lunchDuration: "00:30", 
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
      // No need to manage lunchDuration here anymore, it's implicit
      return newState;
    });
    setLogTimeError(null);
  };

  useEffect(() => {
    const { startTime, showEndTimeDetails, endTime, lunchBreak } = logTimeData;
    const lunchDuration = lunchBreak === 'Yes' ? '00:30' : '00:00'; // Implicit lunch duration

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
      if (lunchBreak === 'Yes') {
        const [lunchH, lunchM] = lunchDuration.split(':').map(Number); // Use the implicit duration
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
  }, [logTimeData.startTime, logTimeData.endTime, logTimeData.lunchBreak, logTimeData.showEndTimeDetails]);


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
    }

    setIsSubmittingLogTime(true);
    try {
      const employeeId = selectedEmployeeForAction._id;
      const todayDate = new Date().toISOString().split('T')[0];
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const actualLunchDuration = logTimeData.lunchBreak === 'Yes' ? '00:30' : '00:00';

      if (!logTimeData.showEndTimeDetails) {
        const checkAction = await dispatch(checkTimesheetExists({ employee: employeeId, date: todayDate })).unwrap();
        if (checkAction.exists && checkAction.timesheet) {
          dispatch(setAlert(`${selectedEmployeeForAction.name} already has a timesheet entry for today. Please complete or edit it.`, 'warning', 6000));
          setShowLogTimeModal(false);
          executeFinalEmployeeAction(selectedEmployeeForAction);
          setIsSubmittingLogTime(false);
          return;
        }
        const timesheetPayload = {
          employeeId: employeeId,
          date: todayDate,
          startTime: localTimeToUtcISO(logTimeData.startTime, todayDate, userTimezone),
          endTime: null,
          lunchBreak: 'No', // When only start time, lunch is 'No'
          lunchDuration: '00:00',
          totalHours: 0,
          notes: logTimeData.notes || 'Manually started entry.',
          timezone: userTimezone,
          leaveType: 'None', clientId: null, projectId: null,
          hourlyWage: selectedEmployeeForAction?.wage || 0,
        };
        const createdAction = await dispatch(createTimesheet(timesheetPayload)).unwrap();
        if (createdAction && createdAction.data) {
          const localStartTime = DateTime.fromISO(createdAction.data.startTime).setZone(userTimezone).toFormat('HH:mm');
          setActiveManualEntries(prev => ({
            ...prev,
            [employeeId]: {
              timesheetId: createdAction.data._id,
              startTime: localStartTime,
              date: createdAction.data.date
            }
          }));
          dispatch(setAlert(`${selectedEmployeeForAction.name}, you have successfully started a new timesheet entry.`, 'success', 4000));
          setShowLogTimeModal(false);
          setSelectedEmployeeForAction(null);
          setLogTimeData({ startTime: '', showEndTimeDetails: false, endTime: '', lunchBreak: 'No', notes: '' });
          setLogTimeCalculatedHours('0.00');
        }
      } else { // Submitting COMPLETE TIMESHEET
        if (activeManualEntries[employeeId] && activeManualEntries[employeeId].timesheetId) {
          const timesheetIdToUpdate = activeManualEntries[employeeId].timesheetId;
          const originalDate = activeManualEntries[employeeId].date;
          const updatePayload = {
            date: originalDate,
            startTime: localTimeToUtcISO(logTimeData.startTime, originalDate, userTimezone),
            endTime: localTimeToUtcISO(logTimeData.endTime, originalDate, userTimezone),
            lunchBreak: logTimeData.lunchBreak,
            lunchDuration: actualLunchDuration,
            totalHours: parseFloat(logTimeCalculatedHours) || 0,
            notes: logTimeData.notes,
          };
          await dispatch(updateTimesheet({ id: timesheetIdToUpdate, timesheetData: updatePayload })).unwrap();
          setActiveManualEntries(prev => {
            const newState = { ...prev };
            delete newState[employeeId];
            return newState;
          });
          dispatch(setAlert(`Timesheet completed for ${selectedEmployeeForAction.name}.`, 'success', 3000));
        } else {
          const checkAction = await dispatch(checkTimesheetExists({ employee: employeeId, date: todayDate })).unwrap();
          if (checkAction.exists && checkAction.timesheet) {
            dispatch(setAlert(`${selectedEmployeeForAction.name} already has a timesheet entry for today. Please edit it.`, 'warning', 6000));
            navigate(`/timesheet/create/${checkAction.timesheet._id}`);
            setShowLogTimeModal(false);
            setIsSubmittingLogTime(false);
            return;
          }
          const timesheetPayload = {
            employeeId: employeeId, date: todayDate,
            startTime: localTimeToUtcISO(logTimeData.startTime, todayDate, userTimezone),
            endTime: localTimeToUtcISO(logTimeData.endTime, todayDate, userTimezone),
            lunchBreak: logTimeData.lunchBreak,
            lunchDuration: actualLunchDuration,
            totalHours: parseFloat(logTimeCalculatedHours) || 0,
            notes: logTimeData.notes, timezone: userTimezone, leaveType: 'None', clientId: null, projectId: null,
            hourlyWage: selectedEmployeeForAction?.wage || 0,
          };
          await dispatch(createTimesheet(timesheetPayload)).unwrap();
          dispatch(setAlert(`Timesheet logged for ${selectedEmployeeForAction.name}.`, 'success', 3000));
        }
        setIsSubmittingLogTime(false);
        setShowLogTimeModal(false);
        setSelectedEmployeeForAction(null);
        setLogTimeData({ startTime: '', showEndTimeDetails: false, endTime: '', lunchBreak: 'No', notes: '' });
        setLogTimeCalculatedHours('0.00');
      }
    } catch (error) {
      console.error("Error submitting log time:", error);
      const errorMessage = error.message || (error.response && error.response.data && error.response.data.message) || "Failed to log time.";
      dispatch(setAlert(errorMessage, 'danger', 5000));
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
    const isCompletingManualEntry = !!activeManualEntries[selectedEmployeeForAction?._id];

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
              {/* Start Time Field */}
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
                    disabled={isCompletingManualEntry}
                    required
                  />
                  <FontAwesomeIcon icon={faCalendarAlt} className="tv-input-icon" />
                </div>
              </div>

              {!isCompletingManualEntry && (
                <div className="tv-mt-1"> {/* This div is for the checkbox group itself */}
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
              )}

              {(logTimeData.showEndTimeDetails || isCompletingManualEntry) && (
                <>
                  {/* End Time Field */}
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

                  {/* Lunch Break Field */}
                  <div className="tv-form-group tv-mt-1">
                    <label htmlFor="lunchBreak" className="tv-form-group-label">Lunch Break*</label>
                    <div className="tv-input-container"> {/* Added tv-input-container */}
                      <select
                        name="lunchBreak"
                        id="lunchBreak"
                        value={logTimeData.lunchBreak}
                        onChange={handleLogTimeDataChange}
                        className="tv-input tv-input-with-icon" // Added tv-input-with-icon
                      >
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                      <FontAwesomeIcon icon={faUtensils} className="tv-input-icon" />
                    </div>
                  </div>
                  {/* END Lunch Duration input is removed */}

                  {/* Hours Field - Now visible only when end time details are shown */}
                  <div className="tv-form-group tv-mt-1">
                    <label htmlFor="hours" className="tv-form-group-label">Hours</label>
                    <div className="tv-input-container">
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
                      <FontAwesomeIcon icon={faClock} className="tv-input-icon" />
                    </div>
                  </div>

                  {/* Notes Field - Now visible only when end time details are shown */}
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
                </> // End of fragment for (logTimeData.showEndTimeDetails || isCompletingManualEntry)
              )} {/* End of (logTimeData.showEndTimeDetails || isCompletingManualEntry) conditional */}
            </form>

            {/* Summary Section */}
            {(logTimeData.showEndTimeDetails || isCompletingManualEntry) && (logTimeData.startTime) ? ( // Ensure startTime exists for summary
              <div className="log-time-summary tv-mt-1">
                <p><strong>Summary:</strong></p>
                <ul>
                  {logTimeData.startTime && <li>Start: {logTimeData.startTime}</li>}
                  {logTimeData.endTime && <li>End: {logTimeData.endTime}</li>}
                  {logTimeData.lunchBreak === 'Yes' && ( // Show 30 min if lunch is Yes
                    <li>Lunch: 00:30</li>
                  )}
                  <li>Hours: {logTimeCalculatedHours}</li>
                </ul>
              </div>
            ) : null }
            {/* The "Clock In:" summary for only start time is removed as per new requirement.
                It was previously:
                (!isCompletingManualEntry && logTimeData.startTime && !logTimeData.showEndTimeDetails) ? (
                  <div className="log-time-summary tv-mt-1"><p><strong>Clock In:</strong> {logTimeData.startTime}</p></div>
                ) : null */}
          </div>
          <div className="tv-modal-footer">
              <button
                data-test="button"
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
                    const employeeId = emp._id || emp.id;
                    const isClockedIn = !!activeClockIns[employeeId];
                    const isManuallyStarted = employerSettings?.tabletViewRecordingType === 'Manually Record' && !!activeManualEntries[employeeId];
                    const isProcessingThisEmployee = (isSubmittingLogTime || isVerifyingEmployeePassword) && selectedEmployeeForAction?._id === employeeId;

                    const buttonText = isClockedIn ? 'Sign Out' : (isManuallyStarted ? 'Complete Log' : (employerSettings?.tabletViewRecordingType === 'Manually Record' ? 'Log Time' : 'Sign In'));
                    const buttonIcon = isClockedIn ? faSignOutAlt : (isManuallyStarted ? faPen : (employerSettings?.tabletViewRecordingType === 'Manually Record' ? faPen : faSignInAlt));

                    return (
                      <React.Fragment key={employeeId}>
                        <div className="tv-grid-column">{emp.name}</div>
                        <div className="tv-grid-column">
                          <button
                            className={`tv-button-grid-action ${isClockedIn ? 'tv-button--red' : (isManuallyStarted ? 'tv-button--orange' : 'tv-button--green')}`}
                            onClick={() => {
                                if (isClockedIn) { handleSignOut(employeeId); }
                                else { executeFinalEmployeeAction(emp); }
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
    </div>
  );
};

export default TabletView;
