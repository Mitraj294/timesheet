// /home/digilab/timesheet/client/src/pages/ConfirmDeleteAccountPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faSpinner, faExclamationCircle, faKey, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'; // Keep this line
import { confirmAccountDeletion, logout, selectIsAuthLoading, selectAuthError, clearAuthError } from '../../redux/slices/authSlice'; // Corrected path
import { setAlert } from '../../redux/slices/alertSlice'; // Corrected path
import Alert from '../layout/Alert'; // Corrected path
import '../../styles/ConfirmDeleteAccountPage.scss';
const ConfirmDeleteAccountPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pageError, setPageError] = useState(''); // For errors specific to this page's logic

  const isLoading = useSelector(selectIsAuthLoading);
  const authError = useSelector(selectAuthError); // Errors from the authSlice thunk

  useEffect(() => {
    dispatch(clearAuthError()); // Clear any previous auth errors when the page loads
    if (!token) {
      setPageError('Deletion token not found. This link may be invalid or expired.');
      dispatch(setAlert('Invalid or missing deletion token.', 'danger'));
    }
    // Cleanup auth error on unmount
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch, token]);

  // The handleSubmit function is implemented below and is original to this project.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setPageError(''); // Clear local page error
    dispatch(clearAuthError()); // Clear Redux auth error

    if (!password) {
      setPageError('Password is required to confirm account deletion.');
      dispatch(setAlert('Password is required.', 'warning'));
      return;
    }
    if (!token) {
        setPageError('Deletion token is missing. Cannot proceed.');
        dispatch(setAlert('Deletion token is missing.', 'danger'));
        return;
    }

    try {
      await dispatch(confirmAccountDeletion({ token, password })).unwrap();
      dispatch(setAlert('Your account has been successfully deleted.', 'success', 7000));
      dispatch(logout()); // Log the user out from Redux state
      navigate('/login', { replace: true, state: { accountDeleted: true } }); // Redirect to login
    } catch (err) {
      // The error from `confirmAccountDeletion` thunk (via rejectWithValue)
      // will be in `authError` selector and should be displayed by the Alert component.
      // We can also log it or set a page-specific error if needed.
      console.error('Failed to delete account on confirmation page:', err);
      // `authError` will be updated by the thunk, so Alert component should pick it up.
    }
  };

  // Display a specific message if the token is missing from the URL
  if (!token && !pageError) {
    return (
      <div className="confirm-delete-container error-page">
        <Alert />
        <FontAwesomeIcon icon={faExclamationCircle} size="3x" />
        <h2>Invalid Link</h2>
        <p>The account deletion link is invalid or missing a token.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/login')}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="confirm-delete-container">
      {/* To display alerts from Redux (including authError) */}
      <Alert />
      <div className="confirm-delete-box">
        <FontAwesomeIcon icon={faTrashAlt} size="2x" className="icon" />
        <h2>Confirm Account Deletion</h2>
        <p>
          To permanently delete your account, please enter your password.
          <strong> This action cannot be undone.</strong>
        </p>
        {/* Show local page error if no authError from Redux */}
        {pageError && !authError && (
            <div className='form-error-message page-specific-error'>
                <FontAwesomeIcon icon={faExclamationCircle} /> {pageError}
            </div>
        )}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <FontAwesomeIcon icon={faKey} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="password-toggle" 
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>
          {/* authError from Redux thunk will be displayed by the global Alert component */}
          <button 
            type="submit" 
            className="btn btn-danger btn-block" 
            disabled={isLoading || !password || !token}
          >
            {isLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting Account...</> : 'Delete My Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConfirmDeleteAccountPage;
