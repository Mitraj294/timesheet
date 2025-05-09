// /home/digilab/timesheet/client/src/components/pages/ViewProject.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
// The following imports are from open-source packages and are used under their respective licenses.
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  fetchProjectById, deleteProject,
  selectCurrentProject, selectCurrentProjectStatus, selectCurrentProjectError, selectProjectStatus,
  clearCurrentProject, clearProjectError
} from "../../redux/slices/projectSlice";
import { setAlert } from "../../redux/slices/alertSlice";
import Alert from "../layout/Alert";
import { selectAuthUser } from '../../redux/slices/authSlice';
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus } from '../../redux/slices/employeeSlice';
import { selectAllTimesheets, selectTimesheetStatus } from '../../redux/slices/timesheetSlice';

import {
  faProjectDiagram,
  faCalendarAlt,
  faCalendarCheck,
  faClock,
  faEdit,
  faTrash,
  faSpinner,
  faExclamationCircle,
  faUser,
  faBriefcase,
} from "@fortawesome/free-solid-svg-icons";
import ProjectTimesheet from "./ProjectTimesheet";
import "../../styles/Vehicles.scss";
import "../../styles/ViewProject.scss";

const ALL_PROJECTS_VALUE = 'ALL_PROJECTS';

const ViewProject = () => {
  const { clientId, projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state
  const project = useSelector(selectCurrentProject);
  const projectStatus = useSelector(selectCurrentProjectStatus);
  const projectError = useSelector(selectCurrentProjectError);
  const deleteStatus = useSelector(selectProjectStatus); // Use general status for delete

  const user = useSelector(selectAuthUser);
  const allEmployees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const allTimesheets = useSelector(selectAllTimesheets);
  const timesheetStatus = useSelector(selectTimesheetStatus); // To track loading of timesheets

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Stores { id, name } for deletion confirmation

  // const { user } = useSelector((state) => state.auth || {}); // This was a duplicate declaration of 'user'

  // Effects
  // Fetches project data when the component mounts or when the projectId from the URL changes
  // Also fetches employees if they haven't been loaded yet.
  useEffect(() => {
    if (projectId) {
      dispatch(fetchProjectById(projectId));
    }

    // Fetch employees if not already loaded or loading
    // Relies on ProjectTimesheet component to fetch relevant timesheets
    if (employeeStatus === 'idle') {
      dispatch(fetchEmployees());
    }

    // Cleanup: clear the current project data and any related errors when the component unmounts or projectId changes
    return () => {
        // dispatch(clearEmployees()); // If you have such an action
        dispatch(clearCurrentProject());
        dispatch(clearProjectError());
    };
  }, [projectId, dispatch]);

  // Displays errors from Redux state (e.g., project fetch errors) as global alerts
  useEffect(() => {
    if (projectError) {
      dispatch(setAlert(projectError, 'danger'));
    }
  }, [projectError, dispatch]);

  const loggedInEmployeeRecord = useMemo(() => {
    if (user?.role === 'employee' && Array.isArray(allEmployees) && allEmployees.length > 0 && user?._id) {
      return allEmployees.find(emp => emp.userId === user._id);
    }
    return null;
  }, [allEmployees, user]);

  const yourTotalHoursOnProject = useMemo(() => {
    if (user?.role === 'employee' && loggedInEmployeeRecord && project && Array.isArray(allTimesheets)) {
      const employeeProjectTimesheets = allTimesheets.filter(ts => {
        // Ensure correct comparison for potentially populated fields
        const projectMatch = (ts.projectId?._id || ts.projectId) === project._id;
        const employeeMatch = (ts.employeeId?._id || ts.employeeId) === loggedInEmployeeRecord._id;
        return projectMatch && employeeMatch;
      });
      return employeeProjectTimesheets.reduce((sum, ts) => sum + (parseFloat(ts.totalHours) || 0), 0);
    }
    return 0;
  }, [user, loggedInEmployeeRecord, project, allTimesheets]);




  // Handlers
  // Sets up the state for the delete confirmation modal
  const handleDeleteClick = (projectId, projectName) => {
    setItemToDelete({ id: projectId, name: projectName });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  // Handles project change within the embedded ProjectTimesheet component
  const handleProjectChangeInTimesheet = useCallback((newProjectId) => {
    if (newProjectId && newProjectId !== projectId && newProjectId !== ALL_PROJECTS_VALUE) {
      const currentClientId = project?.clientId?._id || clientId || 'unknown';
      const targetUrl = `/clients/view/${currentClientId}/project/${newProjectId}`;
      navigate(targetUrl);
    }
  }, [navigate, projectId, project, clientId]);

  // Actually dispatches the delete action after user confirmation
  const handleDeleteProject = async () => {
      if (!itemToDelete) return; // Ensure itemToDelete is set
      const { id: projectIdToDelete, name: projectNameToDelete } = itemToDelete;
      dispatch(clearProjectError()); // Clear previous Redux errors
      try {
          await dispatch(deleteProject(projectId)).unwrap();
          dispatch(setAlert(`Project "${project.name}" deleted successfully.`, 'success'));

          const clientIdToNavigate = project?.clientId?._id || clientId || 'unknown';
          if (clientIdToNavigate !== 'unknown') {
              navigate(`/clients/view/${clientIdToNavigate}`);
          } else {
              navigate('/clients'); // Fallback if client context is lost
          }
      } catch (err) {
          const errorMessage = err?.message || `Failed to delete project "${projectNameToDelete}".`;
          dispatch(setAlert(errorMessage, 'danger'));
      } finally {
          setShowDeleteConfirm(false); // Close modal
          setItemToDelete(null);
      }
  };

  // Derived state for UI
  const isLoading = useMemo(() =>
    projectStatus === 'loading' ||
    (user?.role === 'employee' && employeeStatus === 'loading') || // Also consider employee loading for employee view
    (user?.role === 'employee' && timesheetStatus === 'loading' && yourTotalHoursOnProject === 0), // And timesheet loading for employee hours
    [projectStatus, user, employeeStatus, timesheetStatus, yourTotalHoursOnProject]);
  const isDeleting = deleteStatus === 'loading'; // True if a delete operation is in progress

  if (isLoading && !project) { // Show a loading indicator if project data isn't available yet
    return (
      <div className="vehicles-page">
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  // Render

  // Handles the case where project data is not available after loading attempts
  if (!project) {
     return (
      <div className="vehicles-page">
        {/* Alert component will show fetch errors if any */}
        <Alert />
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>Project data could not be loaded or is unavailable.</p>
           {clientId && clientId !== 'unknown' ? (
             <Link to={`/clients/view/${clientId}`} className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Client</Link>
          ) : (
             <Link to="/projects" className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Projects</Link>
          )}
        </div>
      </div>
     );
  }

  return (
    <div className="vehicles-page view-project-container">
      <Alert />
      <div className="vehicles-header">
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faProjectDiagram} /> View Project
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            {project.clientId?._id ? (
                <>
                    <Link to="/clients" className="breadcrumb-link">Clients</Link>
                    <span className="breadcrumb-separator"> / </span>
                    <Link to={`/clients/view/${project.clientId._id}`} className="breadcrumb-link">
                        {project.clientId?.name || 'Client'}
                    </Link>
                    <span className="breadcrumb-separator"> / </span>
                </>
            ) : (
                 <>
                    <Link to="/projects" className="breadcrumb-link">Projects</Link>
                    <span className="breadcrumb-separator"> / </span>
                 </>
            )}
            <span className="breadcrumb-current">{project.name}</span>
          </div>
        </div>
         {user?.role === "employer" && (
            <div className="header-actions">
              <button
                className="btn btn-warning"
                onClick={() => {
                    const editClientId = project.clientId?._id || clientId || 'unknown';
                    if (editClientId !== 'unknown') {
                        navigate(`/clients/${editClientId}/projects/update/${project._id}`)
                    } else {
                        console.warn("Cannot navigate to edit project: Client ID is unknown.");
                        dispatch(setAlert("Cannot edit project: Client information is missing.", 'warning'));
                        // setError("Cannot edit project: Client information is missing."); // Replaced by Alert
                    }
                }}
                disabled={isDeleting}
              >
                <FontAwesomeIcon icon={faEdit} /> Edit Project
              </button>
              <button
                onClick={() => handleDeleteClick(project._id, project.name)}
                disabled={isDeleting}
                className="btn btn-danger"
              >
                <FontAwesomeIcon icon={faTrash} /> Delete Project
              </button>
            </div>
         )}
      </div>
      
      {/* Project Summary Section */}
      <div className="client-summary-section project-summary-section">
        <h3 className="section-heading">Project Summary</h3>
        <div className="client-summary-cards project-summary-cards">
          <div className="summary-card client-details-card project-details-card">
            <FontAwesomeIcon icon={faProjectDiagram} className="client-avatar-icon project-avatar-icon" size="3x" />
            <div className="card-content">
              <h4 className="client-name-summary project-name-summary">{project.name}</h4>
              <div className="contact-info project-dates-info">
                {project.clientId?._id ? (
                    <div className="info-item">
                        <FontAwesomeIcon icon={faUser} className="info-icon" />
                        <Link to={`/clients/view/${project.clientId._id}`}>
                            {project.clientId?.name || 'View Client'}
                        </Link>
                    </div>
                ) : (
                    <div className="info-item">
                        <FontAwesomeIcon icon={faUser} className="info-icon" />
                        <span>No Client Linked</span>
                    </div>
                )}
                <div className="info-item">
                  <FontAwesomeIcon icon={faCalendarAlt} className="info-icon" />
                  <p>Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : '--'}</p>
                </div>
                <div className="info-item">
                  <FontAwesomeIcon icon={faCalendarCheck} className="info-icon" />
                  <p>Finish: {project.finishDate ? new Date(project.finishDate).toLocaleDateString() : '--'}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Cards for Employer */}
          {user?.role === 'employer' && project && (
            <>
              <div className="summary-card client-hours-card project-hours-card">
                <div className="card-content">
                  <p className="hours-label">Expected Hours</p>
                  <h2 className="hours-value">{project.expectedHours != null ? `${project.expectedHours}h` : '--'}</h2>
                </div>
                <FontAwesomeIcon icon={faClock} className="hours-icon" />
              </div>
              <div className="summary-card client-hours-card project-hours-card actual-hours-card">
                <div className="card-content">
                  <p className="hours-label">Actual Hours (Overall)</p>
                  <h2 className="hours-value">
                    {typeof project.totalActualHours === "number" ? project.totalActualHours.toFixed(1) : "0.0"}h
                  </h2>
                </div>
                <FontAwesomeIcon icon={faClock} className="hours-icon actual-icon" />
              </div>
            </>
          )}
          {/* Card for Employee */}
          {user?.role === 'employee' && loggedInEmployeeRecord && project && (
            <div className="summary-card client-hours-card project-hours-card employee-specific-hours-card">
              <div className="card-content">
                <p className="hours-label">Your Total Hours</p>
                <h2 className="hours-value">
                  {yourTotalHoursOnProject.toFixed(1)}h
                </h2>
              </div>
              <FontAwesomeIcon icon={faClock} className="hours-icon" />
            </div>
          )}
        </div>
      </div>

      {/* Embedded ProjectTimesheet component to show timesheets for this project */}
      <div className="projects-section timesheet-details-section">
        <div className="section-header">
            <h3><FontAwesomeIcon icon={faBriefcase} /> Timesheets</h3>
        </div>
        <ProjectTimesheet
            initialProjectId={projectId}
            onProjectChange={handleProjectChangeInTimesheet}
            showProjectSelector={true}
        />
      </div>

      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay">
            <div className="logout-confirm-dialog">
              <h4>Confirm Project Deletion</h4>
              <p>Are you sure you want to permanently delete project "<strong>{itemToDelete.name}</strong>"? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeleting}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDeleteProject} disabled={isDeleting}>
                  {isDeleting ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete Project'}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default ViewProject;
