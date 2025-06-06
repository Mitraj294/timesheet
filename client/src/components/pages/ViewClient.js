// /home/digilab/timesheet/client/src/components/pages/ViewClient.js
import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  fetchClientById, selectCurrentClient, selectCurrentClientStatus, selectCurrentClientError, clearCurrentClient
} from "../../redux/slices/clientSlice";
import {
  fetchProjects, deleteProject, selectProjectsByClientId, selectProjectStatus, selectProjectError, clearProjects, clearProjectError
} from "../../redux/slices/projectSlice";
import {
  fetchTimesheets, selectAllTimesheets, selectTimesheetStatus
} from "../../redux/slices/timesheetSlice";
import { selectEmployerSettings, fetchEmployerSettings, selectSettingsStatus } from "../../redux/slices/settingsSlice";
import { setAlert } from "../../redux/slices/alertSlice";
import {
  faUser, faPlus, faEnvelope, faPhone, faMapMarkerAlt, faClock, faEye, faPen, faTrash, faSpinner, faExclamationCircle, faBriefcase
} from "@fortawesome/free-solid-svg-icons";
import Alert from "../layout/Alert";
import "../../styles/ViewClient.scss";

const ViewClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux selectors
  const client = useSelector(selectCurrentClient);
  const clientStatus = useSelector(selectCurrentClientStatus);
  const clientError = useSelector(selectCurrentClientError);
  const projects = useSelector(state => selectProjectsByClientId(state, clientId));
  const projectStatus = useSelector(selectProjectStatus);
  const projectError = useSelector(selectProjectError);
  const allTimesheets = useSelector(selectAllTimesheets);
  const timesheetStatus = useSelector(selectTimesheetStatus);
  const { user } = useSelector((state) => state.auth || {});
  const employerSettings = useSelector(selectEmployerSettings);
  const settingsStatus = useSelector(selectSettingsStatus);

  // Local state
  const [clientTotalHours, setClientTotalHours] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  // Responsive grid helper
  const getProjectCellStyle = (projectIndex, fieldType) => {
    if (!isSmallScreen) return {};
    const stackedDetailItemsCount = 6;
    const dataRowsPerProjectBlock = stackedDetailItemsCount;
    const projectBlockStartRowLine = (stackedDetailItemsCount + 1) + (projectIndex * dataRowsPerProjectBlock);
    switch (fieldType) {
      case 'name':          return { gridArea: `${projectBlockStartRowLine} / 1 / ${projectBlockStartRowLine + dataRowsPerProjectBlock} / 2` };
      case 'actions':       return { gridArea: `${projectBlockStartRowLine} / 3 / ${projectBlockStartRowLine + dataRowsPerProjectBlock} / 4` };
      case 'status':        return { gridArea: `${projectBlockStartRowLine + 0} / 2 / ${projectBlockStartRowLine + 1} / 3` };
      case 'startDate':     return { gridArea: `${projectBlockStartRowLine + 1} / 2 / ${projectBlockStartRowLine + 2} / 3` };
      case 'finishDate':    return { gridArea: `${projectBlockStartRowLine + 2} / 2 / ${projectBlockStartRowLine + 3} / 3` };
      case 'address':       return { gridArea: `${projectBlockStartRowLine + 3} / 2 / ${projectBlockStartRowLine + 4} / 3` };
      case 'expectedHours': return { gridArea: `${projectBlockStartRowLine + 4} / 2 / ${projectBlockStartRowLine + 5} / 3` };
      case 'notes':         return { gridArea: `${projectBlockStartRowLine + 5} / 2 / ${projectBlockStartRowLine + dataRowsPerProjectBlock} / 3` };
      default: return {};
    }
  };

  // Responsive screen check
  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    console.log("[ViewClient] Responsive screen check initialized.");
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch client, projects, timesheets, settings
  useEffect(() => {
    dispatch(fetchClientById(clientId));
    dispatch(fetchProjects(clientId));
    if (timesheetStatus !== 'succeeded' && timesheetStatus !== 'loading') {
      dispatch(fetchTimesheets());
    }
    if (settingsStatus === 'idle' && user?.role === 'employee') {
      console.log("[ViewClient] Fetching employer settings...");
      dispatch(fetchEmployerSettings());
    }
    console.log("[ViewClient] Fetching client, projects, timesheets...");
    return () => {
      dispatch(clearCurrentClient());
      dispatch(clearProjects());
      dispatch(clearProjectError());
      console.log("[ViewClient] Cleanup: Cleared client, projects, and errors.");
    };
  }, [clientId, dispatch, timesheetStatus, settingsStatus, user?.role]);

  // Calculate total hours for this client
  useEffect(() => {
    if (timesheetStatus === 'succeeded' && clientId) {
      const filtered = allTimesheets.filter(
        (t) => (t.clientId?._id || t.clientId) === clientId && (!t.leaveType || t.leaveType === "None")
      );
      const total = filtered.reduce((sum, t) => sum + (parseFloat(t.totalHours) || 0), 0);
      setClientTotalHours(total);
      console.log("[ViewClient] Calculated total hours for client:", total);
    }
  }, [allTimesheets, timesheetStatus, clientId]);

  // Show errors as alerts
  useEffect(() => {
    const reduxError = clientError || projectError;
    if (reduxError) {
      console.error("[ViewClient] Error:", reduxError);
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [clientError, projectError, dispatch]);

  // Delete project handlers
  const handleDeleteClick = (projectId, projectName) => {
    console.log(`[ViewClient] Request to delete project: ${projectName} (${projectId})`);
    setItemToDelete({ id: projectId, name: projectName });
    setShowDeleteConfirm(true);
  };
  const cancelDelete = () => { setShowDeleteConfirm(false); setItemToDelete(null); };
  const confirmDeleteProject = async () => {
    if (!itemToDelete) return;
    const { id: projectIdToDelete, name: projectName } = itemToDelete;
    try {
      await dispatch(deleteProject(projectIdToDelete)).unwrap();
      dispatch(setAlert(`Project "${projectName}" deleted successfully.`, 'success'));
      console.log(`[ViewClient] Project "${projectName}" deleted.`);
    } catch (err) {
      dispatch(setAlert(String(err?.message || `Failed to delete project "${projectName}".`), 'danger'));
      console.error("[ViewClient] Error deleting project:", err);
    }
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const isLoading = useMemo(() =>
    clientStatus === 'loading' ||
    projectStatus === 'loading' ||
    timesheetStatus === 'loading' ||
    (user?.role === 'employee' && settingsStatus === 'loading'),
    [clientStatus, projectStatus, timesheetStatus, user?.role, settingsStatus]
  );
  const isDeletingProject = projectStatus === 'loading';

  if (isLoading && clientStatus !== 'succeeded') {
    return (
      <div className="view-client-page">
        <div className='loading-indicator page-loading'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading client data...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="view-client-page">
        <Alert />
        <div className='error-message page-error'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>Client data could not be loaded.</p>
          <Link to="/clients" className="btn btn-secondary">Back to Clients</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="view-client-page">
      <Alert />
      <div className="page-header">
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
        <div className="header-actions">
          {user?.role === "employer" && (
            <button
              className="btn btn-warning"
              onClick={() => navigate(`/clients/update/${clientId}`)}
              title={`Edit Client ${client.name}`}
            >
              <FontAwesomeIcon icon={faPen} /> Edit Client
            </button>
          )}
          {(user?.role === "employer" ||
            (user?.role === "employee" && settingsStatus === 'succeeded' && employerSettings?.employeeCanCreateProject === true)
          ) && (
            <button
              className="btn btn-green"
              onClick={() => navigate(`/clients/${clientId}/create-project`)}
              title="Create New Project for this Client"
            >
              <FontAwesomeIcon icon={faPlus} /> Create Project
            </button>
          )}
        </div>
      </div>

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
              <p className="hours-label">Total Hours Logged</p>
              <h2 className="hours-value">{clientTotalHours.toFixed(2)}h</h2>
            </div>
            <FontAwesomeIcon icon={faClock} className="hours-icon" />
          </div>
        </div>
      </div>

      <div className="projects-section">
        <div className="section-header">
          <h3><FontAwesomeIcon icon={faBriefcase} /> Projects</h3>
        </div>
        <div className="responsive-grid projects-grid">
          <div className="grid-header">Status</div>
          <div className="grid-header">Name</div>
          <div className="grid-header">Start Date</div>
          <div className="grid-header">Finish Date</div>
          <div className="grid-header">Address</div>
          <div className="grid-header">Expected Hours</div>
          <div className="grid-header">Notes</div>
          {(user?.role === "employer" || user?.role === "employee") && <div className="grid-header actions-header">Actions</div>}

          {projectStatus === 'loading' && projects.length === 0 && !isDeletingProject && (
            <div className='loading-indicator grid-cell' style={{ gridColumn: '1 / -1' }}>
              <FontAwesomeIcon icon={faSpinner} spin /> Loading projects...
            </div>
          )}
          {projectStatus !== 'loading' && projects.length === 0 && !isDeletingProject ? (
            <div className="grid-cell no-results-message" style={{ gridColumn: '1 / -1' }}>
              No projects found for this client.
            </div>
          ) : (
            projects.map((project, projectIndex) => (
              <React.Fragment key={project._id}>
                <div className="grid-cell" style={getProjectCellStyle(projectIndex, 'status')} data-label="Status">{project.status || '--'}</div>
                <div className="grid-cell" style={getProjectCellStyle(projectIndex, 'name')} data-label="Name">{project.name || '--'}</div>
                <div className="grid-cell" style={getProjectCellStyle(projectIndex, 'startDate')} data-label="Start Date">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '--'}</div>
                <div className="grid-cell" style={getProjectCellStyle(projectIndex, 'finishDate')} data-label="Finish Date">{project.finishDate ? new Date(project.finishDate).toLocaleDateString() : '--'}</div>
                <div className="grid-cell" style={getProjectCellStyle(projectIndex, 'address')} data-label="Address">{project.address || '--'}</div>
                <div className="grid-cell" style={getProjectCellStyle(projectIndex, 'expectedHours')} data-label="Expected Hrs">{project.expectedHours != null ? `${project.expectedHours} h` : '--'}</div>
                <div className="grid-cell notes-cell" style={getProjectCellStyle(projectIndex, 'notes')} data-label="Notes">{project.notes || '--'}</div>
                {(user?.role === "employer" || user?.role === "employee") && (
                  <div className="grid-cell actions-cell" style={getProjectCellStyle(projectIndex, 'actions')} data-label="Actions">
                    <button
                      className="btn-icon btn-icon-blue"
                      onClick={() => navigate(`/clients/${clientId}/projects/view/${project._id}`)}
                      title={`View ${project.name}`}
                      aria-label={`View ${project.name}`}
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button
                      className="btn-icon btn-icon-yellow"
                      onClick={() => navigate(`/clients/${clientId}/projects/update/${project._id}`)}
                      title={`Edit ${project.name}`}
                      aria-label={`Edit ${project.name}`}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    {user?.role === "employer" && (
                      <button
                        className="btn-icon btn-icon-red"
                        onClick={() => handleDeleteClick(project._id, project.name)}
                        title={`Delete ${project.name}`}
                        aria-label={`Delete ${project.name}`}
                        disabled={isDeletingProject}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      {showDeleteConfirm && itemToDelete && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-dialog">
            <h4>Confirm Project Deletion</h4>
            <p>Are you sure you want to permanently delete project "<strong>{itemToDelete.name}</strong>"? This action cannot be undone.</p>
            <div className="logout-confirm-actions">
              <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeletingProject}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDeleteProject} disabled={isDeletingProject}>
                {isDeletingProject ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewClient;
