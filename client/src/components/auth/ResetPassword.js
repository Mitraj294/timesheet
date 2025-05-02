import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faSpinner, faSave, faArrowLeft, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

import { resetPassword, clearAuthError, selectAuthError, selectIsAuthLoading } from '../../redux/slices/authSlice'; // Assuming resetPassword exists
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/Login.scss'; // Re-use login styles

const ResetPassword = () => {
    const { token } = useParams(); // Get token from URL
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const authError = useSelector(selectAuthError);
    const isLoading = useSelector(selectIsAuthLoading); // Use general loading or create specific one

    // Clear errors on mount/unmount
    useEffect(() => {
        dispatch(clearAuthError());
        return () => {
            dispatch(clearAuthError());
        };
    }, [dispatch]);

    // Show error alerts (API or local validation)
    useEffect(() => {
        const errorToShow = localError || authError;
        if (errorToShow) {
            dispatch(setAlert(errorToShow, 'danger'));
        }
    }, [localError, authError, dispatch]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null); // Clear local error
        dispatch(clearAuthError()); // Clear API error

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
            // Dispatch the action to reset the password
            await dispatch(resetPassword({ token, newPassword: password })).unwrap();
            dispatch(setAlert('Password has been reset successfully. Please log in.', 'success'));
            navigate('/login'); // Redirect to login page on success
        } catch (err) {
            // Error is handled by the useEffect watching authError
            console.error("Reset password failed:", err);
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
                    {/* Display local validation error */}
                    {localError && (
                        <div className='form-error-message' style={{textAlign: 'center', marginBottom: '1rem'}}>
                            <FontAwesomeIcon icon={faExclamationCircle} /> {localError}
                        </div>
                    )}
                    <div className="styles_InputGroup">
                        <label htmlFor="password">New Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="styles_InputGroup">
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className="styles_Button" disabled={isLoading}>
                        {isLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Resetting...</> : <><FontAwesomeIcon icon={faSave} /> Reset Password</>}
                    </button>
                </form>
                 <div style={{ marginTop: '1rem' }}>
                    <Link to="/login" className="link-like-button"><FontAwesomeIcon icon={faArrowLeft} /> Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;