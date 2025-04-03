import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser, faPlus, faEnvelope, faPhone, faMapMarkerAlt, faClock,
  faEye, faEdit, faTrash
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/ViewClients.scss";

const ViewClient = () => {
  const { clientId } = useParams();  // Extract clientId from URL params
  console.log(clientId); 
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
// Inside useEffect() or the function where you're making the API request
const fetchData = async () => {
  try {

    const token = localStorage.getItem('token'); 

    
    const clientRes = await axios.get(`http://localhost:5000/api/clients/${clientId}`, {
      headers: {
        Authorization: `Bearer ${token}`, 
      },
    });
    setClient(clientRes.data);

    const projectsRes = await axios.get(`http://localhost:5000/api/projects/client/${clientId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (projectsRes.status === 200) {
      setProjects(projectsRes.data);
    } else {
      console.warn("No projects found.");
      setProjects([]);
    }
  } catch (err) {
    console.error("Error fetching data:", err);

    if (err.response && err.response.status === 404) {
      alert("No projects found for this client.");
    } else if (err.response && err.response.status === 401) {
      alert("Unauthorized. Please log in.");
      navigate("/login");
    } else {
      alert("Failed to fetch data from the server.");
    }
  }
};


    fetchData();
  }, [clientId]);

  const deleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    try {
      // ✅ Corrected the delete endpoint
      await axios.delete(`http://localhost:5000/api/projects/${projectId}`);

      // Remove the deleted project from the state
      setProjects((prev) => prev.filter((project) => project._id !== projectId));

    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project.");
    }
  };

  if (!client) return <p>Loading...</p>;

  return (
    <div className="client-container">

      {/* Header */}
      <div className="header">
        <h2><FontAwesomeIcon icon={faUser} /> View Client</h2>
        <div className="actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/clients/${clientId}/create-project`)}
          >
            <FontAwesomeIcon icon={faPlus} /> Create New Project
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link> / 
        <Link to="/clients">Clients</Link> / 
        <span>View Client</span>
      </div>

      {/* Client Info Section */}
      <div className="client-summary">
        <div className="client-card">
          <div className="client-avatar">
            <FontAwesomeIcon icon={faUser} size="3x" />
          </div>
          <div className="client-info">
            <h2>{client.name}</h2>
            <p><FontAwesomeIcon icon={faEnvelope} /> {client.emailAddress}</p>
            <p><FontAwesomeIcon icon={faPhone} /> {client.phoneNumber}</p>
            <p><FontAwesomeIcon icon={faMapMarkerAlt} /> {client.address || "--"}</p>
          </div>
          <div className="total-hours">
            <div className="hours-card">
              <span>Total Hours</span>
              <h3>
                <FontAwesomeIcon icon={faClock} /> {client.totalHours || "0"}h
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Project List Section */}
      <div className="project-section">
        <div className="project-header">
          <h3>Project List</h3>
        </div>

        <table className="project-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Name</th>
              <th>Start Date</th>
              <th>Projected Finish Date</th>
              <th>Address</th>
              <th>Expected Hours</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project._id}>
                <td>{project.status}</td>
                <td>{project.name}</td>
                <td>{new Date(project.startDate).toLocaleDateString()}</td>
                <td>{new Date(project.finishDate).toLocaleDateString()}</td>
                <td>{project.address || "--"}</td>
                <td>{project.expectedHours || "--"}</td>
                <td>{project.notes || "--"}</td>
                <td className="actions">
                <Link to={`/clients/${clientId}/projects/view/${project._id}`} className="btn btn-view">
                     <FontAwesomeIcon icon={faEye} />
                  </Link>


                  <button
                    className="btn btn-edit"
                    onClick={() => navigate(`/clients/${clientId}/projects/update/${project._id}`)}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>

                  <button
                    className="btn btn-delete"
                    onClick={() => deleteProject(project._id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewClient;
