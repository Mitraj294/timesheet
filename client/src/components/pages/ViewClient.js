import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
// Import the shared SCSS file
import "../../styles/Vehicles.scss"; // *** Use Vehicles.scss ***
// Import the dedicated SCSS file for ViewClient specific styles
import "../../styles/ViewClient.scss"; // *** Use ViewClient.scss ***

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const ViewClient = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [clientTotalHours, setClientTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const { user } = useSelector((state) => state.auth || {});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setClient(null);
      setProjects([]);
      setClientTotalHours(0);

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication token not found.");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // Fetch client, projects, and timesheets concurrently
        const [clientRes, projectsRes, timesheetRes] = await Promise.all([
          axios.get(`${API_URL}/clients/${clientId}`, config),
          axios.get(`${API_URL}/projects/client/${clientId}`, config).catch(err => {
            // Handle 404 specifically for projects, return empty array
            if (err.response?.status === 404) return { data: [] };
            throw err; // Re-throw other errors
          }),
          axios.get(`${API_URL}/timesheets`, config) // Fetch all timesheets
        ]);

        setClient(clientRes.data);
        setProjects(projectsRes.data || []);

        // Calculate total hours client-side
        const timesheets = timesheetRes.data?.timesheets || [];
        const filtered = timesheets.filter(
          (t) => t.clientId?._id === clientId && t.leaveType === "None"
        );
        const total = filtered.reduce(
          (sum, t) => sum + (parseFloat(t.totalHours) || 0),
          0
        );
        setClientTotalHours(total);

      } catch (err) {
        console.error("Error fetching data:", err);
        let errorMessage = "Failed to fetch data from the server.";
        if (err.message === "Authentication token not found.") {
            errorMessage = "Authentication required. Please log in.";
            navigate("/login");
        } else if (err.response?.status === 404) {
          errorMessage = "Client data not found."; // Adjusted error for client 404
        } else if (err.response?.status === 401 || err.response?.status === 403) {
          errorMessage = "Unauthorized. Please log in.";
          navigate("/login");
        } else if (err.response?.data?.message) {
            errorMessage = err.response.data.message;
        } else if (err.message) {
            errorMessage = err.message;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientId, navigate]);

  const deleteProject = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to delete project "${projectName}"?`)) return;

    setIsDeletingProject(true);
    setError(null); // Clear previous errors

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found.");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.delete(`${API_URL}/projects/${projectId}`, config);
      setProjects((prev) => prev.filter((project) => project._id !== projectId));
      // Consider adding success feedback (toast)
    } catch (err) {
      console.error("Error deleting project:", err);
      setError(`Failed to delete project "${projectName}". ${err.response?.data?.message || err.message}`);
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Define grid columns for projects
  const projectGridColumns = '1fr 1.5fr 1fr 1fr 1.5fr 1fr 1.5fr auto';

  // Loading state for the whole page
  if (loading && !client) {
    return (
      <div className="vehicles-page"> {/* Use standard page class */}
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading client data...</p>
        </div>
      </div>
    );
  }

  // Error state if client data failed to load
  if (error && !client) {
    return (
      <div className="vehicles-page"> {/* Use standard page class */}
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
          <Link to="/clients" className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Clients</Link>
        </div>
      </div>
    );
  }

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
     );
  }

  return (
    // Use standard page class
    <div className="vehicles-page">
      {/* Use standard header */}
      <div className="vehicles-header">
        <div className="title-breadcrumbs">
          <h2>
            {/* Changed Title */}
            <FontAwesomeIcon icon={faUser} /> View Client
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to="/clients" className="breadcrumb-link">Clients</Link>
            <span className="breadcrumb-separator"> / </span>
            {/* Keep client name in breadcrumb */}
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

      {/* Display general errors below header */}
      {error && (
         <div className='error-message' style={{marginBottom: '1rem'}}>
            <FontAwesomeIcon icon={faExclamationCircle} />
            <p>{error}</p>
         </div>
      )}

      {/* --- START: New Client Summary Section --- */}
      <div className="client-summary-section">
        <h3 className="section-heading">Client Summary</h3>
        <div className="client-summary-cards">
          {/* Card 1: Client Details */}
          <div className="summary-card client-details-card">
            {/* Added Large User Icon */}
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

        {isDeletingProject && (
             <div className='loading-indicator' style={{maxWidth: 'none', margin: '0 0 1rem 0', background: '#fff', padding: '1rem'}}>
                <FontAwesomeIcon icon={faSpinner} spin /> Deleting project...
             </div>
        )}

        {/* Use standard grid for projects */}
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

          {/* Display loading indicator inside grid if deleting */}
          {loading && projects.length === 0 && !isDeletingProject && (
             <div className='loading-indicator' style={{ gridColumn: '1 / -1' }}>
                <FontAwesomeIcon icon={faSpinner} spin /> Loading projects...
             </div>
          )}

          {!loading && projects.length === 0 && !isDeletingProject ? (
            <div className="vehicles-row no-results">
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
                {user?.role === "employer" && (
                  <div data-label="Actions" className="actions"> {/* Use standard actions class */}
                    <button
                      className="btn-icon btn-icon-blue" // Standard icon button
                      onClick={() => navigate(`/clients/${clientId}/projects/view/${project._id}`)}
                      title={`View ${project.name}`}
                      aria-label={`View ${project.name}`}
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
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
                      onClick={() => deleteProject(project._id, project.name)}
                      title={`Delete ${project.name}`}
                      aria-label={`Delete ${project.name}`}
                      disabled={isDeletingProject}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewClient;
