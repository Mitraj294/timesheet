// /home/digilab/timesheet/client/src/components/pages/ViewClient.js
import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Redux Imports
import {
  fetchClientById, selectCurrentClient, selectCurrentClientStatus, selectCurrentClientError, clearCurrentClient
} from "../../redux/slices/clientSlice";
import {
  fetchProjects, deleteProject, selectProjectsByClientId, selectProjectStatus, selectProjectError, clearProjects, clearProjectError
} from "../../redux/slices/projectSlice";
import {
  fetchTimesheets, selectAllTimesheets, selectTimesheetStatus, selectTimesheetError
} from "../../redux/slices/timesheetSlice";
import { setAlert } from "../../redux/slices/alertSlice"; // Import setAlert

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
import Alert from "../layout/Alert"; // Import Alert component
// Import the shared SCSS file
import "../../styles/Vehicles.scss"; // *** Use Vehicles.scss ***
import "../../styles/ViewClient.scss"; // *** Use ViewClient.scss ***

const ViewClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux State
  const client = useSelector(selectCurrentClient);
  const clientStatus = useSelector(selectCurrentClientStatus);
  const clientError = useSelector(selectCurrentClientError);
  // Use selector with argument for projects
  const projects = useSelector(state => selectProjectsByClientId(state, clientId));
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);
  const allTimesheets = useSelector(selectAllTimesheets);
  const timesheetStatus = useSelector(selectTimesheetStatus);
  const timesheetError = useSelector(selectTimesheetError);
  const { user } = useSelector((state) => state.auth || {});

  // Local State
  const [clientTotalHours, setClientTotalHours] = useState(0);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id, name }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Dispatch fetch actions
        dispatch(fetchClientById(clientId));
        dispatch(fetchProjects(clientId)); // Fetch projects for this client
        // Fetch timesheets if not already loaded/succeeded
        if (timesheetStatus !== 'succeeded' && timesheetStatus !== 'loading') {
            dispatch(fetchTimesheets());
        }

      } catch (err) {
        console.error("Error fetching data:", err);
        let errorMessage = "Failed to fetch data from the server.";
        if (err.message === "Authentication token not found.") {
            errorMessage = "Authentication required. Please log in.";
            // navigate("/login"); // Let auth handling redirect
        } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
        } else if (err.message) {
            errorMessage = err.message;
        }
        dispatch(setAlert(errorMessage, 'danger'));
      }
    };

    fetchData();

    // Cleanup function
    return () => {
        dispatch(clearCurrentClient());
        dispatch(clearProjects()); // Clear projects when leaving the page
        dispatch(clearProjectError()); // Clear project errors
    };
  }, [clientId, dispatch, timesheetStatus]); // Depend on clientId and dispatch

  // Calculate total hours when timesheets or client ID changes
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

  // Effect to show alerts for fetch errors from Redux state
  useEffect(() => {
    const reduxError = clientError || projectError || timesheetError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
      // Optionally clear the Redux error after showing the alert
    }
  }, [clientError, projectError, timesheetError, dispatch]);

  // --- Refactored Delete Confirmation ---
  const handleDeleteClick = (projectId, projectName) => {
    setItemToDelete({ id: projectId, name: projectName });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const confirmDeleteProject = async () => {
    if (!itemToDelete) return;
    const { id: projectId, name: projectName } = itemToDelete;

    setError(null); // Clear previous errors

    try {
      await dispatch(deleteProject(projectId)).unwrap();
      dispatch(setAlert(`Project "${projectName}" deleted successfully.`, 'success'));
    } catch (err) {
      console.error("Error deleting project:", err);
      let errorMessage = `Failed to delete project "${projectName}".`; // Default message
      if (err?.message) { // Prioritize err.message if it exists (covers SerializedError from unwrap)
        errorMessage = err.message;
      } else if (typeof err === 'string') { // Handle if err itself is a string (from rejectWithValue)
        errorMessage = err;
      }
      dispatch(setAlert(String(errorMessage), 'danger')); // Force conversion to string just in case
    }
    // Close modal after dispatching
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  // Combined loading and error states
  const isLoading = useMemo(() =>
    clientStatus === 'loading' || projectStatus === 'loading' || timesheetStatus === 'loading',
    [clientStatus, projectStatus, timesheetStatus]
  );
  const isDeleting = projectStatus === 'loading'; // Use Redux status for disabling buttons

  // Define grid columns for projects
  const projectGridColumns = '1fr 1.5fr 1fr 1fr 1.5fr 1fr 1.5fr auto';

  // Loading state for the whole page
  if (isLoading && clientStatus !== 'succeeded') { // Check specific client status
    return (
      <div className="vehicles-page"> {/* Use standard page class */}
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading client data...</p>
        </div>
      </div>
    );
  }

  // Error state if client data failed to load - Handled by Alert
  /*
  if (clientError && clientStatus === 'failed') {
    return (
      <div className="vehicles-page">
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{clientError}</p>
          <Link to="/clients" className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Clients</Link>
        </div>
      </div>
    );
  }
  */

  // Fallback if loading finished but client is still null
  if (!client) {
     return (
      <div className="vehicles-page"> {/* Use standard page class */}
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>Client data could not be loaded.</p>
           <Link to="/clients" className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Clients</Link>
        </div>
      </div>
     ); // Semicolon moved after parenthesis
  }

  return (
    // Use standard page class
    <div className="vehicles-page">
      <Alert /> {/* Render Alert component here */}
      {/* Use standard header */}
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
        {/* Use standard header actions */}
         {user?.role === "employer" && (
            <div className="header-actions">
                 <button
                    className="btn btn-warning" // Yellow for Edit
                    onClick={() => navigate(`/clients/update/${clientId}`)}
                    title={`Edit Client ${client.name}`}
                 >
                    <FontAwesomeIcon icon={faPen} /> Edit Client
                 </button>
                 <button
                    className="btn btn-success" // Green for Create
                    onClick={() => navigate(`/clients/${clientId}/create-project`)}
                    title="Create New Project for this Client"
                  >
                    <FontAwesomeIcon icon={faPlus} /> Create Project
                  </button>
            </div>
         )}
      </div>

      {/* Display general errors below header - Handled by Alert */}
      {/*
      {combinedError && !clientError && (
         <div className='error-message' style={{marginBottom: '1rem'}}>
            <FontAwesomeIcon icon={faExclamationCircle} />
            <p>{String(combinedError)}</p>
         </div>
      )}
      */}

      {/* --- START: New Client Summary Section --- */}
      <div className="client-summary-section">
        <h3 className="section-heading">Client Summary</h3>
        <div className="client-summary-cards">
          {/* Card 1: Client Details */}
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
          {/* Card 2: Total Hours */}
          <div className="summary-card client-hours-card">
            <div className="card-content">
              <p className="hours-label">Total Hours</p>
              <h2 className="hours-value">{clientTotalHours.toFixed(2)}h</h2>
            </div>
            <FontAwesomeIcon icon={faClock} className="hours-icon" />
          </div>
        </div>
      </div>
      {/* --- END: New Client Summary Section --- */}


      {/* Projects Section */}
      <div className="projects-section">
        <div className="section-header">
            <h3><FontAwesomeIcon icon={faBriefcase} /> Projects</h3>
        </div>

        {/* Use standard grid for projects */}
        <div className="vehicles-grid"> {/* Use standard grid class */}
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

          {/* Display loading indicator inside grid if deleting */}
          {projectStatus === 'loading' && projects.length === 0 && !isDeleting && ( // Check project status
             <div className='loading-indicator' style={{ gridColumn: '1 / -1' }}>
                <FontAwesomeIcon icon={faSpinner} spin /> Loading projects...
             </div>
          )}

          {projectStatus !== 'loading' && projects.length === 0 && !isDeletingProject ? (
            <div className="vehicles-row no-results"> {/* Use standard no-results class */}
              No projects found for this client.
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project._id}
                className="vehicles-row vehicle-card" // Use standard card class
                style={{ gridTemplateColumns: projectGridColumns }}
              >
                <div data-label="Status">{project.status || '--'}</div>
                <div data-label="Name">{project.name || '--'}</div>
                <div data-label="Start Date">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '--'}</div>
                <div data-label="Finish Date">{project.finishDate ? new Date(project.finishDate).toLocaleDateString() : '--'}</div>
                <div data-label="Address">{project.address || '--'}</div>
                <div data-label="Expected Hrs">{project.expectedHours != null ? `${project.expectedHours} h` : '--'}</div>
                <div data-label="Notes">{project.notes || '--'}</div>
                {/* Always render the Actions cell, but conditionally render buttons inside */}
                <div data-label="Actions" className="actions"> {/* Use standard actions class */}
                  {/* View button always visible for authenticated users */}
                  <button
                    className="btn-icon btn-icon-blue" // Standard icon button
                    onClick={() => navigate(`/clients/${clientId}/projects/view/${project._id}`)}
                    title={`View ${project.name}`}
                    aria-label={`View ${project.name}`}
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  {/* Edit and Delete buttons only for employers */}
                  {user?.role === "employer" && (
                    <>
                    <button
                      className="btn-icon btn-icon-yellow" // Standard icon button
                      onClick={() => navigate(`/clients/${clientId}/projects/update/${project._id}`)}
                      title={`Edit ${project.name}`}
                      aria-label={`Edit ${project.name}`}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button> 
                    <button
                      className="btn-icon btn-icon-red" // Standard icon button
                      onClick={() => handleDeleteClick(project._id, project.name)} // Trigger modal
                      title={`Delete ${project.name}`}
                      aria-label={`Delete ${project.name}`}
                      disabled={isDeleting} // Use Redux status
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay"> {/* Re-use styles */}
            <div className="logout-confirm-dialog">
              <h4>Confirm Project Deletion</h4>
              <p>Are you sure you want to permanently delete project "<strong>{itemToDelete.name}</strong>"? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeleting}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteProject} disabled={isDeleting}>
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
