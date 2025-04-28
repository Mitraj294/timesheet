import React from 'react';
import { useSelector } from 'react-redux';

const Alert = () => {
  const alerts = useSelector(state => state.alerts);

  // console.log('Alerts data received:', alerts); // Keep for debugging if needed

  // No alerts? Render nothing.
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Use React.Fragment if the outer div isn't needed for styling
  return (
    <React.Fragment>
      {alerts.map(alert => {
        // console.log('Processing alert:', alert); // Keep for debugging if needed

        // Gracefully handle potentially invalid alert objects
        if (!alert || !alert.id) {
           console.error("Invalid alert object found:", alert);
           return null; // Skip rendering this invalid alert
        }

        // Render the alert
        return (
          <div key={alert.id} className={`alert alert-${alert.alertType || 'info'}`}>
            {alert.msg || 'No message provided'}
          </div>
        );
      })}
    </React.Fragment>
  );
};

export default Alert;

