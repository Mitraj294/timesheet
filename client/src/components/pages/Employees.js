// /home/digilab/timesheet/client/src/components/pages/Employees.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchEmployees,
  deleteEmployee,
  selectAllEmployees,
  selectEmployeeStatus,
  selectEmployeeError
} from '../../redux/slices/employeeSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faIdCard,
  faTrash,
  faPlus,
  faSpinner,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/Employees.scss';

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Local state
  const [search, setSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  // Responsive layout
  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redux selectors
  const employees = useSelector(state => typeof selectAllEmployees === 'function' ? selectAllEmployees(state) : []);
  const employeeStatus = useSelector(state => typeof selectEmployeeStatus === 'function' ? selectEmployeeStatus(state) : 'idle');
  const error = useSelector(state => typeof selectEmployeeError === 'function' ? selectEmployeeError(state) : null);
  const { token, isLoading: isAuthLoading, isAuthenticated, user } = useSelector((state) => state.auth || {});

  // Fetch employees on mount if needed
  useEffect(() => {
    if (isAuthLoading) return;
    if (!token) return;
    if (employeeStatus === 'idle') {
      dispatch(fetchEmployees());
    }
  }, [dispatch, employeeStatus, token, isAuthLoading]);

  // Show error alerts
  useEffect(() => {
    if (error) dispatch(setAlert(error, 'danger'));
  }, [error, dispatch]);

  // Delete handlers
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
      .then(() => dispatch(setAlert(`Employee "${name}" deleted successfully.`, 'success')))
      .catch((err) => dispatch(setAlert(err?.message || `Failed to delete employee "${name}".`, 'danger')));
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  }, [itemToDelete, dispatch]);

  // Filter employees by search
  const filteredEmployees = Array.isArray(employees) ? employees.filter(
    (emp) =>
      emp?.name?.toLowerCase().includes(search.toLowerCase()) ||
      emp?.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
      emp?.email?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  // For small screens, position grid cells
  const getEmployeeCellStyle = (employeeIndex, fieldType) => {
    if (!isSmallScreen) return {};
    const headerRowCount = 7;
    const blockStart = (headerRowCount + 1) + (employeeIndex * headerRowCount);
    switch (fieldType) {
      case 'name':    return { gridArea: `${blockStart} / 1 / ${blockStart + headerRowCount} / 2` };
      case 'actions': return { gridArea: `${blockStart} / 3 / ${blockStart + headerRowCount} / 4` };
      case 'employeeCode': return { gridArea: `${blockStart + 0} / 2 / ${blockStart + 1} / 3` };
      case 'email':        return { gridArea: `${blockStart + 1} / 2 / ${blockStart + 2} / 3` };
      case 'isAdmin':      return { gridArea: `${blockStart + 2} / 2 / ${blockStart + 3} / 3` };
      case 'overtime':     return { gridArea: `${blockStart + 3} / 2 / ${blockStart + 4} / 3` };
      case 'expectedHours':return { gridArea: `${blockStart + 4} / 2 / ${blockStart + 5} / 3` };
      case 'holidayMultiplier': return { gridArea: `${blockStart + 5} / 2 / ${blockStart + 6} / 3` };
      case 'wage':         return { gridArea: `${blockStart + 6} / 2 / ${blockStart + headerRowCount} / 3` };
      default: return {};
    }
  };

  const showLoading = isAuthLoading || employeeStatus === 'loading';

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
            <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>Employees</span>
          </div>
        </div>
        <div className="header-actions">
          {user?.role === 'employer' && (
            <button
              className='btn btn-green'
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

      {!showLoading && !error && Array.isArray(employees) && (
        <div className='responsive-grid employees-grid'>
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

          {filteredEmployees.length === 0 ? (
            <div className='grid-cell no-results-message' style={{ gridColumn: '1 / -1' }}>
              {search ? 'No employees match your search.' : (Array.isArray(employees) && employees.length === 0 ? 'No employees found.' : 'No employees match your search.')}
            </div>
          ) : (
            filteredEmployees.map((emp, i) => (
              <React.Fragment key={emp._id}>
                <div className="grid-cell" style={getEmployeeCellStyle(i, 'name')} data-label='Name'>{emp.name || '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(i, 'employeeCode')} data-label='Code'>{emp.employeeCode || '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(i, 'email')} data-label='Email'>{emp.email || '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(i, 'isAdmin')} data-label='Admin'>{emp.isAdmin ? 'Yes' : 'No'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(i, 'overtime')} data-label='Overtime'>{emp.overtime ? 'Yes' : 'No'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(i, 'expectedHours')} data-label='Expected Hrs'>{emp.expectedHours != null ? `${emp.expectedHours} hrs` : '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(i, 'holidayMultiplier')} data-label='Holiday X'>{emp.holidayMultiplier != null ? emp.holidayMultiplier : '--'}</div>
                <div className="grid-cell" style={getEmployeeCellStyle(i, 'wage')} data-label='Wage'>{emp.wage != null ? `$${emp.wage.toFixed(2)}/hr` : '--'}</div>
                {user?.role === 'employer' && (
                  <div className="grid-cell actions-cell" style={getEmployeeCellStyle(i, 'actions')} data-label='Actions'>
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
