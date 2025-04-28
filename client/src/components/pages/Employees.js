// /home/digilab/timesheet/client/src/components/pages/Employees.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
// --- UPDATED IMPORTS ---
// Import from employeeSlice instead of employeeActions
import {
  fetchEmployees, // Renamed from getEmployees
  deleteEmployee,
  selectAllEmployees,
  selectEmployeeStatus,
  selectEmployeeError
} from '../../redux/slices/employeeSlice';
// --- END UPDATED IMPORTS ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faIdCard,
  faTrash,
  faPlus,
  faSpinner,
  faExclamationCircle,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/Vehicles.scss'; // Assuming this stylesheet is correct

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // --- Selectors with defensive checks ---
  const employees = useSelector(state => {
    // console.log('Employees - Running selectAllEmployees:', typeof selectAllEmployees);
    if (typeof selectAllEmployees !== 'function') {
        console.error('Employees - selectAllEmployees is not a function!');
        return []; // Return default value
    }
    return selectAllEmployees(state);
  });
  const employeeStatus = useSelector(state => {
    // console.log('Employees - Running selectEmployeeStatus:', typeof selectEmployeeStatus);
     if (typeof selectEmployeeStatus !== 'function') {
        console.error('Employees - selectEmployeeStatus is not a function!');
        return 'idle'; // Return default value
    }
    return selectEmployeeStatus(state);
  });
  const error = useSelector(state => {
    // console.log('Employees - Running selectEmployeeError:', typeof selectEmployeeError);
     if (typeof selectEmployeeError !== 'function') {
        console.error('Employees - selectEmployeeError is not a function!');
        return null; // Return default value
    }
    return selectEmployeeError(state);
  });
  const loading = employeeStatus === 'loading'; // Derive boolean loading from status

  // Select token and auth loading status for conditional fetching
  const { token, isLoading: isAuthLoading, isAuthenticated } = useSelector((state) => state.auth || {});
  const { user } = useSelector((state) => state.auth || {}); // Keep user selector if needed elsewhere

  useEffect(() => {
    // Don't attempt fetch if auth is still loading OR if there's no token
    if (isAuthLoading) {
      console.log(`Employees - Skipping fetchEmployees: Auth is loading.`);
      return; // Exit early if auth state is not ready
    }
    if (!token) {
      console.warn(`Employees - Skipping fetchEmployees: No token present.`);
      // Optionally redirect or show login prompt if not authenticated
      // if (!isAuthenticated) navigate('/login');
      return; // Exit early if no token
    }

    // Only fetch if authenticated, token is present, and data is needed
    if (employeeStatus === 'idle') {
      console.log("Employees - Dispatching fetchEmployees (Token present, status idle)");
      dispatch(fetchEmployees());
    } else {
      console.log("Employees - Skipping fetchEmployees, status:", employeeStatus);
    }

  }, [dispatch, employeeStatus, token, isAuthLoading, isAuthenticated, navigate]); // Added dependencies

  const handleDelete = (id, name) => {
    if (
      window.confirm(
        `Are you sure you want to delete employee "${name}"? This action cannot be undone.`
      )
    ) {
      // Dispatch deleteEmployee thunk from slice
      dispatch(deleteEmployee(id));
    }
  };

   // Ensure employees is an array before filtering
   const filteredEmployees = Array.isArray(employees) ? employees.filter(
    (emp) =>
      emp?.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp?.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
      emp?.email?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const gridColumns = '1.5fr 1fr 1.5fr 0.7fr 0.7fr 1fr 1fr 1fr auto';

  // Display loading indicator if auth is loading OR employees are loading
  const showLoading = isAuthLoading || loading;

  return (
    <div className='vehicles-page'> {/* Consider renaming class if not specific to vehicles */}
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faIdCard} /> Employees
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'> Dashboard </Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>Employees</span>
          </div>
        </div>
        <div className="header-actions">
          {user?.role === 'employer' && (
            <button
              className='btn btn-success'
              onClick={() => navigate('/employees/add')}
              disabled={showLoading} // Disable button while loading anything
            >
              <FontAwesomeIcon icon={faPlus} /> Add Employee
            </button>
          )}
        </div>
      </div>

      <div className='vehicles-search'>
        <input
          type='text'
          placeholder='Search by Name, Code, or Email...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label='Search Employees'
          disabled={showLoading} // Disable search while loading
        />
        <FontAwesomeIcon icon={faSearch} className='search-icon' />
      </div>

      {/* Use combined loading state */}
      {showLoading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>{isAuthLoading ? 'Authenticating...' : 'Loading employees...'}</p>
        </div>
      )}

      {/* Use Redux error state - show only if not loading */}
      {error && !showLoading && (
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>Error loading employees: {error}</p>
          {/* Provide retry only if the error is specifically 'Not authorized...' */}
          {error === 'Not authorized, no token provided' ? (
             <p>Please try logging in again.</p>
          ) : (
             <button className="btn btn-secondary" onClick={() => dispatch(fetchEmployees())}>Retry</button>
          )}
        </div>
      )}

      {/* Employee Grid - Show only if not loading and no error */}
      {!showLoading && !error && (
        <div className='vehicles-grid'>
          <div
            className='vehicles-row header'
            style={{ gridTemplateColumns: gridColumns }}
          >
            <div>Name</div>
            <div>Employee Code</div>
            <div>Email</div>
            <div>Admin</div>
            <div>Overtime</div>
            <div>Expected Hours</div>
            <div>Holiday Multiplier</div>
            <div>Wage</div>
            {user?.role === 'employer' && <div>Actions</div>}
          </div>

          {filteredEmployees.length === 0 ? (
            <div className='vehicles-row no-results'>
              {search ? 'No employees match your search.' : (Array.isArray(employees) && employees.length === 0 ? 'No employees found.' : 'No employees match your search.')}
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp._id}
                className='vehicles-row vehicle-card' // Consider renaming class
                style={{ gridTemplateColumns: gridColumns }}
              >
                <div data-label='Name'>{emp.name || '--'}</div>
                <div data-label='Code'>{emp.employeeCode || '--'}</div>
                <div data-label='Email'>{emp.email || '--'}</div>
                <div data-label='Admin'>{emp.isAdmin ? 'Yes' : 'No'}</div>
                <div data-label='Overtime'>{emp.overtime ? 'Yes' : 'No'}</div>
                <div data-label='Expected Hrs'>{emp.expectedHours != null ? `${emp.expectedHours} hrs` : '--'}</div>
                <div data-label='Holiday X'>{emp.holidayMultiplier != null ? emp.holidayMultiplier : '--'}</div>
                <div data-label='Wage'>{emp.wage != null ? `$${emp.wage}/hr` : '--'}</div>
                {user?.role === 'employer' && (
                  <div data-label='Actions' className='actions'>
                    <button
                      className='btn-icon btn-icon-yellow'
                      onClick={() => navigate(`/employees/edit/${emp._id}`)}
                      aria-label={`Edit ${emp.name}`}
                      title={`Edit ${emp.name}`}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      className='btn-icon btn-icon-red'
                      onClick={() => handleDelete(emp._id, emp.name)} // handleDelete already uses the thunk
                      aria-label={`Delete ${emp.name}`}
                      title={`Delete ${emp.name}`}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Employees;
