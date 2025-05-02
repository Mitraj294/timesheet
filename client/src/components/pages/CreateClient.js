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
import Alert from "../layout/Alert"; // Import Alert component

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
import { parsePhoneNumberFromString, isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js'; // Import validation and country list functions

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

  // Define initial state structure
  const initialClientData = useMemo(() => ({
    name: "",
    emailAddress: "",
    phoneNumber: "",
    address: "",
    notes: "",
    isImportant: false,
  }), []); // Empty dependency array ensures it's created only once
  const [countryCode, setCountryCode] = useState('IN'); // Default country code set to India
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

  // Effect to show alerts for fetch or save errors from Redux state
  useEffect(() => {
    if (isEditing && currentClientStatus === 'idle') { // Fetch only if editing and not already fetched/loading
      dispatch(fetchClientById(id)); // Fetch existing client data
    } else if (!isEditing) { // Explicitly check for create mode
      dispatch(clearCurrentClient()); // Clear if creating new
      setClientData(initialClientData); // Reset form to initial structure
    }
    // Cleanup on unmount or ID change
    return () => {
      dispatch(clearCurrentClient());
      dispatch(clearClientError()); // Clear potential save errors
    };
  }, [id, isEditing, dispatch, initialClientData]); // Removed currentClientStatus from dependencies
  // Effect to show alerts for fetch or save errors from Redux state
  useEffect(() => {
    const reduxError = currentClientError || saveError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
      // Optionally clear the Redux error after showing the alert
    }
  }, [currentClientError, saveError, dispatch]);

  // Populate form when editing and data is loaded
  useEffect(() => {
    if (isEditing && currentClientStatus === 'succeeded' && currentClient) {
      // Create the potential new state based on currentClient
      const newClientDataFromStore = {
        name: currentClient.name || '',
        emailAddress: currentClient.emailAddress || '',
        phoneNumber: currentClient.phoneNumber || '',
        address: currentClient.address || '',
        notes: currentClient.notes || '',
        isImportant: currentClient.isImportant || false,
      };

      // Only update local state if the relevant data has actually changed
      setClientData(prevData => {
        if (prevData.name !== newClientDataFromStore.name ||
            prevData.emailAddress !== newClientDataFromStore.emailAddress ||
            prevData.phoneNumber !== newClientDataFromStore.phoneNumber ||
            prevData.address !== newClientDataFromStore.address ||
            prevData.notes !== newClientDataFromStore.notes ||
            prevData.isImportant !== newClientDataFromStore.isImportant) {
          return newClientDataFromStore;
        }
        return prevData; // No change needed
      });
    } else if (isEditing && currentClientStatus === 'failed') {
      // Error is handled by the useEffect watching currentClientError
      // setError(currentClientError);
    }
  }, [isEditing, currentClientStatus, currentClient, currentClientError]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClientData((prevData) => ({
      ...prevData,
      // If adding a separate input for country code, handle it here:
      [name]: type === "checkbox" ? checked : value,
    }));
    // if (error) setError(null); // Less needed
  };

  const validateForm = () => {
    if (!clientData.name.trim()) return "Client Name is required.";
    if (!clientData.emailAddress.trim()) return "Email Address is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.emailAddress)) return "Please enter a valid email address.";
    if (!clientData.phoneNumber.trim()) return "Phone Number is required.";

    // --- Use libphonenumber-js for validation ---
    // Pass the selected country code to the validation function
    try {
      // isValidPhoneNumber(number, defaultCountry)
      if (!isValidPhoneNumber(clientData.phoneNumber, countryCode)) {
        return `Please enter a valid phone number for the selected country (${countryCode}).`;
      }
    } catch (e) { // Catch potential parsing errors
      return "Invalid phone number format.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // setError(null); // Clear local validation error
    dispatch(clearClientError()); // Clear Redux save error

    const validationError = validateForm();
    if (validationError) {
      // setError(validationError);
      dispatch(setAlert(validationError, 'warning')); // Show validation error via Alert
      return;
    }

    try {
      // Optionally format phone number to E.164 before submitting
      let formattedPhoneNumber = clientData.phoneNumber;
      try {
        const phoneNumberParsed = parsePhoneNumberFromString(clientData.phoneNumber, countryCode);
        if (phoneNumberParsed) {
          formattedPhoneNumber = phoneNumberParsed.format('E.164'); // Format to +64...
        }
      } catch (e) { console.warn("Could not format phone number to E.164", e); }

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
      // Error state is handled by the useEffect watching saveError
      const errorMessage = err?.response?.data?.message || err?.message || `Failed to ${isEditing ? 'save' : 'create'} client.`;
      dispatch(setAlert(errorMessage, 'danger'));
    }
  };

  // Generate country code options dynamically
  const countryOptions = useMemo(() => {
    const countries = getCountries(); // Gets ['AC', 'AD', 'AE', ...]
    return countries.map(country => ({
      value: country,
      label: `+${getCountryCallingCode(country)} (${country})`
    })).sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically by label
  }, []);

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
      <Alert /> {/* Render Alert component here */}
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
          {/* {combinedError && ( // Use combined error state - Removed inline display
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {combinedError}
            </div>
          )} */}

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

          {/* Phone Number Group with Country Code */}
          <div className="form-group form-group-inline">
            <label htmlFor="clientPhone">Phone Number*</label>
            <div className="phone-input-group">
              <select
                name="countryCode"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="country-code-select"
                disabled={isLoading}
                aria-label="Country Code"
              >
                {/* Dynamically generate options */}
                {countryOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
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
