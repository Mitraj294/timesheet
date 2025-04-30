import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Redux Imports
import {
  fetchProjectById, createProject, updateProject,
  selectCurrentProject, selectCurrentProjectStatus, selectCurrentProjectError,
  selectProjectStatus, selectProjectError, // For create/update status
  clearCurrentProject, clearProjectError // Import clear actions
} from "../../redux/slices/projectSlice";
import { setAlert } from "../../redux/slices/alertSlice";

import {
  faBriefcase,
  faStickyNote,
  faSave,
  faTimes,
  faSpinner,
  faExclamationCircle,
  faStar,
  faPen, // Added for edit mode
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/Forms.scss"; // *** Use Forms.scss ***

const CreateProject = () => {
  const { clientId, projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isEditing = Boolean(projectId);

  // Redux State
  const currentProject = useSelector(selectCurrentProject);
  const currentProjectStatus = useSelector(selectCurrentProjectStatus);
  const currentProjectError = useSelector(selectCurrentProjectError);
  const saveStatus = useSelector(selectProjectStatus); // General status for create/update
  const saveError = useSelector(selectProjectError); // General error for create/update


  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    finishDate: "",
    address: "",
    expectedHours: "",
    notes: "",
    isImportant: false
  });

  // const [isLoading, setIsLoading] = useState(false); // Replaced by Redux status
  // const [isSubmitting, setIsSubmitting] = useState(false); // Replaced by Redux status
  const [error, setError] = useState(null);

  // Combined loading state
  const isLoading = useMemo(() =>
    currentProjectStatus === 'loading' || saveStatus === 'loading',
    [currentProjectStatus, saveStatus]
  );

  // Combined error state
  const combinedError = useMemo(() =>
    error || // Local validation errors
    currentProjectError ||
    saveError, // Include save error
    [error, currentProjectError, saveError]
  );

  useEffect(() => {
    if (isEditing) {
      dispatch(fetchProjectById(projectId));
    } else {
      dispatch(clearCurrentProject()); // Clear if creating new
      setFormData({ // Reset form
        name: "", startDate: "", finishDate: "", address: "", expectedHours: "", notes: "", isImportant: false
      });
    }
    // Cleanup on unmount or ID change
    return () => {
      dispatch(clearCurrentProject());
      dispatch(clearProjectError()); // Clear potential save errors
    };
  }, [projectId, isEditing, dispatch]);

  // Populate form when editing and data is loaded
  useEffect(() => {
    if (isEditing && currentProjectStatus === 'succeeded' && currentProject) {
      setFormData({
        name: currentProject.name || "",
        startDate: currentProject.startDate ? currentProject.startDate.split("T")[0] : "",
        finishDate: currentProject.finishDate ? currentProject.finishDate.split("T")[0] : "",
        address: currentProject.address || "",
        expectedHours: currentProject.expectedHours || "",
        notes: currentProject.notes || "",
        isImportant: currentProject.isImportant || false
      });
      setError(null); // Clear local error if data loads
    } else if (isEditing && currentProjectStatus === 'failed') {
      setError(currentProjectError); // Show fetch error
    }
  }, [isEditing, currentProjectStatus, currentProject, currentProjectError]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value
    }));
    if (error) setError(null); // Clear local error on change
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
    setError(null); // Clear local validation error
    dispatch(clearProjectError()); // Clear Redux save error

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      ...formData,
      expectedHours: formData.expectedHours ? parseFloat(formData.expectedHours) : null,
      clientId: isEditing ? undefined : clientId
    };
    if (isEditing) {
        delete payload.clientId;
    }

    try {
      if (isEditing) {
        await dispatch(updateProject({ projectId, projectData: payload })).unwrap();
        dispatch(setAlert('Project updated successfully!', 'success'));
      } else {
        // Pass clientId and projectData for creation
        await dispatch(createProject({ clientId, projectData: payload })).unwrap();
        dispatch(setAlert('Project created successfully!', 'success'));
      }
      navigate(`/clients/view/${clientId}`);
    } catch (err) {
      console.error("Error saving project:", err.response || err);
      // Error state is handled by combinedError via Redux state
      const errorMessage = err?.response?.data?.message || err?.message || `Failed to ${isEditing ? 'update' : 'create'} project.`;
      dispatch(setAlert(errorMessage, 'danger'));
    }
  };

  if (isLoading) {
    return (
      <div className='vehicles-page'> {/* Use standard page class */}
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicles-page"> {/* Use standard page class */}
       <div className="vehicles-header"> {/* Use standard header */}
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faBriefcase} />
            {isEditing ? "Update Project" : "Create Project"}
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to="/clients" className="breadcrumb-link">Clients</Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to={`/clients/view/${clientId}`} className="breadcrumb-link">View Client</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">{isEditing ? "Update Project" : "Create Project"}</span>
          </div>
        </div>
      </div>

      <div className="form-container"> {/* Use standard form container */}
        <form onSubmit={handleSubmit} className="employee-form" noValidate> {/* Use standard form class */}
           {combinedError && ( // Use combined error state
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {combinedError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="projectName">Project Name*</label>
            <div className="input-with-icon">

              <input
                id="projectName"
                type="text"
                name="name"
                placeholder="Enter project name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <div className="input-with-icon">

              <input
                id="startDate"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="finishDate">Finish Date</label>
            <div className="input-with-icon">

              <input
                id="finishDate"
                type="date"
                name="finishDate"
                value={formData.finishDate}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="projectAddress">Address</label>
            <div className="input-with-icon">

              <input
                id="projectAddress"
                type="text"
                name="address"
                placeholder="Enter project address (if different from client)"
                value={formData.address}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="expectedHours">Expected Hours</label>
            <div className="input-with-icon">

              <input
                id="expectedHours"
                type="number"
                name="expectedHours"
                placeholder="Estimated total hours"
                value={formData.expectedHours}
                onChange={handleChange}
                min="0"
                step="any"
                disabled={isLoading}
              />
            </div>
          </div>

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
                disabled={isLoading}
                rows="3"
              />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <input
              id="projectImportant"
              type="checkbox"
              name="isImportant"
              checked={formData.isImportant}
              onChange={handleChange}
              disabled={isLoading}
            />
            <label htmlFor="projectImportant">
              <FontAwesomeIcon icon={faStar} /> Mark as Important
            </label>
          </div>

          <div className="form-footer"> {/* Use standard footer */}
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => navigate(`/clients/view/${clientId}`)} // Ensure clientId is available
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
             <button type="submit" className="btn btn-success" disabled={isLoading}>
               {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={isEditing ? faPen : faSave} /> {isEditing ? "Update Project" : "Create Project"}
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
