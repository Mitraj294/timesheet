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
import '../../styles/Employees.scss'; // Import new SCSS file

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Local component state
  const [search, setSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Stores { id, name } for deletion confirmation

  // State for responsive layout
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Call handler right away
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // const gridColumns = '1.5fr 1fr 1.5fr 0.7fr 0.7fr 1fr 1fr 1fr auto'; // Not needed for responsive grid

  const getEmployeeCellStyle = (employeeIndex, fieldType) => {
    if (!isSmallScreen) {
      return {}; // Let CSS flow handle large screens
    }

    // On small screens, headers for details (Code, Email, etc.) stack in the middle.
    // There are 7 detail items: Employee Code, Email, Admin, Overtime, Expected, Holiday, Wage.
    const headerRowCountForDetails = 7;
    const dataRowsPerEmployeeBlock = headerRowCountForDetails;

    // Data for employee `employeeIndex` starts its block after the header rows.
    // Grid lines are 1-based. Headers (Name, stacked details, Actions) occupy lines 1 to (headerRowCountForDetails + 1).
    // So, data starts on line (headerRowCountForDetails + 1).
    const employeeBlockStartRowLine = (headerRowCountForDetails + 1) + (employeeIndex * dataRowsPerEmployeeBlock);

    switch (fieldType) {
      case 'name':    return { gridArea: `${employeeBlockStartRowLine} / 1 / ${employeeBlockStartRowLine + dataRowsPerEmployeeBlock} / 2` };
      case 'actions': return { gridArea: `${employeeBlockStartRowLine} / 3 / ${employeeBlockStartRowLine + dataRowsPerEmployeeBlock} / 4` };
      case 'employeeCode': return { gridArea: `${employeeBlockStartRowLine + 0} / 2 / ${employeeBlockStartRowLine + 1} / 3` };
      case 'email':        return { gridArea: `${employeeBlockStartRowLine + 1} / 2 / ${employeeBlockStartRowLine + 2} / 3` };
      case 'isAdmin':      return { gridArea: `${employeeBlockStartRowLine + 2} / 2 / ${employeeBlockStartRowLine + 3} / 3` };
      case 'overtime':     return { gridArea: `${employeeBlockStartRowLine + 3} / 2 / ${employeeBlockStartRowLine + 4} / 3` };
      case 'expectedHours':return { gridArea: `${employeeBlockStartRowLine + 4} / 2 / ${employeeBlockStartRowLine + 5} / 3` };
      case 'holidayMultiplier': return { gridArea: `${employeeBlockStartRowLine + 5} / 2 / ${employeeBlockStartRowLine + 6} / 3` };
      case 'wage':         return { gridArea: `${employeeBlockStartRowLine + 6} / 2 / ${employeeBlockStartRowLine + dataRowsPerEmployeeBlock} / 3` };
      default: return {};
    }
  };
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
      {!showLoading && !error && Array.isArray(employees) && (
        <div className='responsive-grid employees-grid'> {/* Updated class */}
          {/* Headers */}
          <div className='grid-header'>Name</div>
          <div className='grid-header'>Employee Code</div>
          <div className='grid-header'>Email</div>
          <div className='grid-header'>Admin</div>
          <div className='grid-header'>Overtime</div>
          <div className='grid-header'>Expected Hours</div>
          <div className='grid-header'>Holiday Multiplier</div>
          <div className='grid-header'>Wage</div>
          {user?.role === 'employer' && <div className='grid-header actions-header'>Actions</div>}
          {/* Small screen headers will be positioned by SCSS */}

          {filteredEmployees.length === 0 ? (
            <div className='grid-cell no-results-message' style={{ gridColumn: '1 / -1' }}> {/* Updated class */}
              {search ? 'No employees match your search.' : (Array.isArray(employees) && employees.length === 0 ? 'No employees found.' : 'No employees match your search.')}
            </div>
          ) : (
            filteredEmployees.map((emp, employeeIndex) => ( // Added employeeIndex
              <React.Fragment key={emp._id}>
                <div className="grid-cell" style={getEmployeeCellStyle(employeeIndex, 'name')} data-label='Name'>{emp.name || '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(employeeIndex, 'employeeCode')} data-label='Code'>{emp.employeeCode || '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(employeeIndex, 'email')} data-label='Email'>{emp.email || '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(employeeIndex, 'isAdmin')} data-label='Admin'>{emp.isAdmin ? 'Yes' : 'No'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(employeeIndex, 'overtime')} data-label='Overtime'>{emp.overtime ? 'Yes' : 'No'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(employeeIndex, 'expectedHours')} data-label='Expected Hrs'>{emp.expectedHours != null ? `${emp.expectedHours} hrs` : '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(employeeIndex, 'holidayMultiplier')} data-label='Holiday X'>{emp.holidayMultiplier != null ? emp.holidayMultiplier : '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(employeeIndex, 'wage')} data-label='Wage'>{emp.wage != null ? `$${emp.wage.toFixed(2)}/hr` : '--'}</div>
                {user?.role === 'employer' && (
                  <div className="grid-cell actions-cell" style={getEmployeeCellStyle(employeeIndex, 'actions')} data-label='Actions'>
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
                      disabled={employeeStatus === 'loading'}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                )}
              </React.Fragment>
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
