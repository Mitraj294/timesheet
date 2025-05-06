// /home/digilab/timesheet/client/src/components/pages/Employees.js
import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
// --- UPDATED IMPORTS ---
import {
  fetchEmployees,
  deleteEmployee,
  selectAllEmployees,
  selectEmployeeStatus,
  selectEmployeeError
} from '../../redux/slices/employeeSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
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

  // Local component state
  const [search, setSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Stores { id, name } for deletion confirmation

  // Redux state selectors
  const employees = useSelector(state => {
    if (typeof selectAllEmployees !== 'function') {
        console.error('Employees - selectAllEmployees is not a function!');
        return [];
    }
    return selectAllEmployees(state);
  });
  const employeeStatus = useSelector(state => {
     if (typeof selectEmployeeStatus !== 'function') {
        console.error('Employees - selectEmployeeStatus is not a function!');
        return 'idle';
    }
    return selectEmployeeStatus(state);
  });
  const error = useSelector(state => {
     if (typeof selectEmployeeError !== 'function') {
        console.error('Employees - selectEmployeeError is not a function!');
        return null;
    }
    return selectEmployeeError(state);
  });

  const { token, isLoading: isAuthLoading, isAuthenticated } = useSelector((state) => state.auth || {});
  const { user } = useSelector((state) => state.auth || {}); // For role-based UI rendering

  // Effects
  // Fetches employees if authenticated, token is present, and data hasn't been loaded
  useEffect(() => {
    if (isAuthLoading) {
      return; // Wait for authentication to resolve
    }
    if (!token) {
      console.warn(`Employees - Skipping fetchEmployees: No token present.`);
      return;
    }

    if (employeeStatus === 'idle') {
      console.log("Employees - Dispatching fetchEmployees (Token present, status idle)");
      dispatch(fetchEmployees());
    } else {
      console.log("Employees - Skipping fetchEmployees, status:", employeeStatus);
    }

  }, [dispatch, employeeStatus, token, isAuthLoading, isAuthenticated, navigate]);

  // Displays errors from Redux state (e.g., employee fetch errors) as alerts
  useEffect(() => {
    if (error) {
      dispatch(setAlert(error, 'danger'));
    }
  }, [error, dispatch]);

  // Handlers
  const handleDeleteClick = (id, name) => {
    setItemToDelete({ id, name });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const confirmDeleteEmployee = useCallback(async () => {
    if (!itemToDelete) return;
    const { id, name } = itemToDelete;

    dispatch(deleteEmployee(id))
      .unwrap()
      .then(() => {
        dispatch(setAlert(`Employee "${name}" deleted successfully.`, 'success'));
      })
      .catch((err) => {
        dispatch(setAlert(err?.message || `Failed to delete employee "${name}".`, 'danger'));
      });
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  }, [itemToDelete, dispatch]);

   // Filters employees based on search term
   const filteredEmployees = Array.isArray(employees) ? employees.filter(
    (emp) =>
      emp?.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp?.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
      emp?.email?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  const gridColumns = '1.5fr 1fr 1.5fr 0.7fr 0.7fr 1fr 1fr 1fr auto';
  const showLoading = isAuthLoading || employeeStatus === 'loading'; // Combined loading state

  // Render
  return (
    <div className='vehicles-page'>
      <Alert />
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
              disabled={showLoading}
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
          disabled={showLoading}
        />
        <FontAwesomeIcon icon={faSearch} className='search-icon' />
      </div>

      {showLoading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>{isAuthLoading ? 'Authenticating...' : 'Loading employees...'}</p>
        </div>
      )}
      
      {/* Employee grid: displayed when not loading and no error occurred */}
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
                className='vehicles-row vehicle-card'
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
                      onClick={() => handleDeleteClick(emp._id, emp.name)}
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

      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay">
            <div className="logout-confirm-dialog">
              <h4>Confirm Employee Deletion</h4>
              <p>Are you sure you want to permanently delete employee "<strong>{itemToDelete.name}</strong>"? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={employeeStatus === 'loading'}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteEmployee} disabled={employeeStatus === 'loading'}>
                  {employeeStatus === 'loading' ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete Employee'}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default Employees;
