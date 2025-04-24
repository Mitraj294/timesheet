import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getEmployees, deleteEmployee } from "../../redux/actions/employeeActions";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faIdCard, faTrash, faPlus, faSpinner, faExclamationCircle } from "@fortawesome/free-solid-svg-icons"; // Added spinner/error icons
import "../../styles/Employees.scss"; // Ensure path is correct

// Removed API_URL as it wasn't used directly in this component

const Employees = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Use state selectors with default values for robustness
  const { employees = [], loading, error } = useSelector((state) => state.employees || { employees: [], loading: false, error: null });
  const { user } = useSelector((state) => state.auth || {}); // Get logged-in user

  useEffect(() => {
    // Fetch employees if not already loaded or if forced refresh is needed
    // Consider adding logic here if you want to re-fetch under certain conditions
    if (!employees.length && !loading) { // Only fetch if not already loading and empty
      dispatch(getEmployees());
    }
  }, [dispatch, employees.length, loading]); // Added loading to dependency array

  const handleDelete = (id, name) => {
    // Add employee name to confirmation for clarity
    if (window.confirm(`Are you sure you want to delete employee "${name}"? This action cannot be undone.`)) {
      dispatch(deleteEmployee(id));
      // Optionally: Add success/error feedback handling after dispatch completes
    }
  };

  // console.log("Redux Employees State:", employees); // Keep for debugging if needed

  return (
    <div className="employees-container">

      {/* Header Section - Styled consistently */}
      <div className="employees-header">
        <div className="title-breadcrumbs"> {/* Changed class name */}
          <h2>
            <FontAwesomeIcon icon={faIdCard} /> Employees
          </h2>
          <div className="breadcrumbs"> {/* Changed class name */}
            <Link to="/dashboard" className="breadcrumb-link">
              Dashboard
            </Link>
            <span className="breadcrumb-separator"> / </span> {/* Added class */}
            <span className="breadcrumb-current">Employees</span> {/* Added class */}
          </div>
        </div>

        {/* Add Employee Button - Styled consistently */}
        {user?.role === "employer" && (
          <button className="btn btn-primary add-employee-btn" onClick={() => navigate("/employees/add")}>
            <FontAwesomeIcon icon={faPlus} /> Add Employee
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-indicator">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>Loading employees...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-message"> {/* Use consistent error message style */}
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>Error loading employees: {error.message || error}</p> {/* Display error message */}
          <button className="btn btn-secondary" onClick={() => dispatch(getEmployees())}>Retry</button> {/* Optional retry button */}
        </div>
      )}

      {/* Employee Table/List - Wrapper for responsiveness */}
      {!loading && !error && (
        <div className="employee-table-wrapper"> {/* Wrapper for horizontal scroll */}
          <table className="employee-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee Code</th>
                <th>Email</th>
                <th>Admin</th>
                <th>Overtime</th>
                <th>Expected Hours</th>
                <th>Holiday Multiplier</th>
                <th>Wage</th>
                {user?.role === "employer" && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <tr key={emp._id}>
                    <td data-label="Name">{emp.name}</td> {/* Added data-label for mobile */}
                    <td data-label="Code">{emp.employeeCode}</td>
                    <td data-label="Email">{emp.email}</td>
                    <td data-label="Admin">{emp.isAdmin ? "Yes" : "No"}</td>
                    <td data-label="Overtime">{emp.overtime ? "Yes" : "No"}</td>
                    <td data-label="Expected Hrs">{emp.expectedHours} hrs</td>
                    <td data-label="Holiday X">{emp.holidayMultiplier}</td>
                    <td data-label="Wage">${emp.wage}/hr</td>
                    {user?.role === "employer" && (
                      <td data-label="Actions" className="employee-actions"> {/* Added class */}
                        {/* Using btn-icon style */}
                        <button
                          className="btn-icon btn-icon-yellow" /* Use consistent icon button style */
                          onClick={() => navigate(`/employees/edit/${emp._id}`)}
                          aria-label={`Edit ${emp.name}`} /* Accessibility */
                          title={`Edit ${emp.name}`} /* Tooltip */
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          className="btn-icon btn-icon-red" /* Use consistent icon button style */
                          onClick={() => handleDelete(emp._id, emp.name)}
                          aria-label={`Delete ${emp.name}`} /* Accessibility */
                          title={`Delete ${emp.name}`} /* Tooltip */
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  {/* Adjust colspan based on whether Actions column is visible */}
                  <td colSpan={user?.role === "employer" ? 9 : 8} className="no-data-cell">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Employees;
