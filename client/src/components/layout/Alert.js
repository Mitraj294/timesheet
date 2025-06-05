import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeAlert } from '../../redux/slices/alertSlice';
import '../../styles/Alerts.scss';

const Alert = () => {
  const alerts = useSelector(state => state.alert);
  const dispatch = useDispatch();

  // Remove each alert after its timeout
  useEffect(() => {
    const timers = alerts.map(alert => {
      if (!alert || !alert.id || typeof alert.timeout !== 'number' || alert.timeout <= 0) return null;
      return setTimeout(() => dispatch(removeAlert(alert.id)), alert.timeout);
    });
    return () => {
      timers.forEach(timerId => { if (timerId) clearTimeout(timerId); });
    };
  }, [alerts, dispatch]);

  return (
    <div className="alert-container">
      {Array.isArray(alerts) && alerts.map(alert => {
        if (!alert || !alert.id) return null;
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
