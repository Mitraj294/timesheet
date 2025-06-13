import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import {
  fetchProjectById,
  createProject,
  updateProject,
  selectCurrentProject,
  selectCurrentProjectStatus,
  selectCurrentProjectError,
  selectProjectStatus,
  selectProjectError,
  clearCurrentProject,
  clearProjectError,
} from '../../redux/slices/projectSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';

import {
  faBriefcase,
  faStickyNote,
  faSave,
  faTimes,
  faSpinner,
  faStar,
  faPen,
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/Forms.scss'; //  Use Forms.scss for styling

const CreateProject = () => {
  const { clientId, projectId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isEditing = Boolean(projectId);

  // Redux state
  const currentProject = useSelector(selectCurrentProject);
  const currentProjectStatus = useSelector(selectCurrentProjectStatus);
  const currentProjectError = useSelector(selectCurrentProjectError);
  const saveStatus = useSelector(selectProjectStatus); // Tracks status of create/update operations
  const saveError = useSelector(selectProjectError); // Tracks errors from create/update operations

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    finishDate: '',
    address: '',
    expectedHours: '',
    notes: '',
    isImportant: false,
  });

  const [error, setError] = useState(null);

  // Derived loading state from Redux statuses
  const isLoading = useMemo(
    () => currentProjectStatus === 'loading' || saveStatus === 'loading',
    [currentProjectStatus, saveStatus]
  );

  // Effects for handling Redux state and side effects

  // Displays errors from Redux state (fetch or save operations) as alerts
  useEffect(() => {
    const reduxError = currentProjectError || saveError;
    if (reduxError) {
      console.error('[CreateProject] Error:', reduxError);
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [currentProjectError, saveError, dispatch]);

  // Handles fetching existing project data for editing, or initializing form for creation
  useEffect(() => {
    if (isEditing) {
      if (
        projectId &&
        (!currentProject || currentProject._id !== projectId)
      ) {
        dispatch(fetchProjectById(projectId));
      }
    } else {
      if (currentProject) {
        dispatch(clearCurrentProject());
      }
      setFormData({
        name: '',
        startDate: '',
        finishDate: '',
        address: '',
        expectedHours: '',
        notes: '',
        isImportant: false,
      });
    }
    return () => {
      dispatch(clearCurrentProject());
      dispatch(clearProjectError());
    };
  }, [isEditing, projectId, dispatch]);

  // Populates the form when editing and project data is successfully fetched
  useEffect(() => {
    if (isEditing && currentProjectStatus === 'succeeded' && currentProject) {
      setFormData({
        name: currentProject.name || '',
        startDate: currentProject.startDate ? currentProject.startDate.slice(0, 10) : '',
        finishDate: currentProject.finishDate ? currentProject.finishDate.slice(0, 10) : '',
        address: currentProject.address || '',
        expectedHours: currentProject.expectedHours != null ? String(currentProject.expectedHours) : '',
        notes: currentProject.notes || '',
        isImportant: !!currentProject.isImportant,
      });
    }
  }, [isEditing, currentProjectStatus, currentProject]);

  // Event Handlers for form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError(null);
  };

  // Client-side form validation logic
  const validateForm = () => {
    if (!formData.name.trim()) return 'Project Name is required.';
    if (
      formData.startDate &&
      formData.finishDate &&
      formData.startDate > formData.finishDate
    ) {
      return 'Finish Date cannot be earlier than Start Date.';
    }
    if (formData.expectedHours && parseFloat(formData.expectedHours) < 0) {
      return 'Expected Hours cannot be negative.';
    }
    return null;
  };

  // Handles form submission for creating or updating a project
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearProjectError());

    const validationError = validateForm();
    if (validationError) {
      dispatch(setAlert(validationError, 'warning'));
      console.warn('[CreateProject] Validation error:', validationError);
      return;
    }

    const payload = {
      ...formData,
      expectedHours: formData.expectedHours
        ? parseFloat(formData.expectedHours)
        : null,
      clientId: isEditing ? undefined : clientId,
    };
    if (isEditing) {
      delete payload.clientId;
    }

    try {
      if (isEditing) {
        await dispatch(
          updateProject({ projectId, projectData: payload })
        ).unwrap();
        dispatch(setAlert('Project updated successfully!', 'success'));
      } else {
        await dispatch(
          createProject({ clientId, projectData: payload })
        ).unwrap();
        dispatch(setAlert('Project created successfully!', 'success'));
      }
      navigate(`/clients/view/${clientId}`);
    } catch (err) {
      console.error(
        '[CreateProject] Error saving project:',
        err.response || err
      );
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        `Failed to ${isEditing ? 'update' : 'create'} project.`;
      dispatch(setAlert(errorMessage, 'danger'));
    }
  };

  // Render logic for the component
  if (isLoading) {
    return (
      <div className="vehicles-page">
        <div className="loading-indicator">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicles-page">
      <Alert />
      <div className="vehicles-header">
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faBriefcase} />
            {isEditing ? 'Update Project' : 'Create Project'}
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">
              Dashboard
            </Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to="/clients" className="breadcrumb-link">
              Clients
            </Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to={`/clients/view/${clientId}`} className="breadcrumb-link">
              View Client
            </Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">
              {isEditing ? 'Update Project' : 'Create Project'}
            </span>
          </div>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={handleSubmit} className="employee-form" noValidate>
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
              <FontAwesomeIcon
                icon={faStickyNote}
                className="input-icon textarea-icon"
              />
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

          <div className="form-footer">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => navigate(`/clients/view/${clientId}`)}
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button
              type="submit"
              className="btn btn-green"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={isEditing ? faPen : faSave} />
                  {isEditing ? 'Update Project' : 'Create Project'}
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
