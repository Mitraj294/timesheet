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
import "../../styles/ViewClients.scss"; // Keep specific SCSS for now

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

        const [clientRes, projectsRes, timesheetRes] = await Promise.all([
          axios.get(`${API_URL}/clients/${clientId}`, config),
          axios.get(`${API_URL}/projects/client/${clientId}`, config).catch(err => {
            if (err.response?.status === 404) return { data: [] };
            throw err;
          }),
          axios.get(`${API_URL}/timesheets`, config)
        ]);

        setClient(clientRes.data);
        setProjects(projectsRes.data || []);

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
          errorMessage = "Client or related project data not found.";
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
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found.");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.delete(`${API_URL}/projects/${projectId}`, config);
      setProjects((prev) => prev.filter((project) => project._id !== projectId));
    } catch (err) {
      console.error("Error deleting project:", err);
      setError(`Failed to delete project "${projectName}". ${err.response?.data?.message || err.message}`);
    } finally {
      setIsDeletingProject(false);
    }
  };

  const projectGridColumns = '1fr 1.5fr 1fr 1fr 1.5fr 1fr 1.5fr auto';

  if (loading) {
    return (
      <div className="view-client-page">
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading client data...</p>
        </div>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="view-client-page">
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
          <Link to="/clients" className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Clients</Link>
        </div>
      </div>
    );
  }

  if (!client) {
     return (
      <div className="view-client-page">
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>Client data could not be loaded.</p>
           <Link to="/clients" className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Clients</Link>
        </div>
      </div>
     );
  }

  return (
    <div className="view-client-page">
      <div className="page-header">
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faUser} /> {client.name}
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
                    className="btn btn-primary"
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

      {error && (
         <div className='error-message' style={{marginBottom: '1rem'}}>
            <FontAwesomeIcon icon={faExclamationCircle} />
            <p>{error}</p>
         </div>
      )}

      <div className="client-info-card">
        <div className="client-details-grid">
            <div className="detail-item detail-item-full-width">
                <FontAwesomeIcon icon={faEnvelope} className="detail-icon" />
                <span className="detail-label">Email:</span>
                <span className="detail-value">{client.emailAddress || '--'}</span>
            </div>
            <div className="detail-item detail-item-full-width">
                <FontAwesomeIcon icon={faPhone} className="detail-icon" />
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{client.phoneNumber || '--'}</span>
            </div>
            <div className="detail-item detail-item-full-width">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="detail-icon" />
                <span className="detail-label">Address:</span>
                <span className="detail-value">{client.address || '--'}</span>
            </div>
        </div>
      </div>

      <div className="client-hours-card">
         <div className="detail-item">
            <FontAwesomeIcon icon={faClock} className="detail-icon" />
            <span className="detail-label">Total Hours:</span>
            <span className="detail-value">{clientTotalHours.toFixed(2)} h</span>
        </div>
      </div>

      <div className="projects-section">
        <div className="section-header">
            <h3><FontAwesomeIcon icon={faBriefcase} /> Projects</h3>
        </div>

        {isDeletingProject && (
             <div className='loading-indicator' style={{maxWidth: 'none', margin: '0 0 1rem 0'}}>
                <FontAwesomeIcon icon={faSpinner} spin /> Deleting project...
             </div>
        )}

        <div className="data-grid">
          <div className="data-row header" style={{ gridTemplateColumns: projectGridColumns }}>
            <div>Status</div>
            <div>Name</div>
            <div>Start Date</div>
            <div>Finish Date</div>
            <div>Address</div>
            <div>Expected Hours</div>
            <div>Notes</div>
            {user?.role === "employer" && <div>Actions</div>}
          </div>

          {!isDeletingProject && projects.length === 0 ? (
            <div className="data-row no-results">
              No projects found for this client.
            </div>
          ) : (
            !isDeletingProject && projects.map((project) => (
              <div
                key={project._id}
                className="data-row data-card"
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
                  <div data-label="Actions" className="actions">
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
                    <button
                      className="btn-icon btn-icon-red"
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
