// /home/digilab/timesheet/client/src/components/pages/EmployeeForm.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
// --- UPDATED IMPORTS ---
// Import from employeeSlice instead of employeeActions
import {
  addEmployee,
  updateEmployee,
  fetchEmployees, // Renamed from getEmployees
  selectAllEmployees,
  selectEmployeeStatus,
  selectEmployeeError
} from '../../redux/slices/employeeSlice';
// --- END UPDATED IMPORTS ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus,
  faUserEdit,
  faSpinner,
  faExclamationCircle,
  faSave,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/Forms.scss';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isEditMode = Boolean(id);

  // --- UPDATED SELECTORS ---
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus); // Use status selector
  const employeesError = useSelector(selectEmployeeError); // Use error selector
  // --- END UPDATED SELECTORS ---

  const initialFormState = {
    name: '',
    employeeCode: '',
    email: '',
    isAdmin: 'No',
    overtime: 'No',
    expectedHours: 40,
    holidayMultiplier: 1.5,
    wage: '',
    userId: null,
  };

  const [formData, setFormData] = useState(initialFormState);
  // Use Redux status for loading, local state for submission error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null); // Local error for form validation/submission

  useEffect(() => {
    // Fetch employees if status is idle
    if (employeeStatus === 'idle') {
      dispatch(fetchEmployees()); // <-- Dispatch fetchEmployees thunk
    }
  }, [dispatch, employeeStatus]);

  useEffect(() => {
    if (id && employees.length > 0) {
      const emp = employees.find((e) => e._id === id);
      if (emp) {
        setFormData({
          name: emp.name || '',
          employeeCode: emp.employeeCode || '',
          email: emp.email || '',
          isAdmin: emp.isAdmin ? 'Yes' : 'No',
          overtime: emp.overtime ? 'Yes' : 'No',
          expectedHours: emp.expectedHours ?? 40,
          holidayMultiplier: emp.holidayMultiplier ?? 1.5,
          wage: emp.wage?.toString() || '',
          userId: emp.userId || null,
        });
      } else {
        console.warn(`Employee with ID ${id} not found.`);
        // Set local error if employee not found after fetch succeeded
        if (employeeStatus === 'succeeded') {
            setError(`Employee with ID ${id} not found.`);
        }
      }
    } else if (!id) {
      setFormData(initialFormState);
    }
  }, [id, employees, employeeStatus]); // Add employeeStatus dependency

  // ... (handleChange, validateForm remain the same)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value,
    }));
     // Clear local error on change
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required.';
    if (!formData.employeeCode.trim()) return 'Employee Code is required.';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) return 'Valid Email is required.';
    if (formData.wage === '' || isNaN(parseFloat(formData.wage)) || parseFloat(formData.wage) < 0) return 'Valid Wage per Hour is required.';
    if (formData.expectedHours === '' || isNaN(parseInt(formData.expectedHours, 10)) || parseInt(formData.expectedHours, 10) < 0) return 'Valid Expected Hours are required.';
    if (formData.holidayMultiplier === '' || isNaN(parseFloat(formData.holidayMultiplier)) || parseFloat(formData.holidayMultiplier) < 0) return 'Valid Holiday Multiplier is required.';
    return null;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear local error

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true); // Use local submitting state

    let employeeData = {
      ...formData,
      wage: parseFloat(formData.wage),
      expectedHours: parseInt(formData.expectedHours, 10),
      holidayMultiplier: parseFloat(formData.holidayMultiplier),
      isAdmin: formData.isAdmin === 'Yes',
      overtime: formData.overtime === 'Yes',
    };

    try {
      // --- User Check Logic (Keep as is for now, consider moving to backend/thunk later) ---
      if (!isEditMode) {
        const userCheckResponse = await fetch(`${API_URL}/auth/check-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });

        if (!userCheckResponse.ok) {
            const errorData = await userCheckResponse.json();
            throw new Error(errorData.message || 'Failed to check user existence.');
        }
        const userCheckData = await userCheckResponse.json();

        if (!userCheckData.exists) {
          const registerResponse = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name,
              email: formData.email,
              password: '123456',
              role: 'employee',
            }),
          });
          if (!registerResponse.ok) {
            const errorData = await registerResponse.json();
            throw new Error(errorData.message || 'Failed to register employee as a user.');
          }
          const registeredUser = await registerResponse.json();
          if (!registeredUser.user || !registeredUser.user._id) {
            throw new Error('Invalid response from registration. No user ID received.');
          }
          employeeData.userId = registeredUser.user._id;
        }
      }
      // --- End User Check Logic ---

      // Dispatch thunks from slice
      if (isEditMode) {
        // Pass object { id, employeeData } to updateEmployee thunk
        await dispatch(updateEmployee({ id, employeeData })).unwrap(); // Use unwrap to catch errors
      } else {
        await dispatch(addEmployee(employeeData)).unwrap(); // Use unwrap to catch errors
      }

      navigate('/employees');

    } catch (rejectedValueOrSerializedError) {
      // unwrap throws the error payload or a SerializedError
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} employee:`, rejectedValueOrSerializedError);
      // Error message might be directly in rejectedValueOrSerializedError or in .message
      const message = typeof rejectedValueOrSerializedError === 'string'
          ? rejectedValueOrSerializedError
          : rejectedValueOrSerializedError?.message || `Failed to ${isEditMode ? 'update' : 'add'} employee.`;
      setError(message); // Set local error state
    } finally {
      setIsSubmitting(false); // Stop local submitting indicator
    }
  };

  // Use Redux status for initial loading
  const isLoadingInitialData = employeeStatus === 'loading' && !employees.length;

  // ... (JSX remains largely the same, but disable based on isSubmitting and show Redux error (employeesError) for initial load)

  if (isLoadingInitialData) {
     return (
        <div className='vehicles-page'>
            <div className='loading-indicator'>
              <FontAwesomeIcon icon={faSpinner} spin size='2x' />
              <p>Loading Employee Data...</p>
            </div>
        </div>
      );
  }

  // Show Redux error if initial fetch failed
  if (employeesError && !employees.length && employeeStatus === 'failed') {
     return (
        <div className='vehicles-page'>
            <div className='error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} />
              <p>Error loading employee data: {employeesError}</p>
               <button className="btn btn-secondary" onClick={() => dispatch(fetchEmployees())}>Retry</button>
            </div>
        </div>
      );
  }


  return (
    <div className='vehicles-page'>
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={isEditMode ? faUserEdit : faUserPlus} />{' '}
            {isEditMode ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'>
              Dashboard
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/employees' className='breadcrumb-link'>
              Employees
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>
              {isEditMode ? 'Edit Employee' : 'Add Employee'}
            </span>
          </div>
        </div>
      </div>

      <div className='form-container'>
        <form onSubmit={handleSubmit} className='employee-form' noValidate>
          {/* Show local submission/validation error */}
          {error && (
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error}
            </div>
          )}

          {/* Disable inputs based on local isSubmitting state */}
          <div className='form-group'>
            <label htmlFor='name'>Name*</label>
            <input
              id='name' type='text' name='name' placeholder='Full Name'
              value={formData.name} onChange={handleChange} required
              disabled={isSubmitting} // Use local submitting state
            />
          </div>

          <div className='form-group'>
            <label htmlFor='employeeCode'>Employee Code*</label>
            <input
              id='employeeCode' type='text' name='employeeCode' placeholder='Unique Employee Code'
              value={formData.employeeCode} onChange={handleChange} required
              disabled={isSubmitting} // Use local submitting state
            />
          </div>

          <div className='form-group'>
            <label htmlFor='email'>Email*</label>
            <input
              id='email' type='email' name='email' placeholder='employee@example.com'
              value={formData.email} onChange={handleChange} required
              disabled={isSubmitting || isEditMode} // Use local submitting state
            />
             {isEditMode && <small>Email cannot be changed after creation.</small>}
          </div>

          <div className='form-group'>
            <label htmlFor='wage'>Wage per Hour*</label>
            <input
              id='wage' type='number' name='wage' placeholder='e.g., 25.50'
              value={formData.wage} onChange={handleChange} required
              min='0' step='0.01'
              disabled={isSubmitting} // Use local submitting state
            />
          </div>

          <div className='form-group'>
            <label htmlFor='expectedHours'>Expected Hours per Week*</label>
            <input
              id='expectedHours' type='number' name='expectedHours' placeholder='e.g., 40'
              value={formData.expectedHours} onChange={handleChange} required
              min='0' step='1'
              disabled={isSubmitting} // Use local submitting state
            />
          </div>

          <div className='form-group'>
            <label htmlFor='holidayMultiplier'>Public Holiday Multiplier*</label>
            <input
              id='holidayMultiplier' type='number' name='holidayMultiplier' placeholder='e.g., 1.5'
              value={formData.holidayMultiplier} onChange={handleChange} required
              min='0' step='0.1'
              disabled={isSubmitting} // Use local submitting state
            />
          </div>

          <div className='form-group'>
            <label htmlFor='isAdmin'>Admin Role*</label>
            <select
              id='isAdmin' name='isAdmin' value={formData.isAdmin} onChange={handleChange} required
              disabled={isSubmitting} // Use local submitting state
            >
              <option value='No'>No</option>
              <option value='Yes'>Yes</option>
            </select>
          </div>

          <div className='form-group'>
            <label htmlFor='overtime'>Overtime Allowed*</label>
            <select
              id='overtime' name='overtime' value={formData.overtime} onChange={handleChange} required
              disabled={isSubmitting} // Use local submitting state
            >
              <option value='No'>No</option>
              <option value='Yes'>Yes</option>
            </select>
          </div>

          <div className='form-footer'>
            <button
              type='button' className='btn btn-danger'
              onClick={() => navigate('/employees')}
              disabled={isSubmitting} // Use local submitting state
            >
               <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button
              type='submit' className='btn btn-success'
              disabled={isSubmitting} // Use local submitting state
            >
              {/* Show spinner based on local isSubmitting state */}
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={isEditMode ? faUserEdit : faSave} />{' '}
                  {isEditMode ? 'Update Employee' : 'Add Employee'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
