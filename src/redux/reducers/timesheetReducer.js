// timesheetReducer.js (if you're using this)
import { GET_TIMESHEETS, TIMESHEET_ERROR } from "../actions/types";


const initialState = {
  timesheets: [],
  totalHours: 0,
  avgHours: 0,
  avgLunchBreak: 0,
  totalExpectedHours: 0,
  avgExpectedHours: 0,
  error: null,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case GET_TIMESHEETS:
      return {
        ...state,
        timesheets: action.payload.timesheets || [],
        totalHours: action.payload.totalHours,
        avgHours: action.payload.avgHours,
        avgLunchBreak: action.payload.avgLunchBreak,
        totalExpectedHours: action.payload.totalExpectedHours,
        avgExpectedHours: action.payload.avgExpectedHours,
      };
    case TIMESHEET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
      case 'FETCH_TIMESHEETS_REQUEST':
      return {
        ...state,
        loading: true,
      };
    case 'FETCH_TIMESHEETS_SUCCESS':
      return {
        ...state,
        loading: false,
        data: action.payload, // Assume payload is an array of timesheets
      };
    case 'FETCH_TIMESHEETS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
}
