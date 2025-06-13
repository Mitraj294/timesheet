import authReducer, { logout, setAuth, setAuthError, clearAuthError } from '../../src/redux/slices/authSlice';

describe('authSlice reducer', () => {
  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isTabletViewUnlocked: false,
    prospectiveEmployeeCheck: { status: 'idle', error: null, result: null },
    employerCheckUser: { status: 'idle', error: null, result: null },
    companyInvitationRequest: { status: 'idle', error: null, message: null }
  };

  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: undefined })).toMatchObject(expect.objectContaining({
      user: null,
      isAuthenticated: expect.any(Boolean),
    }));
  });

  it('should handle setAuth', () => {
    const user = { id: '1', name: 'Test' };
    const token = 'abc';
    const state = authReducer(initialState, setAuth({ user, token }));
    expect(state.user).toEqual(user);
    expect(state.token).toBe(token);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should handle logout', () => {
    const state = authReducer({ ...initialState, user: { id: 1 }, token: 'abc', isAuthenticated: true }, logout());
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should handle setAuthError and clearAuthError', () => {
    let state = authReducer(initialState, setAuthError('err'));
    expect(state.error).toBe('err');
    state = authReducer(state, clearAuthError());
    expect(state.error).toBeNull();
  });
});
