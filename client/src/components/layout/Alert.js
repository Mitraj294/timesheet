import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeAlert } from '../../redux/slices/alertSlice';
import '../../styles/Alerts.scss';

const Alert = () => {
  const alerts = useSelector(state => state.alerts);
  const dispatch = useDispatch();

  // Effect to automatically remove alerts after their specified timeout
  useEffect(() => {
    const timers = alerts.map((alert) => {
      if (!alert || !alert.id || typeof alert.timeout !== 'number' || alert.timeout <= 0) {
        console.warn("Alert.js: Invalid alert object or timeout found:", alert);
        return null; // Skip this one, don't want to crash the UI for a bad alert
      }
      return setTimeout(() => {
        dispatch(removeAlert(alert.id));
      }, alert.timeout);
    });

      // Cleanup: clear any active timers when the component unmounts or the alerts array changes
      return () => {
        timers.forEach(timerId => timerId && clearTimeout(timerId));
      };
  }, [alerts, dispatch]);

  return (
    <div className="alert-container">
      {alerts.map(alert => {
        // Basic check to ensure the alert object is somewhat valid before trying to render
        if (!alert || !alert.id) {
           console.error("Alert.js: Invalid alert object found during render:", alert);
           return null; // Skip rendering this invalid alert
        }

        // Handle non-string messages (e.g., error objects)
        let displayMsg = alert.msg;
        if (typeof displayMsg === 'object' && displayMsg !== null) {
            displayMsg = displayMsg.message || displayMsg.error || JSON.stringify(displayMsg);
        }
        return (
          <div key={alert.id} className={`alert alert-${alert.alertType || 'info'}`}>
            <span>{displayMsg || 'No message provided'}</span>
            <button onClick={() => dispatch(removeAlert(alert.id))} className="alert-close-btn" aria-label="Close">&times;</button>
          </div>
        );
      })}
    </div>
  );
};

export default Alert;
