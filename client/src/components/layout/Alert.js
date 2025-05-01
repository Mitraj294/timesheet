// /home/digilab/timesheet/client/src/components/layout/Alert.js
import React, { useEffect } from 'react'; // Import useEffect
import { useSelector, useDispatch } from 'react-redux'; // Import useDispatch
import { removeAlert } from '../../redux/slices/alertSlice'; // Import removeAlert action
import '../../styles/Alerts.scss'; // Assuming you have styles for positioning

const Alert = () => {
  // Select the alerts array from the Redux store
  const alerts = useSelector(state => state.alerts); // Ensure 'alerts' matches your root reducer key
  const dispatch = useDispatch(); // Get the dispatch function

  useEffect(() => {
    // For each alert currently in the state...
    alerts.forEach((alert) => {
      // Basic validation for alert object and timeout
      if (!alert || !alert.id || typeof alert.timeout !== 'number' || alert.timeout <= 0) {
        console.warn("Invalid alert object or timeout found:", alert);
        // Optionally remove invalid alerts immediately
        // if (alert && alert.id) dispatch(removeAlert(alert.id));
        return; // Skip setting timeout for invalid alerts
      }

      // ...set a timer using the timeout value from the alert object.
      const timer = setTimeout(() => {
        // After the timeout, dispatch the action to remove this specific alert.
        dispatch(removeAlert(alert.id));
      }, alert.timeout); // Use the timeout from the alert payload

      // Cleanup function: If the component unmounts or the alerts array changes
      // before the timer finishes, clear the timer to prevent errors.
      return () => clearTimeout(timer);
    });
    // This effect runs whenever the 'alerts' array in the Redux store changes.
  }, [alerts, dispatch]); // Dependencies: alerts array and dispatch function

  // No alerts? Render nothing.
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Render the alerts (usually positioned fixed/absolute at the top)
  return (
    // Use a container div for positioning via CSS
    <div className="alert-container">
      {alerts.map(alert => {
        // Gracefully handle potentially invalid alert objects (redundant check, but safe)
        if (!alert || !alert.id) {
           console.error("Invalid alert object found during render:", alert);
           return null; // Skip rendering this invalid alert
        }

        // Ensure the message is a string before rendering
        let displayMsg = alert.msg;
        if (typeof displayMsg === 'object' && displayMsg !== null) {
            // Try to extract a meaningful message, e.g., from a 'message' or 'error' key, or stringify as fallback
            displayMsg = displayMsg.message || displayMsg.error || JSON.stringify(displayMsg);
        }
        // Render the alert
        return (
          <div key={alert.id} className={`alert alert-${alert.alertType || 'info'}`}>
            <span>{displayMsg || 'No message provided'}</span>
            {/* Optional: Add a manual close button */}
            <button onClick={() => dispatch(removeAlert(alert.id))} className="alert-close-btn" aria-label="Close">&times;</button>
          </div>
        );
      })}
    </div>
  );
};

export default Alert;
