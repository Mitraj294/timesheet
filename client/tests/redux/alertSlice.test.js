import alertReducer, { setAlert, clearAlert } from '../../src/redux/slices/alertSlice';

describe('alertSlice reducer', () => {
  const initialState = [];

  it('should return the initial state', () => {
    expect(alertReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
