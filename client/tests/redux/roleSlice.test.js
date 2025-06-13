import roleReducer from '../../src/redux/slices/roleSlice';

describe('roleSlice reducer', () => {
  // Updated initialState to match the actual reducer's initialState
  const initialState = {
    items: [],
    status: 'idle',
    error: null,
    currentRole: null,
    currentRoleStatus: 'idle',
    currentRoleError: null,
  };

  it('should return the initial state', () => {
    expect(roleReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
