// /home/digilab/timesheet/client/src/redux/slices/alertSlice.js
import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = [];

const alertSlice = createSlice({
  name: 'alerts', // The name of the slice in the Redux state
  initialState,
  reducers: {
    // Action creator for setting an alert.
    // We use prepare to ensure each alert gets a unique ID if one isn't provided.
    setAlert: {
      reducer(state, action) {
        // Immer allows us to "mutate" the state directly here
        state.push(action.payload);
      },
      prepare(msg, alertType, timeout = 5000) {
        // This function formats the payload before it reaches the reducer
        return {
          payload: {
            id: nanoid(), // Generate a unique ID
            msg,
            alertType,
            timeout, // You might use this timeout value in your component or middleware
          },
        };
      },
    },
    // Action creator for removing an alert
    removeAlert(state, action) {
      // action.payload here is expected to be the id of the alert to remove
      const idToRemove = action.payload;
      // Filter returns a new array, which is also fine with Immer
      return state.filter(alert => alert.id !== idToRemove);
    },
  },
});

// Export the generated action creators
export const { setAlert, removeAlert } = alertSlice.actions;

// Export the reducer function
export default alertSlice.reducer;

// Optional: Thunk action creator to handle automatic removal after timeout
export const setAlertWithTimeout = (msg, alertType = 'info', timeout = 5000) => (dispatch) => {
    // Use the prepared action creator from the slice
    const alertAction = setAlert(msg, alertType, timeout);
    // Get the generated ID from the payload
    const id = alertAction.payload.id;
    // Dispatch the action to add the alert
    dispatch(alertAction);

    // Set a timeout to dispatch the removeAlert action
    setTimeout(() => dispatch(removeAlert(id)), timeout);
};
