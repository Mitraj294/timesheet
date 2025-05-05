// /home/digilab/timesheet/client/src/components/pages/SettingsPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
 faUserCog, faLock, faSpinner, faSave, faEdit, faExclamationCircle, faTrashAlt, faTimes,
 faEye, faEyeSlash, faPhone, faGlobe // Added password toggle icons and phone/globe
} from '@fortawesome/free-solid-svg-icons'; // Added faTrashAlt

import { selectAuthUser, changePassword, deleteAccount, logout, updateUserProfile, selectAuthError, selectIsAuthLoading, clearAuthError } from '../../redux/slices/authSlice';
import { selectEmployeeByUserId, fetchEmployees, selectEmployeeStatus } from '../../redux/slices/employeeSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/Forms.scss'; // Re-use forms styling
import '../../styles/SettingsPage.scss'; // Add specific styles
import { parsePhoneNumberFromString, isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js'; // Import validation and country list functions

const SettingsPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // --- Redux State ---
    const user = useSelector(selectAuthUser);
    const authError = useSelector(selectAuthError);
    const authLoading = useSelector(selectIsAuthLoading);
    const employee = useSelector((state) => user ? selectEmployeeByUserId(state, user.id || user._id) : null);
    const employeeStatus = useSelector(selectEmployeeStatus);

    // --- Local State ---
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState(null);
    // Password visibility states
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // --- State for Editing Info ---
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [infoFormData, setInfoFormData] = useState({
        name: '',
        email: '',
        country: '',
        phoneNumber: '',
        companyName: '' });
    const [infoError, setInfoError] = useState(null);
    const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
    const [countryCode, setCountryCode] = useState('IN'); // Default country code set to India


    // Fetch employees if needed
    useEffect(() => {
        if (user?.role === 'employee' && !employee && employeeStatus === 'idle') {
            dispatch(fetchEmployees());
        }
    }, [dispatch, user, employee, employeeStatus]);

    // Clear auth error on mount/unmount
    useEffect(() => {
        dispatch(clearAuthError());
        return () => { dispatch(clearAuthError()); };
    }, [dispatch]);


    // Pre-fill info form data when user loads and auth is not loading
    useEffect(() => {
        if (user && !authLoading) {
            const validCountries = getCountries();
            const initialCountryCode = user.country && validCountries.includes(user.country.toUpperCase())
                ? user.country.toUpperCase()
                : 'IN'; // Default to IN

            setInfoFormData({
                name: user.name || '',
                email: user.email || '',
                country: user.country || '',
                phoneNumber: user.phoneNumber || '',
                companyName: user.companyName || '' });
            setCountryCode(initialCountryCode);
        }
    }, [user, authLoading]); // Add authLoading dependency


    // --- Handlers ---
    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
        if (passwordError) setPasswordError(null);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        dispatch(clearAuthError());

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
        if (passwordData.newPassword.length < 6) {
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

            const userEmail = user?.email;
            if (userEmail) {
                navigate('/login', { state: { email: userEmail, passwordChanged: true } });
            }
        } catch (err) {
            console.error("Password change failed:", err);
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    const handleInfoEditToggle = () => {
        if (!isEditingInfo && user) {
            // Pre-fill form when opening
            setInfoFormData({
                name: user.name || '',
                email: user.email || '',
                country: user.country || '',
                phoneNumber: user.phoneNumber || '',
                companyName: user.companyName || ''
            });
            const validCountries = getCountries();
            const initialCountryCode = user.country && validCountries.includes(user.country.toUpperCase())
                ? user.country.toUpperCase()
                : 'IN'; // Default to IN
            setCountryCode(initialCountryCode);
            setInfoError(null);
            dispatch(clearAuthError());
        }
        setIsEditingInfo(!isEditingInfo);
    };

    const handleInfoChange = (e) => {
        setInfoFormData({ ...infoFormData, [e.target.name]: e.target.value });
        if (infoError) setInfoError(null);
    };

    const handleInfoSubmit = async (e) => {
        e.preventDefault();
        setInfoError(null);
        dispatch(clearAuthError());

        if (!infoFormData.name || !infoFormData.email) {
            setInfoError('Name and Email are required.');
            dispatch(setAlert('Name and Email are required.', 'warning'));
            return;
        }
        if (!/\S+@\S+\.\S+/.test(infoFormData.email)) {
             setInfoError('Please enter a valid email address.');
             dispatch(setAlert('Please enter a valid email address.', 'warning'));
             return;
        }
        if (infoFormData.phoneNumber) {
            try {
                if (!isValidPhoneNumber(infoFormData.phoneNumber, countryCode)) {
                    setInfoError(`Please enter a valid phone number for the selected country (${countryCode}).`);
                    dispatch(setAlert(`Please enter a valid phone number for the selected country (${countryCode}).`, 'warning'));
                    return;
                }
            } catch (e) {
                setInfoError("Invalid phone number format.");
                dispatch(setAlert("Invalid phone number format.", 'warning'));
                return;
            }
        }

        setIsSubmittingInfo(true);
        const dataToSubmit = { ...infoFormData };
        if (user?.role !== 'employer') delete dataToSubmit.companyName;

        // Format phone number before sending
        let formattedPhoneNumber = dataToSubmit.phoneNumber;
        if (dataToSubmit.phoneNumber) {
            try {
                const phoneNumberParsed = parsePhoneNumberFromString(dataToSubmit.phoneNumber, countryCode);
                if (phoneNumberParsed) formattedPhoneNumber = phoneNumberParsed.format('E.164');
            } catch (e) { console.warn("Could not format phone number to E.164", e); }
        }
        dataToSubmit.phoneNumber = formattedPhoneNumber;

        try {
            await dispatch(updateUserProfile(dataToSubmit)).unwrap();
            dispatch(setAlert('Profile updated successfully!', 'success'));
            setIsEditingInfo(false);
        } catch (err) {
            console.error("Profile update failed:", err);
        } finally {
            setIsSubmittingInfo(false);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    const confirmDelete = async () => {
        setIsDeletingAccount(true);
        dispatch(clearAuthError());
        try {
            await dispatch(deleteAccount()).unwrap();
            dispatch(setAlert('Account deleted successfully.', 'success'));
            dispatch(logout());
            navigate('/login');
        } catch (err) {
            console.error("Account deletion failed:", err);
        } finally {
            setIsDeletingAccount(false);
            setShowDeleteConfirm(false);
        }
    };

    // --- Derived Data ---
    const countryOptions = useMemo(() => {
        const countries = getCountries();
        return countries.map(country => ({
        value: country,
        label: `+${getCountryCallingCode(country)} (${country})`
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, []);
    const isLoading = authLoading || isSubmittingInfo || isSubmittingPassword || (employeeStatus === 'loading' && !employee);

    // --- Render --- //
    // Updated loading check
    if (isLoading || (user && typeof user.country === 'undefined')) {
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
        // Use standard page class + specific settings class
        <div className="vehicles-page settings-page">
            <Alert />
            {/* Use standard header structure if applicable */}
            <div className="vehicles-header">
                <div className="title-breadcrumbs">
                    <h2><FontAwesomeIcon icon={faUserCog} /> Settings</h2>
                    <div className="breadcrumbs">
                        <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
                        <span className="breadcrumb-separator"> / </span>
                        <span className="breadcrumb-current">Settings</span>
                    </div>
                </div>
            </div>

            {/* Account Information Section */}
            {/* Apply settings-section and form-container classes */}
            <div className="settings-section form-container">
                <h3>Account Information</h3>
                {!isEditingInfo ? (
                    <>
                        {/* Apply account-info-grid and related classes */}
                        <div className="account-info-grid">
                            <div className="info-item"><span className="info-label">Name:</span> <span className="info-value">{user.name}</span></div>
                            <div className="info-item"><span className="info-label">Email:</span> <span className="info-value">{user.email}</span></div>
                            <div className="info-item"><span className="info-label">Role:</span> <span className="info-value">{user.role}</span></div>
                            <div className="info-item"><span className="info-label">Country:</span> <span className="info-value">{user.country || 'N/A'}</span></div>
                            <div className="info-item"><span className="info-label">Phone:</span> <span className="info-value">{user.phoneNumber || 'N/A'}</span></div>
                            {user.role === 'employer' && <div className="info-item"><span className="info-label">Company:</span> <span className="info-value">{user.companyName || 'N/A'}</span></div>}
                            {employee && (
                                <>
                                    <div className="info-item"><span className="info-label">Employee Code:</span> <span className="info-value">{employee.employeeCode || 'N/A'}</span></div>
                                    <div className="info-item"><span className="info-label">Wage:</span> <span className="info-value">{employee.wage ? `$${employee.wage.toFixed(2)}/hr` : 'N/A'}</span></div>
                                    <div className="info-item"><span className="info-label">Expected Hours:</span> <span className="info-value">{employee.expectedHours || 'N/A'} hrs/week</span></div>
                                    <div className="info-item full-width">
                                        {/* Apply link-like-button class */}
                                        <Link to={`/employees/edit/${employee._id}`} className="link-like-button">Edit Employee Details (Wage, Code, etc.)</Link>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* Apply form-footer class */}
                        <div className="form-footer">
                            <button
                                className="btn btn-warning"
                                onClick={handleInfoEditToggle}
                                disabled={isLoading}
                            >
                                <FontAwesomeIcon icon={faEdit} /> Edit Account Info
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteClick}
                                disabled={isLoading || isDeletingAccount}
                            >
                                <FontAwesomeIcon icon={faTrashAlt} /> Delete Account
                            </button>
                        </div>
                    </>
                ) : (
                    // --- Inline Edit Form ---
                    // Apply employee-form class (assuming it's in Forms.scss)
                    <form onSubmit={handleInfoSubmit} className="employee-form" noValidate>
                        {(infoError || authError) && (
                            // Apply form-error-message class
                            <div className='form-error-message'>
                                <FontAwesomeIcon icon={faExclamationCircle} /> {infoError || authError}
                            </div>
                        )}
                        {/* Apply form-group class */}
                        <div className="form-group">
                            <label htmlFor="infoName">Name*</label>
                            <input id="infoName" type="text" name="name" value={infoFormData.name} onChange={handleInfoChange} required disabled={isSubmittingInfo} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="infoEmail">Email*</label>
                            <input id="infoEmail" type="email" name="email" value={infoFormData.email} onChange={handleInfoChange} required disabled={isSubmittingInfo} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="infoCountry">Country</label>
                            <input id="infoCountry" type="text" name="country" placeholder="Your Country" value={infoFormData.country} onChange={handleInfoChange} disabled={isSubmittingInfo} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="infoPhoneNumber">Phone Number</label>
                            {/* Apply phone-input-group and country-code-select classes */}
                            <div className="phone-input-group">
                                <select
                                    name="countryCode"
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="country-code-select"
                                    disabled={isSubmittingInfo}
                                    aria-label="Country Code"
                                >
                                    {countryOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <input id="infoPhoneNumber" type="tel" name="phoneNumber" placeholder="Enter phone number" value={infoFormData.phoneNumber} onChange={handleInfoChange} disabled={isSubmittingInfo} />
                            </div>
                        </div>
                        {user.role === 'employer' && (
                        <div className="form-group">
                            <label htmlFor="infoCompanyName">Company Name</label>
                            <input id="infoCompanyName" type="text" name="companyName" placeholder="Your Company Name" value={infoFormData.companyName} onChange={handleInfoChange} disabled={isSubmittingInfo} />
                        </div>
                        )}
                        {/* Apply form-footer class */}
                        <div className="form-footer">
                            <button type="button" className="btn btn-secondary" onClick={handleInfoEditToggle} disabled={isSubmittingInfo}>
                                <FontAwesomeIcon icon={faTimes} /> Cancel
                            </button>
                            <button type="submit" className="btn btn-success" disabled={isSubmittingInfo || !infoFormData.name || !infoFormData.email}>
                                {isSubmittingInfo ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</> : <><FontAwesomeIcon icon={faSave} /> Save Changes</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Change Password Section */}
            {!isEditingInfo && (
            // Apply settings-section and form-container classes
            <div className="settings-section form-container">
                <h3>Change Password</h3>
                {/* Apply employee-form class */}
                <form onSubmit={handlePasswordSubmit} className="employee-form" noValidate>
                    {(passwordError || authError) && (
                        // Apply form-error-message class
                        <div className='form-error-message'>
                            <FontAwesomeIcon icon={faExclamationCircle} /> {passwordError || authError}
                        </div>
                    )}
                    {/* Apply form-group class */}
                    <div className="form-group">
                        <label htmlFor="currentPassword">Current Password*</label>
                        {/* Apply styles_PasswordInputContainer and styles_PasswordToggleBtn classes */}
                        <div className="styles_PasswordInputContainer">
                            <input
                                id="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                required
                                disabled={isSubmittingPassword}
                            />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="styles_PasswordToggleBtn" disabled={isSubmittingPassword}>
                                <FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPassword">New Password*</label>
                        <div className="styles_PasswordInputContainer">
                            <input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange}
                                required
                                minLength="6"
                                disabled={isSubmittingPassword}
                            />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="styles_PasswordToggleBtn" disabled={isSubmittingPassword}>
                                <FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm New Password*</label>
                        <div className="styles_PasswordInputContainer">
                            <input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordChange}
                                required
                                minLength="6"
                                disabled={isSubmittingPassword}
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="styles_PasswordToggleBtn" disabled={isSubmittingPassword}>
                                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>
                    {/* Apply form-footer class */}
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
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                // Apply logout-confirm-overlay, logout-confirm-dialog, logout-confirm-actions classes
                <div className="logout-confirm-overlay">
                  <div className="logout-confirm-dialog">
                    <h4>Confirm Account Deletion</h4>
                    <p>Are you sure you want to permanently delete your account? This action cannot be undone.</p>
                    <div className="logout-confirm-actions">
                      <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeletingAccount}>Cancel</button>
                      <button className="btn btn-danger" onClick={confirmDelete} disabled={isDeletingAccount}>
                        {isDeletingAccount ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete My Account'}
                      </button>
                    </div>
                  </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
