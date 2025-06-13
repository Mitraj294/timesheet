import projectReducer, { setProject, clearProject } from '../../src/redux/slices/projectSlice';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
  currentProject: null,
  currentProjectStatus: 'idle',
  currentProjectError: null,
};

describe('projectSlice reducer', () => {
  it('should return the initial state', () => {
    expect(projectReducer(undefined, { type: undefined })).toEqual(initialState);
  });
});
