// /home/digilab/timesheet/client/src/components/pages/SettingsPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCog, faLock, faSpinner, faSave, faEdit, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

import { selectAuthUser, changePassword, selectAuthError, selectIsAuthLoading, clearAuthError } from '../../redux/slices/authSlice';
import { selectEmployeeByUserId, fetchEmployees, selectEmployeeStatus } from '../../redux/slices/employeeSlice'; // Assuming you have a selector like this
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/Forms.scss'; // Re-use forms styling
import '../../styles/SettingsPage.scss'; // Add specific styles

const SettingsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // --- Redux State ---
    const user = useSelector(selectAuthUser);
    const authError = useSelector(selectAuthError);
    const authLoading = useSelector(selectIsAuthLoading);
    const employee = useSelector((state) => user ? selectEmployeeByUserId(state, user.id || user._id) : null); // Find linked employee
    const employeeStatus = useSelector(selectEmployeeStatus);

    // --- Local State ---
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState(null); // Local validation error

    // Fetch employees if needed to find the linked one
    useEffect(() => {
        if (user?.role === 'employee' && !employee && employeeStatus === 'idle') {
            dispatch(fetchEmployees());
        }
    }, [dispatch, user, employee, employeeStatus]);

    // Clear auth error on component mount/unmount
    useEffect(() => {
        dispatch(clearAuthError());
        return () => { dispatch(clearAuthError()); };
    }, [dispatch]);

    // --- Handlers ---
    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
        if (passwordError) setPasswordError(null); // Clear local error on change
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        dispatch(clearAuthError()); // Clear previous API errors

        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setPasswordError('All password fields are required.');
            dispatch(setAlert('All password fields are required.', 'warning'));
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New password and confirmation do not match.');
            dispatch(setAlert('New password and confirmation do not match.', 'warning'));
            return;
        }
        if (passwordData.newPassword.length < 6) { // Example validation
            setPasswordError('New password must be at least 6 characters long.');
            dispatch(setAlert('New password must be at least 6 characters long.', 'warning'));
            return;
        }

        setIsSubmittingPassword(true);
        try {
            await dispatch(changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            })).unwrap();

            dispatch(setAlert('Password changed successfully!', 'success'));
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); // Clear form
        } catch (err) {
            // Error alert is handled by the authSlice/useEffect watching authError
            console.error("Password change failed:", err);
            // Optionally set local error too: setPasswordError(err || 'Failed to change password.');
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    // --- Derived Data ---
    const isLoading = authLoading || (employeeStatus === 'loading' && !employee);

    // --- Render ---
    if (isLoading && !user) {
        return (
            <div className='vehicles-page'>
                <div className='loading-indicator'>
                    <FontAwesomeIcon icon={faSpinner} spin size='2x' />
                    <p>Loading Settings...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className='vehicles-page'>
                <Alert />
                <div className='error-message'>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    <p>User not found. Please log in.</p>
                    <Link to="/login" className="btn btn-primary">Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="vehicles-page settings-page"> {/* Use standard page class + specific */}
            <Alert />
            <div className="vehicles-header"> {/* Use standard header */}
                <div className="title-breadcrumbs">
                    <h2><FontAwesomeIcon icon={faUserCog} /> Settings</h2>
                    <div className="breadcrumbs">
                        <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
                        <span className="breadcrumb-separator"> / </span>
                        <span className="breadcrumb-current">Settings</span>
                    </div>
                </div>
                {/* No header actions needed usually */}
            </div>

            {/* Account Information Section */}
            <div className="settings-section form-container">
                <h3>Account Information</h3>
                <div className="account-info-grid">
                    <div className="info-item"><span className="info-label">Name:</span> <span className="info-value">{user.name}</span></div>
                    <div className="info-item"><span className="info-label">Email:</span> <span className="info-value">{user.email}</span></div>
                    <div className="info-item"><span className="info-label">Role:</span> <span className="info-value">{user.role}</span></div>
                    {/* Display Employee specific info if available */}
                    {employee && (
                        <>
                            <div className="info-item"><span className="info-label">Employee Code:</span> <span className="info-value">{employee.employeeCode || 'N/A'}</span></div>
                            <div className="info-item"><span className="info-label">Wage:</span> <span className="info-value">{employee.wage ? `$${employee.wage.toFixed(2)}/hr` : 'N/A'}</span></div>
                            <div className="info-item"><span className="info-label">Expected Hours:</span> <span className="info-value">{employee.expectedHours || 'N/A'} hrs/week</span></div>
                            {/* Add more employee fields as needed */}
                        </>
                    )}
                </div>
                <div className="form-footer">
                    {/* Navigate to a dedicated edit page or implement inline editing */}
                    <button
                        className="btn btn-warning"
                        onClick={() => navigate(user.role === 'employee' && employee ? `/employees/edit/${employee._id}` : '/settings/edit-account')} // Example navigation
                        disabled={isLoading}
                    >
                        <FontAwesomeIcon icon={faEdit} /> Edit Information
                    </button>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="settings-section form-container">
                <h3>Change Password</h3>
                <form onSubmit={handlePasswordSubmit} className="employee-form" noValidate>
                    {/* Display local validation error or Redux API error */}
                    {(passwordError || authError) && (
                        <div className='form-error-message'>
                            <FontAwesomeIcon icon={faExclamationCircle} /> {passwordError || authError}
                        </div>
                    )}
                    <div className="form-group">
                        <label htmlFor="currentPassword">Current Password*</label>
                        <input
                            id="currentPassword"
                            type="password"
                            name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                            required
                            disabled={isSubmittingPassword}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPassword">New Password*</label>
                        <input
                            id="newPassword"
                            type="password"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            required
                            minLength="6"
                            disabled={isSubmittingPassword}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password*</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            required
                            minLength="6"
                            disabled={isSubmittingPassword}
                        />
                    </div>
                    <div className="form-footer">
                        <button type="submit" className="btn btn-success" disabled={isSubmittingPassword}>
                            {isSubmittingPassword ? (
                                <><FontAwesomeIcon icon={faSpinner} spin /> Updating...</>
                            ) : (
                                <><FontAwesomeIcon icon={faSave} /> Change Password</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
