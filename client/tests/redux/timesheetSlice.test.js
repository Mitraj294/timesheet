import timesheetReducer, { setTimesheet, clearTimesheet } from '../../src/redux/slices/timesheetSlice';

describe('timesheetSlice reducer', () => {
  const initialState = {
    timesheets: [],
    totalHours: 0,
    avgHours: 0,
    status: 'idle',
    error: null,
    downloadStatus: 'idle',
    downloadError: null,
    projectDownloadStatus: 'idle',
    projectDownloadError: null,
    sendStatus: 'idle',
    sendError: null,
    projectSendStatus: 'idle',
    projectSendError: null,
    checkStatus: 'idle',
    checkError: null,
    checkResult: null,
    createStatus: 'idle',
    createError: null,
    updateStatus: 'idle',
    updateError: null,
    currentTimesheet: null,
    currentTimesheetStatus: 'idle',
    currentTimesheetError: null,
    incompleteTimesheets: [],
    incompleteStatus: 'idle',
    incompleteError: null,
  };

  it('should return the initial state', () => {
    expect(timesheetReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
