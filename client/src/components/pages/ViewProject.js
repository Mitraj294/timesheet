import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// --- Add this line ---
const ALL_PROJECTS_VALUE = 'ALL_PROJECTS';
// --------------------

const ViewProject = () => {
  const { clientId, projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { user } = useSelector((state) => state.auth || {});

  useEffect(() => {
    const fetchProjectData = async () => {
      setLoading(true);
      setError(null);
      setProject(null);

      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication token not found.");
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const projectRes = await axios.get(`${API_URL}/projects/${projectId}`, config);
        setProject(projectRes.data);

      } catch (err) {
        console.error("Error fetching project data:", err);
        let errorMessage = "Failed to fetch project data.";
         if (err.message === "Authentication token not found.") {
            errorMessage = "Authentication required. Please log in.";
            navigate("/login");
        } else if (err.response?.status === 404) {
          errorMessage = "Project not found.";
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

    fetchProjectData();
  }, [projectId, navigate]);

  const handleProjectChangeInTimesheet = useCallback((newProjectId) => {
    // Now this condition will work correctly
    if (newProjectId && newProjectId !== projectId && newProjectId !== ALL_PROJECTS_VALUE) {
      const currentClientId = project?.clientId?._id || clientId || 'unknown';
      const targetUrl = `/clients/view/${currentClientId}/project/${newProjectId}`;
      console.log('Navigating to:', targetUrl, 'New Project ID:', newProjectId, 'Current Client ID:', currentClientId);
      navigate(targetUrl); // Use the calculated targetUrl
    } else {
      console.log('Navigation skipped. New Project ID:', newProjectId, 'Current Project ID:', projectId);
    }
  }, [navigate, projectId, project, clientId]);


  const handleDeleteProject = async () => {
      if (!project || !window.confirm(`Are you sure you want to delete project "${project.name}"? This action cannot be undone.`)) {
          return;
      }
      setIsDeleting(true);
      setError(null);
      try {
          const token = localStorage.getItem("token");
          if (!token) {
              navigate("/login"); // Redirect if no token
              throw new Error("Authentication token not found.");
          }
          const config = { headers: { Authorization: `Bearer ${token}` } };
          await axios.delete(`${API_URL}/projects/${projectId}`, config);
          const clientIdToNavigate = project?.clientId?._id || clientId || 'unknown';
          // Ensure navigation only happens if clientIdToNavigate is not 'unknown'
          if (clientIdToNavigate !== 'unknown') {
              navigate(`/clients/view/${clientIdToNavigate}`);
          } else {
              // Fallback navigation if client ID is somehow lost
              navigate('/clients');
          }
      } catch (err) {
          console.error("Failed to delete project:", err);
          let deleteError = `Failed to delete project.`;
          if (err.response?.data?.message) {
              deleteError += ` ${err.response.data.message}`;
          } else if (err.message && err.message !== "Authentication token not found.") {
              deleteError += ` ${err.message}`;
          }
          setError(deleteError);
          // Only set isDeleting back to false if there was an error other than auth
          if (err.message !== "Authentication token not found.") {
              setIsDeleting(false);
          }
      }
  };

  // --- No changes below this line needed for this specific error ---

  if (loading) {
    return (
      <div className="vehicles-page">
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vehicles-page">
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
          {clientId && clientId !== 'unknown' ? (
             <Link to={`/clients/view/${clientId}`} className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Client</Link>
          ) : (
             <Link to="/projects" className="btn btn-secondary" style={{marginTop: '1rem'}}>Back to Projects</Link>
          )}
        </div>
      </div>
    );
  }

  if (!project) {
     return (
      <div className="vehicles-page">
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
                        // Handle case where client ID is missing for edit navigation
                        console.warn("Cannot navigate to edit project: Client ID is unknown.");
                        // Optionally show an error message to the user
                    }
                }}
                disabled={isDeleting}
              >
                <FontAwesomeIcon icon={faEdit} /> Edit Project
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteProject}
                disabled={isDeleting}
              >
                {isDeleting ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTrash} />}
                {isDeleting ? ' Deleting...' : ' Delete Project'}
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
    </div>
  );
};

export default ViewProject;
