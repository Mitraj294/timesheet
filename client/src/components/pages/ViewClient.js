import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faPlus,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faClock,
  faEye,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/ViewClients.scss";

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';


const ViewClient = () => {
  const { clientId } = useParams(); // Get clientId from URL params
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  // This state will store the total hours spent on this client (by all employees)
  const [clientTotalHours, setClientTotalHours] = useState(0);
  const { user } = useSelector((state) => state.auth); // Get logged-in user

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
  
        // Fetch Client Info
        const clientRes = await axios.get(
          `${API_URL}/clients/${clientId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setClient(clientRes.data);
  
        // Fetch Projects for this client
        const projectsRes = await axios.get(
          `${API_URL}/projects/client/${clientId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (projectsRes.status === 200) {
          setProjects(projectsRes.data);
        } else {
          console.warn("No projects found.");
          setProjects([]);
        }
  
        // Fetch all timesheets (for calculating total hours)
        const timesheetRes = await axios.get(
          `${API_URL}/timesheets`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const timesheets = timesheetRes.data?.timesheets || [];
        // Filter timesheets for this client and only include entries with no leave.
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
  }, [clientId, navigate]);

  // Function to delete a project
  const deleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;
  
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
        <h2>
          <FontAwesomeIcon icon={faUser} /> View Client
        </h2>
        <div className="actions">
        {user?.role === "employer" && (
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/clients/${clientId}/create-project`)}
          >
            <FontAwesomeIcon icon={faPlus} /> Create New Project
          </button>
        )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link> /{" "}
        <Link to="/clients">Clients</Link> / <span>View Client</span>
      </div>

      {/* Client Info Section */}
      <div className="client-summary">
        <div className="client-card">
          <div className="client-avatar">
            <FontAwesomeIcon icon={faUser} size="3x" />
          </div>
          <div className="client-info">
            <h2>{client.name}</h2>
            <p>
              <FontAwesomeIcon icon={faEnvelope} /> {client.emailAddress}
            </p>
            <p>
              <FontAwesomeIcon icon={faPhone} /> {client.phoneNumber}
            </p>
            <p>
              <FontAwesomeIcon icon={faMapMarkerAlt} />{" "}
              {client.address || "--"}
            </p>
          </div>
          <div className="total-hours">
            <div className="hours-card">
              <p>
                <FontAwesomeIcon icon={faClock} /> Total Hours
              </p>
              <h2>{clientTotalHours.toFixed(2)} h</h2>
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
                  <Link
                    to={`/clients/${clientId}/projects/view/${project._id}`}
                    className="btn btn-view"
                  >
                    <FontAwesomeIcon icon={faEye} />
                    
                  </Link>
                  {user?.role === "employer" && (
                  <button
                    className="btn btn-edit"
                    onClick={() =>
                      navigate(`/clients/${clientId}/projects/update/${project._id}`)
                    }
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>)}
                  {user?.role === "employer" && (
                  <button
                    className="btn btn-delete"
                    onClick={() => deleteProject(project._id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                  )}
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
