import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faProjectDiagram,
  faCalendarAlt,
  faCalendarCheck,
  faClock,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import ProjectTimesheet from "./ProjectTimesheet";
import "../../styles/ViewProject.scss";
const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';


const ViewProject = () => {
  const { clientId, projectId } = useParams();

  console.log("clientId: ", clientId);
  console.log("projectId: ", projectId);

  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  console.log("selectedProjectId:", selectedProjectId);

  const navigate = useNavigate();
  const [project, setProject] = useState(null);

    const { user } = useSelector((state) => state.auth)
  // Fetch project data on mount or when selectedProjectId changes
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!selectedProjectId) return;
      try {
        const projectRes = await axios.get(`${API_URL}/projects/${selectedProjectId}`);
        setProject(projectRes.data);
      } catch (err) {
        console.error("Error fetching project data:", err);
      }
    };
  
    fetchProjectData();
  }, [selectedProjectId]);

  // Callback to update the actualHours property in the project state
  const updateActualHours = (actualHours) => {
    setProject((prevProject) => ({
      ...prevProject,
      actualHours: actualHours,
    }));
  };

  if (!project) return <p>Loading...</p>;

  return (
    <div className="view-project-container">
      {/* Header */}
      <div className="header">
        <h2>
          <FontAwesomeIcon icon={faProjectDiagram} /> View Project
        </h2>
        {user?.role === "employer" && (
        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/clients/${clientId}/projects/update/${project._id}`)}
          >
            <FontAwesomeIcon icon={faEdit} /> Edit Project
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this project?")) {
                axios
                  .delete(`${API_URL}/projects/${projectId}`)
                  .then(() => navigate("/clients"))
                  .catch((err) => alert("Failed to delete project"));
              }
            }}
          >
            <FontAwesomeIcon icon={faTrash} /> Delete Project
          </button>
        </div>)}
      </div>

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link> /{" "}
        <Link to="/clients">Clients</Link> /{" "}
        <Link to={`/clients/view/${clientId}`}>View Client</Link> /{" "}
        <span>View Project</span>
      </div>

      {/* Project Info Section */}
      <div className="project-summary">
        {/* Project Details Card */}
        <div className="project-card details">
          <h2>{project.name}</h2>
          <p>
            <FontAwesomeIcon icon={faCalendarAlt} /> Start:{" "}
            {new Date(project.startDate).toLocaleDateString()}
          </p>
          <p>
            <FontAwesomeIcon icon={faCalendarCheck} /> Projected Finish:{" "}
            {new Date(project.finishDate).toLocaleDateString()}
          </p>
        </div>

        {/* Expected Hours Card */}
        <div className="project-card stats">
          <p>
            <FontAwesomeIcon icon={faClock} /> Expected Hours
          </p>
          <h2>{project.expectedHours || "--"}h</h2>
        </div>

        {/* Actual Hours Card */}
        <div className="project-card stats actual">
          <p>
            <FontAwesomeIcon icon={faClock} /> Actual Hours
          </p>
          <h2>
            {typeof project.actualHours === "number"
              ? project.actualHours.toFixed(1)
              : "0"}
            h
          </h2>
        </div>
      </div>

      {/* Timesheet Section */}
      <div className="timesheet-section">
        <h3>Timesheets for {project.name}</h3>
        <ProjectTimesheet
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          updateActualHours={updateActualHours} // Pass the callback
        />
      </div>
    </div>
  );
};

export default ViewProject;