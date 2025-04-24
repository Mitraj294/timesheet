import React, { useEffect, useState } from 'react'; // Added useState for search
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  getEmployees,
  deleteEmployee,
} from '../../redux/actions/employeeActions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faIdCard, // Changed icon for Employees
  faTrash,
  faPlus,
  faSpinner,
  faExclamationCircle,
  faSearch, // Added search icon
} from '@fortawesome/free-solid-svg-icons';
// Import the SCSS file used by Vehicles.js for styling consistency
import '../../styles/Vehicles.scss'; // *** Changed SCSS import ***

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search, setSearch] = useState(''); // State for search input

  // Use state selectors with default values for robustness
  const {
    employees = [],
    loading,
    error,
  } = useSelector((state) => state.employees || { employees: [], loading: false, error: null });
  const { user } = useSelector((state) => state.auth || {}); // Get logged-in user

  useEffect(() => {
    // Fetch employees if not already loaded or if forced refresh is needed
    // Kept the original logic to fetch only if empty and not loading
    if (!employees.length && !loading) {
      dispatch(getEmployees());
    }
  }, [dispatch, employees.length, loading]);

  const handleDelete = (id, name) => {
    if (
      window.confirm(
        `Are you sure you want to delete employee "${name}"? This action cannot be undone.`
      )
    ) {
      dispatch(deleteEmployee(id));
      // Consider adding feedback (e.g., toast notification) on success/failure
    }
  };

  // Filter employees based on search term (case-insensitive)
  // Adapt the fields to search based on your employee data model
  const filteredEmployees = employees.filter(
    (emp) =>
      emp?.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp?.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
      emp?.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Define grid columns - adjust fr units based on desired column widths
  // Added columns for all fields shown in the original table
  const gridColumns = '1.5fr 1fr 1.5fr 0.7fr 0.7fr 1fr 1fr 1fr auto'; // Adjusted for employee fields + actions

  return (
    // Use the main page class from Vehicles.scss
    <div className='vehicles-page'>
      {/* Use the header structure and classes from Vehicles.scss */}
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faIdCard} /> Employees {/* Changed Icon */}
          </h2>
          <div className='breadcrumbs'>
            <Link
              to='/dashboard'
              className='breadcrumb-link'
            >
              Dashboard
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>Employees</span>
          </div>
        </div>
        {/* Add Employee Button - Placed in header like title */}
        {/* Note: Vehicles.js has a separate actions bar. Keeping button here for simplicity based on original Employees.js */}
        {user?.role === 'employer' && (
  <button
    // Change this className:
    className='btn btn-success' // <--- Changed from btn-primary
    onClick={() => navigate('/employees/add')}
  >
    <FontAwesomeIcon icon={faPlus} /> Add Employee
  </button>
)}
      </div>

      {/* Add Search Input - using styles from Vehicles.scss */}
      <div className='vehicles-search'>
        <input
          type='text'
          placeholder='Search by Name, Code, or Email...' // Updated placeholder
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label='Search Employees'
        />
        <FontAwesomeIcon
          icon={faSearch}
          className='search-icon'
        />
      </div>

      {/* Loading State - using styles from Vehicles.scss */}
      {loading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            size='2x'
          />
          <p>Loading employees...</p>
        </div>
      )}

      {/* Error State - using styles from Vehicles.scss */}
      {error && !loading && (
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          {/* Display error message, handle object/string errors */}
          <p>Error loading employees: {typeof error === 'string' ? error : error.message || JSON.stringify(error)}</p>
          {/* Optional: Add a retry button if desired */}
          <button className="btn btn-secondary" onClick={() => dispatch(getEmployees())}>Retry</button>
        </div>
      )}

      {/* Employee Grid/List - using the grid structure from Vehicles.scss */}
      {!loading && !error && (
        <div className='vehicles-grid'>
          {/* Header Row */}
          <div
            className='vehicles-row header'
            style={{ gridTemplateColumns: gridColumns }} // Apply dynamic columns
          >
            {/* Match header titles to the data fields */}
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

          {/* Data Rows */}
          {filteredEmployees.length === 0 ? (
            <div className='vehicles-row no-results'>
              {search ? 'No employees match your search.' : 'No employees found.'}
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp._id}
                className='vehicles-row vehicle-card' // Use vehicle-card for responsive styles
                style={{ gridTemplateColumns: gridColumns }} // Apply dynamic columns
              >
                {/* Add data-label attributes matching the header titles */}
                <div data-label='Name'>{emp.name || '--'}</div>
                <div data-label='Code'>{emp.employeeCode || '--'}</div>
                <div data-label='Email'>{emp.email || '--'}</div>
                <div data-label='Admin'>{emp.isAdmin ? 'Yes' : 'No'}</div>
                <div data-label='Overtime'>{emp.overtime ? 'Yes' : 'No'}</div>
                <div data-label='Expected Hrs'>{emp.expectedHours != null ? `${emp.expectedHours} hrs` : '--'}</div>
                <div data-label='Holiday X'>{emp.holidayMultiplier != null ? emp.holidayMultiplier : '--'}</div>
                <div data-label='Wage'>{emp.wage != null ? `$${emp.wage}/hr` : '--'}</div>
                {user?.role === 'employer' && (
                  <div
                    data-label='Actions'
                    className='actions' // Use .actions class for styling container
                  >
                    {/* Use icon button styles from Vehicles.scss */}
                    <button
                      className='btn-icon btn-icon-yellow' // Edit button style
                      onClick={() => navigate(`/employees/edit/${emp._id}`)}
                      aria-label={`Edit ${emp.name}`}
                      title={`Edit ${emp.name}`}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      className='btn-icon btn-icon-red' // Delete button style
                      onClick={() => handleDelete(emp._id, emp.name)}
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
