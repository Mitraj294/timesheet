import scheduleReducer, { setSchedule, clearSchedule } from '../../src/redux/slices/scheduleSlice';

describe('scheduleSlice reducer', () => {
  // Updated initialState to match the actual reducer's initialState
  const initialState = {
    items: [],
    status: 'idle',
    error: null,
  };

  it('should return the initial state', () => {
    expect(scheduleReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
