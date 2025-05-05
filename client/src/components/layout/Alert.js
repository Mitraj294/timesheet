import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeAlert } from '../../redux/slices/alertSlice';
import '../../styles/Alerts.scss';

const Alert = () => {
  // Get alerts from Redux store
  const alerts = useSelector(state => state.alerts);
  const dispatch = useDispatch();

  useEffect(() => {
    // Set a timer to automatically remove each alert after its timeout
    const timers = alerts.map((alert) => {
      // Basic validation
      if (!alert || !alert.id || typeof alert.timeout !== 'number' || alert.timeout <= 0) {
        console.warn("Invalid alert object or timeout found:", alert);
        return null; // Skip invalid alerts
      }

      return setTimeout(() => {
        dispatch(removeAlert(alert.id));
      }, alert.timeout);
    });

      // Cleanup function: If the component unmounts or the alerts array changes
      // before the timer finishes, clear the timer to prevent errors.
      return () => {
        timers.forEach(timerId => timerId && clearTimeout(timerId));
      };
    // }); // Removed extra closing parenthesis
  }, [alerts, dispatch]); // Dependencies: alerts array and dispatch function

  // Don't render anything if there are no alerts
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Render the list of alerts
  return (
    <div className="alert-container">
      {alerts.map(alert => {
        // Skip rendering invalid alert objects
        if (!alert || !alert.id) {
           console.error("Invalid alert object found during render:", alert);
           return null; // Skip rendering this invalid alert
        }

        // Handle non-string messages (e.g., error objects)
        let displayMsg = alert.msg;
        if (typeof displayMsg === 'object' && displayMsg !== null) {
            // Attempt to extract a meaningful message or stringify
            displayMsg = displayMsg.message || displayMsg.error || JSON.stringify(displayMsg);
        }
        // Render the alert
        return (
          <div key={alert.id} className={`alert alert-${alert.alertType || 'info'}`}>
            <span>{displayMsg || 'No message provided'}</span>
            {/* Manual close button */}
            <button onClick={() => dispatch(removeAlert(alert.id))} className="alert-close-btn" aria-label="Close">&times;</button>
          </div>
        );
      })}
    </div>
  );
};

export default Alert;
