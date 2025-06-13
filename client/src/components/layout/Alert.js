import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { removeAlert } from '../../redux/slices/alertSlice';
import '../../styles/Alerts.scss';

const Alert = () => {
  const alerts = useSelector(state => state.alert);
  const dispatch = useDispatch();
  // Use a ref to store alert IDs that have timers set
  const timeoutIds = useRef(new Set());

  useEffect(() => {
    if (Array.isArray(alerts)) {
      alerts.forEach(alert => {
        if (alert && alert.id && !timeoutIds.current.has(alert.id)) {
          timeoutIds.current.add(alert.id);
          setTimeout(() => {
            dispatch(removeAlert(alert.id));
            timeoutIds.current.delete(alert.id);
          }, 3500);
        }
      });
    }
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
            <button 
              onClick={() => {
                dispatch(removeAlert(alert.id));
                timeoutIds.current.delete(alert.id);
              }} 
              className="alert-close-btn" 
              aria-label="Close"
            >&times;</button>
          </div>
        );
      })}
    </div>
  );
};

export default Alert;
