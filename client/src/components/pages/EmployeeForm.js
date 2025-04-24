import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  addEmployee,
  updateEmployee,
  getEmployees,
} from '../../redux/actions/employeeActions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus,
  faUserEdit,
  faSpinner,
  faExclamationCircle,
  faSave,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/EmployeeForms.scss';

const API_URL =
  process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isEditMode = Boolean(id);

  const { employees = [], loading: employeesLoading, error: employeesError } =
    useSelector((state) => state.employees || { employees: [] });

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employees.length && !employeesLoading) {
      dispatch(getEmployees());
    }
  }, [dispatch, employees.length, employeesLoading]);


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
        setError(`Employee with ID ${id} not found.`);
      }
    } else if (!id) {
      setFormData(initialFormState);
    }
    setError(null);
  }, [id, employees]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'isAdmin' || name === 'overtime') {
       setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    } else {
       setFormData((prevState) => ({
        ...prevState,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
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
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    let employeeData = {
      ...formData,
      wage: parseFloat(formData.wage),
      expectedHours: parseInt(formData.expectedHours, 10),
      holidayMultiplier: parseFloat(formData.holidayMultiplier),
      isAdmin: formData.isAdmin === 'Yes',
      overtime: formData.overtime === 'Yes',
    };

    try {
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
          console.log('User not found, registering new employee...');
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
          console.log('Employee registered as user:', registeredUser);
          employeeData.userId = registeredUser.user._id;
        } else {
           console.log('User already exists, creating employee record without new registration.');
        }
      }

      if (isEditMode) {
        await dispatch(updateEmployee(id, employeeData));
      } else {
        await dispatch(addEmployee(employeeData));
      }

      navigate('/employees');

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} employee:`, error);
      setError(error.message || `Failed to ${isEditMode ? 'update' : 'add'} employee.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (employeesLoading) {
     return (
        <div className='loading-indicator page-loading'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading Employee Data...</p>
        </div>
      );
  }

  if (employeesError && !employees.length) {
     return (
        <div className='error-message page-error'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>Error loading employee data: {employeesError.message || JSON.stringify(employeesError)}</p>
           <button className="btn btn-secondary" onClick={() => dispatch(getEmployees())}>Retry</button>
        </div>
      );
  }


  return (
    <div className='form-page-container'>
      <div className='form-header'>
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
          {error && (
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error}
            </div>
          )}

          <div className='form-group'>
            <label htmlFor='name'>Name*</label>
            <input
              id='name'
              type='text'
              name='name'
              placeholder='Full Name'
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className='form-group'>
            <label htmlFor='employeeCode'>Employee Code*</label>
            <input
              id='employeeCode'
              type='text'
              name='employeeCode'
              placeholder='Unique Employee Code'
              value={formData.employeeCode}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className='form-group'>
            <label htmlFor='email'>Email*</label>
            <input
              id='email'
              type='email'
              name='email'
              placeholder='employee@example.com'
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading || isEditMode}
            />
             {isEditMode && <small>Email cannot be changed after creation.</small>}
          </div>

          <div className='form-group'>
            <label htmlFor='wage'>Wage per Hour*</label>
            <input
              id='wage'
              type='number'
              name='wage'
              placeholder='e.g., 25.50'
              value={formData.wage}
              onChange={handleChange}
              required
              min='0'
              step='0.01'
              disabled={isLoading}
            />
          </div>

          <div className='form-group'>
            <label htmlFor='expectedHours'>Expected Hours per Week*</label>
            <input
              id='expectedHours'
              type='number'
              name='expectedHours'
              placeholder='e.g., 40'
              value={formData.expectedHours}
              onChange={handleChange}
              required
              min='0'
              step='1'
              disabled={isLoading}
            />
          </div>

          <div className='form-group'>
            <label htmlFor='holidayMultiplier'>Public Holiday Multiplier*</label>
            <input
              id='holidayMultiplier'
              type='number'
              name='holidayMultiplier'
              placeholder='e.g., 1.5'
              value={formData.holidayMultiplier}
              onChange={handleChange}
              required
              min='0'
              step='0.1'
              disabled={isLoading}
            />
          </div>

          <div className='form-group'>
            <label htmlFor='isAdmin'>Admin Role*</label>
            <select
              id='isAdmin'
              name='isAdmin'
              value={formData.isAdmin}
              onChange={handleChange}
              required
              disabled={isLoading}
            >
              <option value='No'>No</option>
              <option value='Yes'>Yes</option>
            </select>
          </div>

          <div className='form-group'>
            <label htmlFor='overtime'>Overtime Allowed*</label>
            <select
              id='overtime'
              name='overtime'
              value={formData.overtime}
              onChange={handleChange}
              required
              disabled={isLoading}
            >
              <option value='No'>No</option>
              <option value='Yes'>Yes</option>
            </select>
          </div>

          <div className='form-footer'>
            <button
              type='button'
              className='btn btn-danger'
              onClick={() => navigate('/employees')}
              disabled={isLoading}
            >
               <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button
              type='submit'
              className='btn btn-success'
              disabled={isLoading}
            >
              {isLoading ? (
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
