import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase, // Changed icon for Project
  faCalendarAlt, // Changed icon
  faMapMarkerAlt, // Changed icon
  faClock,
  faStickyNote,
  faSave, // Changed icon
  faTimes,
  faSpinner,
  faExclamationCircle,
  faStar, // Icon for Important
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/EmployeeForms.scss"; // Use shared form styles

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const CreateProject = () => {
  const { clientId, projectId } = useParams(); // Get client and project IDs
  const navigate = useNavigate();
  const isEditing = Boolean(projectId);

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    finishDate: "",
    address: "",
    expectedHours: "",
    notes: "",
    isImportant: false
  });

  const [isLoading, setIsLoading] = useState(false); // Loading state for fetching data (if editing)
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for form submission
  const [error, setError] = useState(null); // Error state

  // Fetch project details if editing
  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("token"); // Assuming auth is needed
      axios.get(`${API_URL}/projects/${projectId}`, { // Fetch specific project
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((response) => {
          const project = response.data || {};
          setFormData({
            name: project.name || "",
            // Ensure dates are formatted correctly for input type="date"
            startDate: project.startDate ? project.startDate.split("T")[0] : "",
            finishDate: project.finishDate ? project.finishDate.split("T")[0] : "",
            address: project.address || "",
            expectedHours: project.expectedHours || "",
            notes: project.notes || "",
            isImportant: project.isImportant || false
          });
        })
        .catch((err) => {
          console.error("Error fetching project:", err);
          setError("Failed to load project data.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    // Intentionally omitting API_URL from dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isEditing]);


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) return "Project Name is required.";
    if (formData.startDate && formData.finishDate && formData.startDate > formData.finishDate) {
      return "Finish Date cannot be earlier than Start Date.";
    }
    if (formData.expectedHours && parseFloat(formData.expectedHours) < 0) {
      return "Expected Hours cannot be negative.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem("token");
    if (!token) {
        setError("Authentication required. Please log in.");
        setIsSubmitting(false);
        // Consider navigating to login: navigate('/login');
        return;
    }
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };

    // Prepare payload, ensuring expectedHours is a number if provided
    const payload = {
      ...formData,
      expectedHours: formData.expectedHours ? parseFloat(formData.expectedHours) : null,
      // Add clientId when creating a new project associated with a client
      clientId: isEditing ? undefined : clientId // Only include clientId for POST
    };
    // Remove clientId if updating, as it's usually part of the URL or immutable
    if (isEditing) {
        delete payload.clientId;
    }


    try {
      if (isEditing) {
        // Update existing project
        await axios.put(`${API_URL}/projects/${projectId}`, payload, config);
      } else {
        // Create new project (assuming endpoint structure)
        // The endpoint might be just /projects or nested like /clients/:clientId/projects
        // Adjust the URL based on your actual API structure for creating projects
        await axios.post(`${API_URL}/projects`, payload, config); // Using /projects, adjust if needed
      }
      // Consider success message via state/toast
      navigate(`/clients/view/${clientId}`); // Navigate back to the client view page
    } catch (err) {
      console.error("Error saving project:", err.response || err);
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} project. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Display loading indicator while fetching data for editing
  if (isLoading) {
    return (
      <div className='form-page-container'>
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page-container"> {/* Outer container */}
       <div className="form-header"> {/* Header section */}
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faBriefcase} /> {/* Title icon */}
            {isEditing ? "Update Project" : "Create Project"}
          </h2>
          <div className="breadcrumbs"> {/* Use breadcrumbs class */}
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to="/clients" className="breadcrumb-link">Clients</Link>
            <span className="breadcrumb-separator"> / </span>
            {/* Link back to the specific client's view page */}
            <Link to={`/clients/view/${clientId}`} className="breadcrumb-link">View Client</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">{isEditing ? "Update Project" : "Create Project"}</span>
          </div>
        </div>
      </div>

      <div className="form-container"> {/* Form container */}
        <form onSubmit={handleSubmit} className="employee-form" noValidate> {/* Form with class */}
           {error && (
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error}
            </div>
          )}

          {/* Project Name */}
          <div className="form-group">
            <label htmlFor="projectName">Project Name*</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faBriefcase} className="input-icon" />
              <input
                id="projectName"
                type="text"
                name="name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faCalendarAlt} className="input-icon" />
              <input
                id="startDate"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Finish Date */}
          <div className="form-group">
            <label htmlFor="finishDate">Finish Date</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faCalendarAlt} className="input-icon" />
              <input
                id="finishDate"
                type="date"
                name="finishDate"
                value={formData.finishDate}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label htmlFor="projectAddress">Address</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="input-icon" />
              <input
                id="projectAddress"
                type="text"
                name="address"
                placeholder="Enter project address (if different from client)"
                value={formData.address}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Expected Hours */}
          <div className="form-group">
            <label htmlFor="expectedHours">Expected Hours</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faClock} className="input-icon" />
              <input
                id="expectedHours"
                type="number"
                name="expectedHours"
                placeholder="Estimated total hours"
                value={formData.expectedHours}
                onChange={handleChange}
                min="0" // Prevent negative numbers
                step="any" // Allow decimals
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="projectNotes">Notes</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faStickyNote} className="input-icon textarea-icon" />
              <textarea
                id="projectNotes"
                name="notes"
                placeholder="Add any project-specific notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={isSubmitting}
                rows="3"
              />
            </div>
          </div>

          {/* Important Checkbox */}
          <div className="form-group checkbox-group">
            <input
              id="projectImportant"
              type="checkbox"
              name="isImportant"
              checked={formData.isImportant}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            <label htmlFor="projectImportant">
              <FontAwesomeIcon icon={faStar} /> Mark as Important
            </label>
          </div>

          {/* Form Buttons */}
          <div className="form-footer">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => navigate(`/clients/view/${clientId}`)} // Navigate back to client view
              disabled={isSubmitting}
            >
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
             <button type="submit" className="btn btn-success" disabled={isSubmitting}>
               {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} /> {isEditing ? "Update Project" : "Create Project"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;
