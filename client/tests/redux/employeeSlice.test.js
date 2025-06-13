import employeeReducer, { setEmployee, clearEmployee } from '../../src/redux/slices/employeeSlice';

describe('employeeSlice reducer', () => {
  // Updated initialState to match the actual reducer's initialState
  const initialState = {
    employees: [],
    status: 'idle',
    error: null,
    updateNotificationStatus: 'idle',
  };

  it('should return the initial state', () => {
    expect(employeeReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
