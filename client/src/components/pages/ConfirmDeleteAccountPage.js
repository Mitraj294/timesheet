// /home/digilab/timesheet/client/src/pages/ConfirmDeleteAccountPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTrashAlt, faSpinner, faExclamationCircle, 
  faKey, faEye, faEyeSlash 
} from '@fortawesome/free-solid-svg-icons';
import { 
  confirmAccountDeletion, logout, 
  selectIsAuthLoading, selectAuthError, clearAuthError 
} from '../../redux/slices/authSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/ConfirmDeleteAccountPage.scss';

const ConfirmDeleteAccountPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pageError, setPageError] = useState('');

  const isLoading = useSelector(selectIsAuthLoading);
  const authError = useSelector(selectAuthError);

  useEffect(() => {
    console.log("[ConfirmDeleteAccountPage] Mounted. Token:", token);
    dispatch(clearAuthError());
    if (!token) {
      setPageError('Deletion token not found. This link may be invalid or expired.');
      dispatch(setAlert('Invalid or missing deletion token.', 'danger'));
      console.warn("[ConfirmDeleteAccountPage] No token found in URL params.");
    }
    return () => {
      dispatch(clearAuthError());
      console.log("[ConfirmDeleteAccountPage] Unmounted.");
    };
  }, [dispatch, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPageError('');
    dispatch(clearAuthError());

    if (!password) {
      setPageError('Password is required to confirm account deletion.');
      dispatch(setAlert('Password is required.', 'warning'));
      console.warn("[ConfirmDeleteAccountPage] Tried to submit without password.");
      return;
    }
    if (!token) {
      setPageError('Deletion token is missing. Cannot proceed.');
      dispatch(setAlert('Deletion token is missing.', 'danger'));
      console.warn("[ConfirmDeleteAccountPage] Tried to submit without token.");
      return;
    }

    try {
      console.log("[ConfirmDeleteAccountPage] Submitting account deletion with token:", token);
      await dispatch(confirmAccountDeletion({ token, password })).unwrap();
      dispatch(setAlert('Your account has been successfully deleted.', 'success', 7000));
      dispatch(logout());
      console.log("[ConfirmDeleteAccountPage] Account deleted, logging out and redirecting.");
      navigate('/login', { replace: true, state: { accountDeleted: true } });
    } catch (err) {
      // Error handled by Alert via Redux
      console.error('[ConfirmDeleteAccountPage] Failed to delete account:', err);
    }
  };

  // Show message if token is missing
  if (!token && !pageError) {
    console.warn("[ConfirmDeleteAccountPage] Rendering error page due to missing token.");
    return (
      <div className="confirm-delete-container error-page">
        <Alert />
        <FontAwesomeIcon icon={faExclamationCircle} size="3x" />
        <h2>Invalid Link</h2>
        <p>The account deletion link is invalid or missing a token.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            console.log("[ConfirmDeleteAccountPage] Navigating to login from error page.");
            navigate('/login');
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="confirm-delete-container">
      <Alert />
      <div className="confirm-delete-box">
        <FontAwesomeIcon icon={faTrashAlt} size="2x" className="icon" />
        <h2>Confirm Account Deletion</h2>
        <p>
          To permanently delete your account, enter your password.
          <strong> This action cannot be undone.</strong>
        </p>
        {/* Show page-specific error if no Redux error */}
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
                onChange={e => {
                  setPassword(e.target.value);
                  console.log("[ConfirmDeleteAccountPage] Password input changed.");
                }}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button 
                type="button"
                onClick={() => {
                  setShowPassword(!showPassword);
                  console.log("[ConfirmDeleteAccountPage] Toggled showPassword:", !showPassword);
                }}
                className="password-toggle"
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>
          <button 
            type="submit"
            className="btn btn-danger btn-block"
            disabled={isLoading || !password || !token}
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin /> Deleting Account...
              </>
            ) : 'Delete My Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConfirmDeleteAccountPage;
