import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faSpinner, faSave, faArrowLeft, faExclamationCircle, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
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
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authError = useSelector(selectAuthError);
  const isLoading = useSelector(selectIsAuthLoading);

  // Clear errors on mount/unmount
  useEffect(() => {
    dispatch(clearAuthError());
    return () => { dispatch(clearAuthError()); };
  }, [dispatch]);

  // Show error as alert
  useEffect(() => {
    const errorToShow = localError || authError;
    if (errorToShow) dispatch(setAlert(errorToShow, 'danger'));
  }, [localError, authError, dispatch]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
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
      dispatch(setAlert('Password has been reset successfully. Please log in.', 'success'));
      navigate('/login');
    } catch (err) {
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
        <form onSubmit={handleSubmit} className="styles_LoginForm">
          {localError && (
            <div className='form-error-message' style={{textAlign: 'center', marginBottom: '1rem'}}>
              <FontAwesomeIcon icon={faExclamationCircle} /> {localError}
            </div>
          )}
          <div className="styles_InputGroup">
            <label htmlFor="password">New Password</label>
            <div className="styles_PasswordInputContainer">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                required
                disabled={isLoading}
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
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                disabled={isLoading}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="styles_PasswordToggleBtn" disabled={isLoading}>
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="styles_InputIcon styles_InputIconRight" />
              </button>
            </div>
          </div>
          <button type="submit" className="styles_Button" disabled={isLoading}>
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