import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  fetchClientById, createClient, updateClient,
  selectCurrentClient, selectCurrentClientStatus, selectCurrentClientError,
  selectClientStatus, selectClientError,
  clearCurrentClient, clearClientError
} from "../../redux/slices/clientSlice";
import { setAlert } from "../../redux/slices/alertSlice";
import Alert from "../layout/Alert";

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

  // Redux state
  const currentClient = useSelector(selectCurrentClient);
  const currentClientStatus = useSelector(selectCurrentClientStatus);
  const currentClientError = useSelector(selectCurrentClientError);
  const saveStatus = useSelector(selectClientStatus); // Tracks status of create/update operations
  const saveError = useSelector(selectClientError);   // Tracks errors from create/update operations

  // Initial form data structure, memoized for stability
  const initialClientData = useMemo(() => ({
    name: "",
    emailAddress: "",
    phoneNumber: "",
    address: "",
    notes: "",
    isImportant: false,
  }), []);

  // Local component state
  const [countryCode, setCountryCode] = useState('IN'); // Default country code for phone validation
  const [clientData, setClientData] = useState({ // Form data
    name: "",
    emailAddress: "",
    phoneNumber: "",
    address: "",
    notes: "",
    isImportant: false,
  });

  // const [error, setError] = useState(null); // Local form validation errors are now handled via alerts

  // Derived loading state from Redux statuses
  const isLoading = useMemo(() =>
    currentClientStatus === 'loading' || saveStatus === 'loading',
    [currentClientStatus, saveStatus]
  );
  
  // Effects

  // Handles fetching existing client data for editing, or initializing form for creation
  useEffect(() => {
    if (isEditing) {
      // Fetch if id is present, and either no client is loaded,
      // or the loaded client is different, and we're not already loading.
      if (id && (!currentClient || currentClient._id !== id) && currentClientStatus !== 'loading') {
        dispatch(fetchClientById(id));
      }
    } else if (!isEditing) {
      dispatch(clearCurrentClient());
      setClientData(initialClientData);
    }
    // Cleanup: clear current client and any save errors when component unmounts or `id` changes
    return () => {
      dispatch(clearCurrentClient());
      dispatch(clearClientError());
    };
    // This effect should run when the mode (isEditing) or the ID (id) changes.
    // Dispatch and initialClientData are stable. currentClient and currentClientStatus are checked internally.
  }, [id, isEditing, dispatch, initialClientData]); // Removed currentClientStatus from deps

  // Displays errors from Redux state (fetch or save operations) as alerts
  useEffect(() => {
    const reduxError = currentClientError || saveError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [currentClientError, saveError, dispatch]);

  // Populates the form when editing and client data is successfully fetched
  useEffect(() => {
    if (isEditing && currentClientStatus === 'succeeded' && currentClient) {
      const newClientDataFromStore = {
        name: currentClient.name || '',
        emailAddress: currentClient.emailAddress || '',
        phoneNumber: currentClient.phoneNumber || '',
        address: currentClient.address || '',
        notes: currentClient.notes || '',
        isImportant: currentClient.isImportant || false,
      };

      // Directly set form data once, as this effect now depends on specific fields
      setClientData(newClientDataFromStore);
    }
    // This effect depends on the status and the specific fields of the currentClient.
  }, [
    isEditing,
    currentClientStatus,
    currentClient?._id, // Add _id to ensure it runs if the client entity changes
    currentClient?.name,
    currentClient?.emailAddress,
    currentClient?.phoneNumber,
    currentClient?.address,
    currentClient?.notes,
    currentClient?.isImportant]); // Depend on individual fields

  // Event Handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClientData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Form Validation
  const validateForm = () => {
    if (!clientData.name.trim()) return "Client Name is required.";
    if (!clientData.emailAddress.trim()) return "Email Address is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.emailAddress)) return "Please enter a valid email address.";
    if (!clientData.phoneNumber.trim()) return "Phone Number is required.";

    // Validate phone number using libphonenumber-js with the selected country code
    try {
      if (!isValidPhoneNumber(clientData.phoneNumber, countryCode)) {
        return `Please enter a valid phone number for the selected country (${countryCode}).`;
      }
    } catch (e) { // Catch potential parsing errors
      return "Invalid phone number format.";
    }
    return null;
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearClientError()); // Clear previous Redux save/operation errors

    const validationError = validateForm();
    if (validationError) {
      dispatch(setAlert(validationError, 'warning'));
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
      const errorMessage = err?.response?.data?.message || err?.message || `Failed to ${isEditing ? 'save' : 'create'} client.`;
      dispatch(setAlert(errorMessage, 'danger'));
    }
  };

  // Memoized Data
  const countryOptions = useMemo(() => {
    const countries = getCountries();
    return countries.map(country => ({
      value: country,
      label: `+${getCountryCallingCode(country)} (${country})`
    })).sort((a, b) => a.label.localeCompare(b.label)); // Sort for better UX
  }, []);

  // Render Logic
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
    <div className="vehicles-page">
      <Alert />
      <div className="vehicles-header">
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

      <div className="form-container">
        <form onSubmit={handleSubmit} className="employee-form" noValidate>
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

          <div className="form-footer">
            <button type="button" className="btn btn-danger" onClick={() => navigate("/clients")} disabled={isLoading}>
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button type="submit" className="btn btn-green" disabled={isLoading}>
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
