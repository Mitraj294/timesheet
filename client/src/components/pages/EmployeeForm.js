// /home/digilab/timesheet/client/src/components/pages/EmployeeForm.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  addEmployee,
  updateEmployee,
  fetchEmployees,
  selectAllEmployees,
  selectEmployeeStatus,
  selectEmployeeError
} from '../../redux/slices/employeeSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import { register, checkUserByEmailForEmployer } from '../../redux/slices/authSlice';
import Alert from '../layout/Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserPlus,
  faUserEdit,
  faSpinner,
  faSave,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/Forms.scss';

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isEditMode = Boolean(id);

  // Redux state
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employeesError = useSelector(selectEmployeeError);

  // Initial form state
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
  const [error, setError] = useState(null);

  // Fetch employees if needed
  useEffect(() => {
    if (employeeStatus === 'idle') {
      dispatch(fetchEmployees());
    }
  }, [dispatch, employeeStatus]);

  // Show error alerts from Redux
  useEffect(() => {
    if (employeesError && (!isEditMode || (isEditMode && employeeStatus === 'failed'))) {
      dispatch(setAlert(employeesError, 'danger'));
    }
  }, [employeesError, isEditMode, employeeStatus, dispatch]);

  // Fill form in edit mode
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
      } else if (employeeStatus === 'succeeded') {
        dispatch(setAlert(`Employee with ID ${id} not found.`, 'warning'));
      }
    } else if (!id) {
      setFormData(initialFormState);
    }
  }, [id, employees, employeeStatus, dispatch]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'Yes' : 'No') : value,
    }));
    if (error) setError(null);
  };

  const isSaving = employeeStatus === 'loading';

  // Simple form validation
  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required.';
    if (!formData.employeeCode.trim()) return 'Employee Code is required.';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) return 'Valid Email is required.';
    if (formData.wage === '' || isNaN(parseFloat(formData.wage)) || parseFloat(formData.wage) < 0) return 'Valid Wage per Hour is required.';
    if (formData.expectedHours === '' || isNaN(parseInt(formData.expectedHours, 10)) || parseInt(formData.expectedHours, 10) < 0) return 'Valid Expected Hours are required.';
    if (formData.holidayMultiplier === '' || isNaN(parseFloat(formData.holidayMultiplier)) || parseFloat(formData.holidayMultiplier) < 0) return 'Valid Holiday Multiplier is required.';
    return null;
  };

  // Handle form submit (add or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      dispatch(setAlert(validationError, 'warning'));
      setError(validationError);
      return;
    }

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
        // Check if user exists
        const userCheck = await dispatch(
          checkUserByEmailForEmployer({ email: formData.email })
        ).unwrap();

        if (!userCheck.exists) {
          // Register new user
          const registerRes = await dispatch(
            register({
              name: formData.name,
              email: formData.email,
              password: '123456',
              role: 'employee',
            })
          ).unwrap();

          if (!registerRes.user || !registerRes.user._id) {
            throw new Error('No user ID received from registration.');
          }
          employeeData.userId = registerRes.user._id;
        } else if (userCheck.user?._id) {
          employeeData.userId = userCheck.user._id;
        }
      }

      if (isEditMode) {
        await dispatch(updateEmployee({ id, employeeData })).unwrap();
        dispatch(setAlert('Employee updated successfully!', 'success'));
      } else {
        await dispatch(addEmployee(employeeData)).unwrap();
        dispatch(setAlert(
          `Employee added & User account created! Temporary password is '123456'. Advise user to change it.`,
          'success',
          10000
        ));
      }
      navigate('/employees');
    } catch (err) {
      const message = err?.message || (typeof err === 'string' ? err : `Failed to ${isEditMode ? 'update' : 'add'} employee.`);
      dispatch(setAlert(message, 'danger'));
    }
  };

  // Show loading spinner if fetching employees
  if (employeeStatus === 'loading' && !employees.length) {
    return (
      <div className='vehicles-page'>
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading Employee Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='vehicles-page'>
      <Alert />
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={isEditMode ? faUserEdit : faUserPlus} />{' '}
            {isEditMode ? 'Edit Employee' : 'Add Employee'}
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/employees' className='breadcrumb-link'>Employees</Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>
              {isEditMode ? 'Edit Employee' : 'Add Employee'}
            </span>
          </div>
        </div>
      </div>

      <div className='form-container'>
        <form onSubmit={handleSubmit} className='employee-form' noValidate>
          {/* Name */}
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
              disabled={isSaving}
            />
          </div>
          {/* Employee Code */}
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
              disabled={isSaving}
            />
          </div>
          {/* Email */}
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
              disabled={isSaving || isEditMode}
            />
            {isEditMode && <small>Email cannot be changed after creation.</small>}
          </div>
          {/* Wage */}
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
              disabled={isSaving}
            />
          </div>
          {/* Expected Hours */}
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
              disabled={isSaving}
            />
          </div>
          {/* Holiday Multiplier */}
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
              disabled={isSaving}
            />
          </div>
          {/* Admin Role */}
          <div className='form-group'>
            <label htmlFor='isAdmin'>Admin Role*</label>
            <select
              id='isAdmin'
              name='isAdmin'
              value={formData.isAdmin}
              onChange={handleChange}
              required
              disabled={isSaving}
            >
              <option value='No'>No</option>
              <option value='Yes'>Yes</option>
            </select>
          </div>
          {/* Overtime */}
          <div className='form-group'>
            <label htmlFor='overtime'>Overtime Allowed*</label>
            <select
              id='overtime'
              name='overtime'
              value={formData.overtime}
              onChange={handleChange}
              required
              disabled={isSaving}
            >
              <option value='No'>No</option>
              <option value='Yes'>Yes</option>
            </select>
          </div>
          {/* Buttons */}
          <div className='form-footer'>
            <button
              type='button'
              className='btn btn-danger'
              onClick={() => navigate('/employees')}
              disabled={isSaving}
            >
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button
              type='submit'
              className='btn btn-green'
              disabled={isSaving}
            >
              {isSaving ? (
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
