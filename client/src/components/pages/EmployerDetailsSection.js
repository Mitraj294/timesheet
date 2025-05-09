// /home/digilab/timesheet/client/src/components/pages/EmployerDetailsSection.js
import React, { useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faUserTie, faEnvelope, faPhone, faGlobe, faSpinner, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

import { selectAuthUser } from '../../redux/slices/authSlice';
import { selectEmployeeByUserId, fetchEmployees, selectEmployeeStatus } from '../../redux/slices/employeeSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/UserSettingsSection.scss'; // Reuse styles from UserSettingsSection

// This component displays the employer's details for a logged-in employee.
const EmployerDetailsSection = () => {
    const dispatch = useDispatch();

    // Redux state
    const user = useSelector(selectAuthUser);
    // We need the employee record to get the populated employerId
    const employee = useSelector((state) => user ? selectEmployeeByUserId(state, user.id || user._id) : null);
    const employeeStatus = useSelector(selectEmployeeStatus);

    // Fetch employee data if needed (only for employee role)
    // This ensures the employee record (with populated employerId) is available
    useEffect(() => {
        // Only fetch if user is employee, employee data is not loaded, and status is idle
        if (user?.role === 'employee' && !employee && employeeStatus === 'idle') {
            dispatch(fetchEmployees());
        }
    }, [dispatch, user, employee, employeeStatus]);

    // Check if employer details are available and correctly populated
    const employerDetailsAvailable = useMemo(() => {
        // Check if user is an employee AND employee data is loaded AND employerId is an object (populated)
        return user?.role === 'employee' && employee?.employerId && typeof employee.employerId === 'object';
    }, [user, employee]);

    // Determine loading state for this specific component
    const isLoading = employeeStatus === 'loading' && !employee; // Loading if employee data is being fetched and not yet available

    // Render loading state
    if (isLoading) {
        return (
            <div className='loading-indicator-container'> {/* Reuse loading styles */}
                <div className='loading-indicator'>
                    <FontAwesomeIcon icon={faSpinner} spin size='2x' />
                    <p>Loading Employer Details...</p>
                </div>
            </div>
        );
    }

    // Render error/not available state
    if (!employerDetailsAvailable) {
         // This state is reached if:
         // - User is not an employee (SettingsPage should prevent this component from rendering)
         // - Employee data failed to load (employeeStatus === 'failed')
         // - Employee data loaded, but employee record is missing or not linked to an employer
        return (
            <div className='error-container'> {/* Reuse error styles */}
                <Alert /> {/* Render Alert component here */}
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

    // If we reach here, user is an employee and employer details are available
    const employer = employee.employerId; // Access the populated employer object

    return (
        <div className="settings-section form-container"> {/* Reuse form-container styles */}
             <Alert /> {/* Render Alert component here */}
            <h3>Your Employer's Information</h3>
            <div className="account-info-grid"> {/* Reuse account-info-grid styles */}
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
