import clientReducer, { setClient, clearClient } from '../../src/redux/slices/clientSlice';

describe('clientSlice reducer', () => {
  // Updated initialState to match the actual reducer's initialState
  const initialState = {
    clients: [],
    status: 'idle',
    error: null,
    deleteStatus: 'idle',
    downloadStatus: 'idle',
    downloadError: null,
    currentClient: null,
    currentClientStatus: 'idle',
    currentClientError: null,
  };

  it('should return the initial state', () => {
    expect(clientReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
