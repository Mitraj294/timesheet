import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faSpinner, faPaperPlane, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

import { forgotPassword, clearAuthError, selectAuthError, selectIsAuthLoading } from '../../redux/slices/authSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/Login.scss';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const authError = useSelector(selectAuthError);
    const isLoading = useSelector(selectIsAuthLoading);

    // Effects
    useEffect(() => {
        dispatch(clearAuthError());
        return () => {
            dispatch(clearAuthError());
        };
    }, [dispatch]);

    useEffect(() => {
        if (authError) {
            dispatch(setAlert(authError, 'danger'));
        }
    }, [authError, dispatch]);

    // Handlers
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            dispatch(setAlert('Please enter a valid email address.', 'warning'));
            return;
        }
        dispatch(clearAuthError()); // Clear previous errors
        try {
            await dispatch(forgotPassword({ email })).unwrap();
            dispatch(setAlert('Password reset email sent. Please check your inbox (and spam folder).', 'success'));
            setEmail(''); // Clear email field on success
        } catch (err) {
            console.error("Forgot password request failed:", err);
        }
    };

    // Render
    return (
        <div className="styles_LoginSignupContainer">
            <Alert />
            <div className="styles_Card">
                <div className="styles_Login_header">
                    {/* Optional: Add logo or icon */}
                    <h3>Forgot Password</h3>
                    <p style={{ fontSize: '0.9em', color: '#666', marginTop: '0.5rem' }}>
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="styles_LoginForm">
                    <div className="styles_InputGroup">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className="styles_Button" disabled={isLoading}>
                        {isLoading ? <><FontAwesomeIcon icon={faSpinner} spin /> Sending...</> : <><FontAwesomeIcon icon={faPaperPlane} /> Send Reset Link</>}
                    </button>
                </form>
                <div style={{ marginTop: '1rem' }}>
                    <Link to="/login" className="link-like-button"><FontAwesomeIcon icon={faArrowLeft} /> Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;