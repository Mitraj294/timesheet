import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {  faSpinner, faSave, faArrowLeft, faExclamationCircle, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { resetPassword, clearAuthError, selectAuthError, selectIsAuthLoading } from '../../redux/slices/authSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/Login.scss';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authError = useSelector(selectAuthError);
  const isLoading = useSelector(selectIsAuthLoading);

  // Clear errors on mount/unmount
  useEffect(() => {
    dispatch(clearAuthError());
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  // Show error as alert
  useEffect(() => {
    const errorToShow = localError || authError;
    if (errorToShow) {
      // Error handling logic
    }
  }, [localError, authError, dispatch]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    dispatch(clearAuthError());
    if (!password || !confirmPassword) {
      setLocalError('Both password fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    try {
      await dispatch(resetPassword({ token, newPassword: password })).unwrap();
      setSuccessMessage('Password has been reset successfully. Please log in.');
      setTimeout(() => {
        dispatch(setAlert('Password has been reset successfully. Please log in.', 'success'));
        navigate('/login');
      }, 1200); // Delay navigation so Cypress can see the message
    } catch (err) {
      setLocalError('Reset failed. Invalid or expired token.');
      // Error is handled by Redux and alert
    }
  };

  return (
    <div className="styles_LoginSignupContainer">
      <Alert />
      <div className="styles_Card">
        <div className="styles_Login_header">
          <h3>Reset Your Password</h3>
        </div>
        <form onSubmit={handleSubmit} className="styles_LoginForm" data-cy="reset-password-form">
          {localError && (
            <div className='form-error-message' data-cy="reset-error-message" style={{textAlign: 'center', marginBottom: '1rem'}}>
              <FontAwesomeIcon icon={faExclamationCircle} /> {localError}
            </div>
          )}
          {successMessage && (
            <div className='form-success-message' data-cy="reset-success-message" style={{textAlign: 'center', marginBottom: '1rem', color: 'green'}}>
              {successMessage}
            </div>
          )}
          <div className="styles_InputGroup">
            <label htmlFor="password">New Password</label>
            <div className="styles_PasswordInputContainer">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                required
                disabled={isLoading}
                data-cy="reset-password-input"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="styles_PasswordToggleBtn" disabled={isLoading}>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="styles_InputIcon styles_InputIconRight" />
              </button>
            </div>
          </div>
          <div className="styles_InputGroup">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="styles_PasswordInputContainer">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                disabled={isLoading}
                data-cy="reset-confirm-password-input"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="styles_PasswordToggleBtn" disabled={isLoading}>
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="styles_InputIcon styles_InputIconRight" />
              </button>
            </div>
          </div>
          <button type="submit" className="styles_Button" disabled={isLoading} data-cy="reset-submit-btn">
            {isLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Resetting...</> : <><FontAwesomeIcon icon={faSave} /> Reset Password</>}
          </button>
        </form>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link to="/login" className="link-like-button"><FontAwesomeIcon icon={faArrowLeft} /> Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;