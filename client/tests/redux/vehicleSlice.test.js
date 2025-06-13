import vehicleReducer, { setVehicle, clearVehicle } from '../../src/redux/slices/vehicleSlice';

const initialState = {
  items: [],
  currentVehicle: null,
  status: 'idle',
  error: null,
  currentStatus: 'idle',
  currentError: null,
  operationStatus: 'idle',
  operationError: null,
  reportStatus: 'idle',
  reportError: null,
};

describe('vehicleSlice reducer', () => {
  it('should return the initial state', () => {
    expect(vehicleReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
