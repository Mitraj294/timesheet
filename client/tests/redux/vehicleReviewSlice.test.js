import vehicleReviewReducer, { setVehicleReview, clearVehicleReview } from '../../src/redux/slices/vehicleReviewSlice';

describe('vehicleReviewSlice reducer', () => {
  // Updated initialState to match the actual reducer's initialState
  const initialState = {
    items: [],
    currentReview: null,
    status: 'idle',
    error: null,
    currentStatus: 'idle',
    currentError: null,
    operationStatus: 'idle',
    operationError: null,
    reportStatus: 'idle',
    reportError: null,
  };

  it('should return the initial state', () => {
    expect(vehicleReviewReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
