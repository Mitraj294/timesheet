import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser, faCalendar, faMapMarker, faClock, faStickyNote,
  faPlus, faTimes, faSpinner
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/CreateForms.scss";

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';


const CreateProject = () => {
  const { clientId, projectId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    finishDate: "",
    address: "",
    expectedHours: "",
    notes: "",
    isImportant: false
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (projectId) {
        setLoading(true);
        try {
          const response = await axios.get(`${API_URL}/projects/${projectId}`);
          const project = response.data;
  
          setFormData({
            name: project.name,
            startDate: project.startDate ? project.startDate.split("T")[0] : "",
            finishDate: project.finishDate ? project.finishDate.split("T")[0] : "",
            address: project.address || "",
            expectedHours: project.expectedHours || "",
            notes: project.notes || "",
            isImportant: project.isImportant || false
          });
  
        } catch (err) {
          console.error("Error fetching project:", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchProjectDetails();
  }, [projectId]);

  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const payload = {
      ...formData
    };
  
    try {
      if (projectId) {
        await axios.put(`${API_URL}/projects/${projectId}`, payload);
      } else {
        await axios.post(`${API_URL}/projects/${clientId}/projects`, payload);
      }
  
      navigate(`/clients/view/${clientId}`);
    } catch (error) {
      console.error("Error saving project:", error);
    }
  };
  
  if (loading) {
    return (
      <div className="loader-container">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="create-project-container">
      <h2>{projectId ? "Update Project" : "Create Project"}</h2>

      {/* Breadcrumb */}
      
      <div className="breadcrumb">
        <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
        <span> / </span>
        <Link to="/clients" className="breadcrumb-link">Clients</Link>
        <span> / </span>
        <Link to={`/clients/view/${clientId}`} className="breadcrumb-link">View Client</Link>
        <span> / </span>
        <span>{projectId ? "Update Project" : "Create Project"}</span>
      </div>

      <form onSubmit={handleSubmit} className="create-project-form">

        {/* Project Name */}
        
        <div className="form-group">
          <FontAwesomeIcon icon={faUser} className="input-icon" />
          <input
            type="text"
            name="name"
            placeholder="Project Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* Start Date */}
        
        <div className="form-group">
          <FontAwesomeIcon icon={faCalendar} className="input-icon" />
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
          />
        </div>

        {/* Finish Date */}
        
        <div className="form-group">
          <FontAwesomeIcon icon={faCalendar} className="input-icon" />
          <input
            type="date"
            name="finishDate"
            value={formData.finishDate}
            onChange={handleChange}
          />
        </div>

        {/* Address */}
        
        <div className="form-group">
          <FontAwesomeIcon icon={faMapMarker} className="input-icon" />
          <input
            type="text"
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        {/* Expected Hours */}
        
        <div className="form-group">
          <FontAwesomeIcon icon={faClock} className="input-icon" />
          <input
            type="number"
            name="expectedHours"
            placeholder="Expected Hours"
            value={formData.expectedHours}
            onChange={handleChange}
          />
        </div>

        {/* Notes */}
        
        <div className="form-group">
          <FontAwesomeIcon icon={faStickyNote} className="input-icon" />
          <textarea
            name="notes"
            placeholder="Notes"
            value={formData.notes}
            onChange={handleChange}
          />
        </div>

        {/* Important Checkbox */}
        
        <div className="checkbox-group">
          <input
            type="checkbox"
            name="isImportant"
            checked={formData.isImportant}
            onChange={handleChange}
          />
          <label>Important</label>
        </div>

        {/* Form Buttons */}
        
        <div className="form-buttons">
          <button type="submit" className="submit-btn">
            <FontAwesomeIcon icon={faPlus} /> {projectId ? "Update Project" : "Create Project"}
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate(`/clients/view/${clientId}`)}
          >
            <FontAwesomeIcon icon={faTimes} /> Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProject;
