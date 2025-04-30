import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Redux Imports
import {
  fetchClientById, createClient, updateClient,
  selectCurrentClient, selectCurrentClientStatus, selectCurrentClientError,
  selectClientStatus, selectClientError, // For create/update status
  clearCurrentClient, clearClientError // Import clear actions
} from "../../redux/slices/clientSlice";
import { setAlert } from "../../redux/slices/alertSlice";

import {
  faUserTie,
  faStickyNote,
  faSave,
  faTimes,
  faSpinner,
  faExclamationCircle,
  faStar,
  faPen,
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/Forms.scss"; 

const CreateClient = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useDispatch();
  const isEditing = Boolean(id);

  // Redux State
  const currentClient = useSelector(selectCurrentClient);
  const currentClientStatus = useSelector(selectCurrentClientStatus);
  const currentClientError = useSelector(selectCurrentClientError);
  const saveStatus = useSelector(selectClientStatus); // General status for create/update
  const saveError = useSelector(selectClientError); // General error for create/update


  const [clientData, setClientData] = useState({
    name: "",
    emailAddress: "",
    phoneNumber: "",
    address: "",
    notes: "",
    isImportant: false,
  });

  // const [isLoading, setIsLoading] = useState(false); // Replaced by Redux status
  // const [isSubmitting, setIsSubmitting] = useState(false); // Replaced by Redux status
  const [error, setError] = useState(null);

  // Combined loading state
  const isLoading = useMemo(() =>
    currentClientStatus === 'loading' || saveStatus === 'loading',
    [currentClientStatus, saveStatus]
  );

  // Combined error state
  const combinedError = useMemo(() =>
    error || // Local validation errors
    currentClientError ||
    saveError, // Include save error
    [error, currentClientError, saveError]
  );

  useEffect(() => {
    if (isEditing) {
      dispatch(fetchClientById(id));
    } else {
      dispatch(clearCurrentClient()); // Clear if creating new
      setClientData({ // Reset form
        name: "", emailAddress: "", phoneNumber: "", address: "", notes: "", isImportant: false,
      });
    }
    // Cleanup on unmount or ID change
    return () => {
      dispatch(clearCurrentClient());
      dispatch(clearClientError()); // Clear potential save errors
    };
  }, [id, isEditing, dispatch]);

  // Populate form when editing and data is loaded
  useEffect(() => {
    if (isEditing && currentClientStatus === 'succeeded' && currentClient) {
      setClientData({
        name: currentClient.name || "",
        emailAddress: currentClient.emailAddress || "",
        phoneNumber: currentClient.phoneNumber || "",
        address: currentClient.address || "",
        notes: currentClient.notes || "",
        isImportant: currentClient.isImportant || false,
      });
      setError(null); // Clear local error if data loads
    } else if (isEditing && currentClientStatus === 'failed') {
      setError(currentClientError); // Show fetch error
    }
  }, [isEditing, currentClientStatus, currentClient, currentClientError]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClientData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError(null); // Clear local error on change
  };

  const validateForm = () => {
    if (!clientData.name.trim()) return "Client Name is required.";
    if (!clientData.emailAddress.trim()) return "Email Address is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.emailAddress)) return "Please enter a valid email address.";
    if (!clientData.phoneNumber.trim()) return "Phone Number is required.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear local validation error
    dispatch(clearClientError()); // Clear Redux save error

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      if (isEditing) {
        await dispatch(updateClient({ id, clientData })).unwrap();
        dispatch(setAlert('Client updated successfully!', 'success'));
      } else {
        await dispatch(createClient(clientData)).unwrap();
        dispatch(setAlert('Client created successfully!', 'success'));
      }
      navigate("/clients");
    } catch (err) {
      console.error("Error saving client:", err.response || err);
      // Error state is handled by combinedError via Redux state
      const errorMessage = err?.response?.data?.message || err?.message || `Failed to ${isEditing ? 'save' : 'create'} client.`;
      dispatch(setAlert(errorMessage, 'danger'));
    }
  };

  // Use combined loading state
  if (isLoading) {
    return (
      <div className='vehicles-page'> 
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading client data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vehicles-page"> {/* Use standard page class */}
      <div className="vehicles-header"> {/* Use standard header */}
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faUserTie} />
            {isEditing ? "Update Client" : "Create Client"}
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <Link to="/clients" className="breadcrumb-link">Clients</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">{isEditing ? "Update Client" : "Create Client"}</span>
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
            <label htmlFor="clientName">Client Name*</label>
            <div className="input-with-icon">
            
              <input id="clientName" type="text" name="name" placeholder="Enter client name" value={clientData.name} onChange={handleInputChange} required disabled={isLoading} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientEmail">Email Address*</label>
            <div className="input-with-icon">
           
              <input id="clientEmail" type="email" name="emailAddress" placeholder="Enter email address" value={clientData.emailAddress} onChange={handleInputChange} required disabled={isLoading} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientPhone">Phone Number*</label>
            <div className="input-with-icon">
            
              <input id="clientPhone" type="tel" name="phoneNumber" placeholder="Enter phone number" value={clientData.phoneNumber} onChange={handleInputChange} required disabled={isLoading} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientAddress">Address</label>
            <div className="input-with-icon">
             
              <input id="clientAddress" type="text" name="address" placeholder="Enter address" value={clientData.address} onChange={handleInputChange} disabled={isLoading} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientNotes">Notes</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faStickyNote} className="input-icon textarea-icon" />
              <textarea id="clientNotes" name="notes" placeholder="Add any relevant notes" value={clientData.notes} onChange={handleInputChange} disabled={isLoading} rows="3" />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <input id="clientImportant" type="checkbox" name="isImportant" checked={clientData.isImportant} onChange={handleInputChange} disabled={isLoading} />
            <label htmlFor="clientImportant">
              <FontAwesomeIcon icon={faStar} /> Mark as Important
            </label>
          </div>

          <div className="form-footer"> {/* Use standard footer */}
            <button type="button" className="btn btn-danger" onClick={() => navigate("/clients")} disabled={isLoading}>
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={isLoading}>
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={isEditing ? faPen : faSave} /> {isEditing ? "Update Client" : "Save Client"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClient;
