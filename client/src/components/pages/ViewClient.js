// /home/digilab/timesheet/client/src/components/pages/ViewClient.js
import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  fetchClientById, selectCurrentClient, selectCurrentClientStatus, selectCurrentClientError, clearCurrentClient // Client-specific Redux actions and selectors
} from "../../redux/slices/clientSlice";
import {
  fetchProjects, deleteProject, selectProjectsByClientId, selectProjectStatus, selectProjectError, clearProjects, clearProjectError
} from "../../redux/slices/projectSlice";
import {
  fetchTimesheets, selectAllTimesheets, selectTimesheetStatus, selectTimesheetError
} from "../../redux/slices/timesheetSlice";
import { setAlert } from "../../redux/slices/alertSlice";
import {
  faUser,
  faPlus,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faClock,
  faEye,
  faPen,
  faTrash,
  faSpinner,
  faExclamationCircle,
  faBriefcase,
} from "@fortawesome/free-solid-svg-icons";
import Alert from "../layout/Alert";
import "../../styles/Vehicles.scss"; // Reusing some styles for consistency
import "../../styles/ViewClient.scss"; // Specific styles for this page

const ViewClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux state selectors
  const client = useSelector(selectCurrentClient);
  const clientStatus = useSelector(selectCurrentClientStatus);
  const clientError = useSelector(selectCurrentClientError);
  const projects = useSelector(state => selectProjectsByClientId(state, clientId));
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);
  const allTimesheets = useSelector(selectAllTimesheets);
  const timesheetStatus = useSelector(selectTimesheetStatus);
  const timesheetError = useSelector(selectTimesheetError);
  const { user } = useSelector((state) => state.auth || {});

  // Local component state
  const [clientTotalHours, setClientTotalHours] = useState(0);
  // const [error, setError] = useState(null); // Local errors are now handled via alerts
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Stores { id, name } for project deletion confirmation

  // Effects
  // Fetches client details, their projects, and all timesheets on component mount or when clientId changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch(fetchClientById(clientId));
        dispatch(fetchProjects(clientId)); // Fetch projects for this client
        if (timesheetStatus !== 'succeeded' && timesheetStatus !== 'loading') {
            dispatch(fetchTimesheets());
        }

      } catch (err) {
        console.error("Error fetching data:", err);
        let errorMessage = "Failed to fetch data from the server.";
        if (err.message === "Authentication token not found.") {
            errorMessage = "Authentication required. Please log in.";
        } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
        } else if (err.message) {
            errorMessage = err.message;
        }
        dispatch(setAlert(errorMessage, 'danger'));
      }
    };

    fetchData();

    // Cleanup when component unmounts or clientId changes
    return () => {
        dispatch(clearCurrentClient());
        dispatch(clearProjects());
        dispatch(clearProjectError());
    };
  }, [clientId, dispatch, timesheetStatus]);

  // Calculates total hours for the client when timesheets or clientId change
  useEffect(() => {
    if (timesheetStatus === 'succeeded' && clientId) {
      const filtered = allTimesheets.filter(
        (t) => (t.clientId?._id || t.clientId) === clientId && (!t.leaveType || t.leaveType === "None")
      );
      const total = filtered.reduce(
        (sum, t) => sum + (parseFloat(t.totalHours) || 0),
        0
      );
      setClientTotalHours(total);
    }
  }, [allTimesheets, timesheetStatus, clientId]);

  // Displays errors from Redux state (client, project, timesheet fetch) as alerts
  useEffect(() => {
    const reduxError = clientError || projectError || timesheetError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [clientError, projectError, timesheetError, dispatch]);

  // Handlers
  // Initiates the project deletion process
  const handleDeleteClick = (projectId, projectName) => {
    setItemToDelete({ id: projectId, name: projectName });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  // Confirms and dispatches the delete action for a project
  const confirmDeleteProject = async () => {
    if (!itemToDelete) return;
    const { id: projectId, name: projectName } = itemToDelete;
    // setError(null); // Local error state removed, alerts handle this

    try {
      await dispatch(deleteProject(projectId)).unwrap();
      dispatch(setAlert(`Project "${projectName}" deleted successfully.`, 'success'));
    } catch (err) {
      console.error("Error deleting project:", err);
      let errorMessage = `Failed to delete project "${projectName}".`; // Default message
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      dispatch(setAlert(String(errorMessage), 'danger'));
    }
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  // Derived state for UI
  const isLoading = useMemo(() =>
    clientStatus === 'loading' || projectStatus === 'loading' || timesheetStatus === 'loading',
    [clientStatus, projectStatus, timesheetStatus]
  );
  const isDeletingProject = projectStatus === 'loading'; // True if a project delete/update operation is in progress

  // Defines the CSS grid column layout for the projects table
  const projectGridColumns = '1fr 1.5fr 1fr 1fr 1.5fr 1fr 1.5fr auto';

  // Render logic
  if (isLoading && clientStatus !== 'succeeded') { // Show loading if client data isn't ready
    return (
      <div className="vehicles-page"> {/* Use standard page class */}
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading client data...</p>
        </div>
      </div>
    );
  }

  // Handles case where client data is not available after loading attempts
  if (!client) {
     return (
      <div className="vehicles-page">
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>Client data could not be loaded.</p>
           <Link to="/clients" className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Clients</Link>
        </div>
      </div>
     );
  }

  return (
    <div className="vehicles-page">
      <Alert />
      <div className="vehicles-header">
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faUser} /> View Client
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to="/clients" className="breadcrumb-link">Clients</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">{client.name}</span>
          </div>
        </div>
         {user?.role === "employer" && (
            <div className="header-actions">
                 <button
                    className="btn btn-warning"
                    onClick={() => navigate(`/clients/update/${clientId}`)}
                    title={`Edit Client ${client.name}`}
                 >
                    <FontAwesomeIcon icon={faPen} /> Edit Client
                 </button>
                 <button
                    className="btn btn-success"
                    onClick={() => navigate(`/clients/${clientId}/create-project`)}
                    title="Create New Project for this Client"
                  >
                    <FontAwesomeIcon icon={faPlus} /> Create Project
                  </button>
            </div>
         )}
      </div>

      {/* Client Summary Section */}
      <div className="client-summary-section">
        <h3 className="section-heading">Client Summary</h3>
        <div className="client-summary-cards">
          <div className="summary-card client-details-card">
            <FontAwesomeIcon icon={faUser} className="client-avatar-icon" size="3x" />
            <div className="card-content">
              <h4 className="client-name-summary">{client.name}</h4>
              <div className="contact-info">
                <div className="info-item">
                  <FontAwesomeIcon icon={faEnvelope} className="info-icon" />
                  <p>{client.emailAddress || '--'}</p>
                </div>
                <div className="info-item">
                  <FontAwesomeIcon icon={faPhone} className="info-icon" />
                  <p>{client.phoneNumber || '--'}</p>
                </div>
                <div className="info-item">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="info-icon" />
                  <p>{client.address || '--'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="summary-card client-hours-card">
            <div className="card-content">
              <p className="hours-label">Total Hours</p>
              <h2 className="hours-value">{clientTotalHours.toFixed(2)}h</h2>
            </div>
            <FontAwesomeIcon icon={faClock} className="hours-icon" />
          </div>
        </div>
      </div>

      {/* Projects Section for this Client */}
      <div className="projects-section">
        <div className="section-header">
            <h3><FontAwesomeIcon icon={faBriefcase} /> Projects</h3>
        </div>

        <div className="vehicles-grid">
          <div className="vehicles-row header" style={{ gridTemplateColumns: projectGridColumns }}>
            <div>Status</div>
            <div>Name</div>
            <div>Start Date</div>
            <div>Finish Date</div>
            <div>Address</div>
            <div>Expected Hours</div>
            <div>Notes</div>
            {user?.role === "employer" && <div>Actions</div>}
          </div>
          {projectStatus === 'loading' && projects.length === 0 && !isDeletingProject && (
             <div className='loading-indicator' style={{ gridColumn: '1 / -1' }}>
                <FontAwesomeIcon icon={faSpinner} spin /> Loading projects...
             </div>
          )}

          {projectStatus !== 'loading' && projects.length === 0 && !isDeletingProject ? (
            <div className="vehicles-row no-results">
              No projects found for this client.
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project._id}
                className="vehicles-row vehicle-card"
                style={{ gridTemplateColumns: projectGridColumns }}
              >
                <div data-label="Status">{project.status || '--'}</div>
                <div data-label="Name">{project.name || '--'}</div>
                <div data-label="Start Date">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '--'}</div>
                <div data-label="Finish Date">{project.finishDate ? new Date(project.finishDate).toLocaleDateString() : '--'}</div>
                <div data-label="Address">{project.address || '--'}</div>
                <div data-label="Expected Hrs">{project.expectedHours != null ? `${project.expectedHours} h` : '--'}</div>
                <div data-label="Notes">{project.notes || '--'}</div>
                <div data-label="Actions" className="actions">
                  <button
                    className="btn-icon btn-icon-blue"
                    onClick={() => navigate(`/clients/${clientId}/projects/view/${project._id}`)}
                    title={`View ${project.name}`}
                    aria-label={`View ${project.name}`}
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  {user?.role === "employer" && (
                    <>
                    <button
                      className="btn-icon btn-icon-yellow"
                      onClick={() => navigate(`/clients/${clientId}/projects/update/${project._id}`)}
                      title={`Edit ${project.name}`}
                      aria-label={`Edit ${project.name}`}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button> 
                    <button
                      className="btn-icon btn-icon-red"
                      onClick={() => handleDeleteClick(project._id, project.name)}
                      title={`Delete ${project.name}`}
                      aria-label={`Delete ${project.name}`}
                      disabled={isDeletingProject}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Project Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay">
            <div className="logout-confirm-dialog">
              <h4>Confirm Project Deletion</h4>
              <p>Are you sure you want to permanently delete project "<strong>{itemToDelete.name}</strong>"? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeletingProject}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteProject} disabled={isDeletingProject}>
                  {isDeleting ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete Project'}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default ViewClient;
