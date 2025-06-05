// /home/digilab/timesheet/client/src/components/pages/EmployerDetailsSection.js
import React, { useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

import { selectAuthUser } from '../../redux/slices/authSlice';
import { selectEmployeeByUserId, fetchEmployees, selectEmployeeStatus } from '../../redux/slices/employeeSlice';
import Alert from '../layout/Alert';
import '../../styles/UserSettingsSection.scss';

// Shows employer details for a logged-in employee
const EmployerDetailsSection = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectAuthUser);
    // Get employee record for this user
    const employee = useSelector((state) => user ? selectEmployeeByUserId(state, user.id || user._id) : null);
    const employeeStatus = useSelector(selectEmployeeStatus);

    // Fetch employee data if needed
    useEffect(() => {
        if (user?.role === 'employee' && !employee && employeeStatus === 'idle') {
            dispatch(fetchEmployees());
        }
    }, [dispatch, user, employee, employeeStatus]);

    // Check if employer details are available
    const employerDetailsAvailable = useMemo(() => {
        return user?.role === 'employee' && employee?.employerId && typeof employee.employerId === 'object';
    }, [user, employee]);

    const isLoading = employeeStatus === 'loading' && !employee;

    if (isLoading) {
        return (
            <div className='loading-indicator-container'>
                <div className='loading-indicator'>
                    <FontAwesomeIcon icon={faSpinner} spin size='2x' />
                    <p>Loading Employer Details...</p>
                </div>
            </div>
        );
    }

    if (!employerDetailsAvailable) {
        return (
            <div className='error-container'>
                <Alert />
                <div className='error-message'>
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    <p>Could not display employer details.</p>
                    {user?.role === 'employee' && employeeStatus === 'failed' && (
                        <p>Failed to fetch your employee record. Please try refreshing the page.</p>
                    )}
                    {user?.role === 'employee' && employee && !employee.employerId && (
                        <p>Your employee record is not currently linked to an employer.</p>
                    )}
                    {user?.role !== 'employee' && (
                        <p>This section is only available for employees.</p>
                    )}
                </div>
            </div>
        );
    }

    // Employer details available
    const employer = employee.employerId;

    return (
        <div className="settings-section form-container">
            <Alert />
            <h3>Your Employer's Information</h3>
            <div className="account-info-grid">
                <div className="info-item"><span className="info-label">Employer Name:</span> <span className="info-value">{employer.name || 'N/A'}</span></div>
                <div className="info-item"><span className="info-label">Company:</span> <span className="info-value">{employer.companyName || 'N/A'}</span></div>
                <div className="info-item"><span className="info-label">Employer Email:</span> <span className="info-value">{employer.email || 'N/A'}</span></div>
                <div className="info-item"><span className="info-label">Employer Phone:</span> <span className="info-value">{employer.phoneNumber || 'N/A'}</span></div>
                <div className="info-item"><span className="info-label">Employer Country:</span> <span className="info-value">{employer.country || 'N/A'}</span></div>
            </div>
        </div>
    );
};

export default EmployerDetailsSection;
