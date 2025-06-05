// /home/digilab/timesheet/client/src/redux/slices/alertSlice.js
import { createSlice, nanoid } from '@reduxjs/toolkit';

// State is an array of alert objects
const initialState = [];

const alertSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    // Add a new alert
    setAlert: {
      reducer(state, action) {
        state.push(action.payload);
      },
      prepare(msg, alertType, timeout = 5000) {
        return {
          payload: {
            id: nanoid(),
            msg,
            alertType,
            timeout,
          },
        };
      },
    },
    // Remove alert by ID
    removeAlert(state, action) {
      return state.filter(alert => alert.id !== action.payload);
    },
  },
});

export const { setAlert, removeAlert } = alertSlice.actions;
export default alertSlice.reducer;

// Helper to auto-remove alert after timeout
export const setAlertWithTimeout = (msg, alertType = 'info', timeout = 5000) => (dispatch) => {
  const alertAction = setAlert(msg, alertType, timeout);
  const id = alertAction.payload.id;
  dispatch(alertAction);
  setTimeout(() => dispatch(removeAlert(id)), timeout);
};
