// /home/digilab/timesheet/client/src/components/pages/ViewProject.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Redux Imports
import {
  fetchProjectById, deleteProject,
  selectCurrentProject, selectCurrentProjectStatus, selectCurrentProjectError, selectProjectStatus,
  clearCurrentProject, clearProjectError
} from "../../redux/slices/projectSlice";
import { setAlert } from "../../redux/slices/alertSlice";
import Alert from "../layout/Alert"; // Import Alert component

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

  // Redux State
  const project = useSelector(selectCurrentProject);
  const projectStatus = useSelector(selectCurrentProjectStatus);
  const projectError = useSelector(selectCurrentProjectError);
  const deleteStatus = useSelector(selectProjectStatus); // Use general status for delete

  // Local State
  // const [error, setError] = useState(null); // Replaced by Alert
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id, name }

  const { user } = useSelector((state) => state.auth || {});

  useEffect(() => {
    const fetchProjectData = async () => {
      // setError(null); // Replaced by Alert

      try {
        dispatch(fetchProjectById(projectId));
      } catch (err) {
        console.error("Error fetching project data:", err);
        const errorMessage = err?.message || "Failed to initiate project fetch.";
        // setError(errorMessage); // Replaced by Alert
        dispatch(setAlert(errorMessage, 'danger'));
      }
    };

    fetchProjectData();

    // Cleanup
    return () => {
        dispatch(clearCurrentProject());
        dispatch(clearProjectError());
    };
  }, [projectId, dispatch]);

  // Effect to show alerts for fetch errors from Redux state
  useEffect(() => {
    if (projectError) {
      dispatch(setAlert(projectError, 'danger'));
      // Optionally clear the Redux error after showing the alert
      // dispatch(clearProjectError());
    }
  }, [projectError, dispatch]);

  // --- Refactored Delete Confirmation ---
  const handleDeleteClick = (projectId, projectName) => {
    setItemToDelete({ id: projectId, name: projectName });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleProjectChangeInTimesheet = useCallback((newProjectId) => {
    if (newProjectId && newProjectId !== projectId && newProjectId !== ALL_PROJECTS_VALUE) {
      const currentClientId = project?.clientId?._id || clientId || 'unknown';
      const targetUrl = `/clients/view/${currentClientId}/project/${newProjectId}`;
      navigate(targetUrl);
    }
  }, [navigate, projectId, project, clientId]);


  const handleDeleteProject = async () => {
      if (!project || !window.confirm(`Are you sure you want to delete project "${project.name}"? This action cannot be undone.`)) {
          return;
      } // This window.confirm should be removed, handled by modal now
      if (!itemToDelete) return; // Ensure itemToDelete is set
      const { id: projectIdToDelete, name: projectNameToDelete } = itemToDelete;
      dispatch(clearProjectError()); // Clear Redux error
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
          console.error("Failed to delete project:", err); // Keep console log
          const errorMessage = err?.message || `Failed to delete project "${projectNameToDelete}".`;
          dispatch(setAlert(errorMessage, 'danger'));
      } finally {
          setShowDeleteConfirm(false); // Close modal
          setItemToDelete(null);
      }
  };

  // Combined loading/error states
  const isLoading = useMemo(() => projectStatus === 'loading', [projectStatus]);
  const isDeleting = deleteStatus === 'loading'; // Use Redux status for disabling buttons
  // const combinedError = useMemo(() => error || projectError, [error, projectError]); // Replaced by useEffect

  if (isLoading && !project) { // Show loading only if project data isn't available yet
    return (
      <div className="vehicles-page">
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  // Error state handled by Alert component via useEffect
  /*
  if (projectError && !project) {
    return (
      <div className="vehicles-page">
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{projectError}</p>
          {clientId && clientId !== 'unknown' ? (
             <Link to={`/clients/view/${clientId}`} className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Client</Link>
          ) : (
             <Link to="/projects" className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Projects</Link>
          )}
        </div>
      </div>
    );
  }
  */

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
      <Alert /> {/* Render Alert component here */}
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
                disabled={isDeleting} // Use Redux status
              >
                <FontAwesomeIcon icon={faEdit} /> Edit Project
              </button>
              {/* <button // Original button, replaced by modal trigger
                onClick={handleDeleteProject}
                disabled={isDeleting || deleteStatus === 'loading'} // Disable based on Redux status or local delete state
                className="btn btn-danger"
              >
                {isDeleting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
                {isDeleting ? ' Deleting...' : ' Delete Project'}
              </button>
              */}
              <button
                onClick={() => handleDeleteClick(project._id, project.name)} // Trigger modal
                disabled={isDeleting} // Use Redux status
                className="btn btn-danger"
              >
                <FontAwesomeIcon icon={faTrash} /> Delete Project
              </button>
            </div>
         )}
      </div>

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
          <div className="summary-card client-hours-card project-hours-card">
             <div className="card-content">
               <p className="hours-label">Expected Hours</p>
               <h2 className="hours-value">{project.expectedHours != null ? `${project.expectedHours}h` : '--'}</h2>
             </div>
             <FontAwesomeIcon icon={faClock} className="hours-icon" />
          </div>
          <div className="summary-card client-hours-card project-hours-card actual-hours-card">
             <div className="card-content">
               <p className="hours-label">Actual Hours</p>
               <h2 className="hours-value">
                 {typeof project.totalActualHours === "number" ? project.totalActualHours.toFixed(1) : "0.0"}h
               </h2>
             </div>
             <FontAwesomeIcon icon={faClock} className="hours-icon actual-icon" />
          </div>
        </div>
      </div>

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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay"> {/* Re-use styles */}
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
