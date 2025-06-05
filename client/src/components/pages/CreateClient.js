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
  faUserTie, faStickyNote, faSave, faTimes, faSpinner,
  faExclamationCircle, faStar, faPen,
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/Forms.scss";
import { parsePhoneNumberFromString, isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js';

const CreateClient = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dispatch = useDispatch();
  const isEditing = Boolean(id);

  // Redux state
  const currentClient = useSelector(selectCurrentClient);
  const currentClientStatus = useSelector(selectCurrentClientStatus);
  const currentClientError = useSelector(selectCurrentClientError);
  const saveStatus = useSelector(selectClientStatus);
  const saveError = useSelector(selectClientError);

  // Initial form data
  const initialClientData = useMemo(() => ({
    name: "",
    emailAddress: "",
    phoneNumber: "",
    address: "",
    notes: "",
    isImportant: false,
  }), []);

  // Local state
  const [countryCode, setCountryCode] = useState('IN');
  const [clientData, setClientData] = useState(initialClientData);

  // Loading state
  const isLoading = useMemo(() =>
    currentClientStatus === 'loading' || saveStatus === 'loading',
    [currentClientStatus, saveStatus]
  );

  // Fetch or clear client data on mount/change
  useEffect(() => {
    if (isEditing) {
      if (id && (!currentClient || currentClient._id !== id) && currentClientStatus !== 'loading') {
        dispatch(fetchClientById(id));
      }
    } else {
      dispatch(clearCurrentClient());
      setClientData(initialClientData);
    }
    return () => {
      dispatch(clearCurrentClient());
      dispatch(clearClientError());
    };
  }, [id, isEditing, dispatch, initialClientData]);

  // Show Redux errors as alerts
  useEffect(() => {
    const reduxError = currentClientError || saveError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [currentClientError, saveError, dispatch]);

  // Populate form when editing
  useEffect(() => {
    if (isEditing && currentClientStatus === 'succeeded' && currentClient) {
      setClientData({
        name: currentClient.name || '',
        emailAddress: currentClient.emailAddress || '',
        phoneNumber: currentClient.phoneNumber || '',
        address: currentClient.address || '',
        notes: currentClient.notes || '',
        isImportant: currentClient.isImportant || false,
      });
    }
  }, [
    isEditing,
    currentClientStatus,
    currentClient?._id,
    currentClient?.name,
    currentClient?.emailAddress,
    currentClient?.phoneNumber,
    currentClient?.address,
    currentClient?.notes,
    currentClient?.isImportant
  ]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClientData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Simple form validation
  const validateForm = () => {
    if (!clientData.name.trim()) return "Client Name is required.";
    if (!clientData.emailAddress.trim()) return "Email Address is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.emailAddress)) return "Please enter a valid email address.";
    if (!clientData.phoneNumber.trim()) return "Phone Number is required.";
    try {
      if (!isValidPhoneNumber(clientData.phoneNumber, countryCode)) {
        return `Please enter a valid phone number for ${countryCode}.`;
      }
    } catch {
      return "Invalid phone number format.";
    }
    return null;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearClientError());
    const validationError = validateForm();
    if (validationError) {
      dispatch(setAlert(validationError, 'warning'));
      return;
    }
    try {
      let formattedPhoneNumber = clientData.phoneNumber;
      try {
        const phoneNumberParsed = parsePhoneNumberFromString(clientData.phoneNumber, countryCode);
        if (phoneNumberParsed) {
          formattedPhoneNumber = phoneNumberParsed.format('E.164');
        }
      } catch {}
      if (isEditing) {
        await dispatch(updateClient({ id, clientData })).unwrap();
        dispatch(setAlert('Client updated successfully!', 'success'));
      } else {
        await dispatch(createClient(clientData)).unwrap();
        dispatch(setAlert('Client created successfully!', 'success'));
      }
      navigate("/clients");
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || `Failed to ${isEditing ? 'save' : 'create'} client.`;
      dispatch(setAlert(errorMessage, 'danger'));
    }
  };

  // Country options for phone input
  const countryOptions = useMemo(() => {
    const countries = getCountries();
    return countries.map(country => ({
      value: country,
      label: `+${getCountryCallingCode(country)} (${country})`
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Show loading spinner
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
          {/* Name */}
          <div className="form-group">
            <label htmlFor="clientName">Client Name*</label>
            <div className="input-with-icon">
              <input id="clientName" type="text" name="name" placeholder="Enter client name" value={clientData.name} onChange={handleInputChange} required disabled={isLoading} />
            </div>
          </div>
          {/* Email */}
          <div className="form-group">
            <label htmlFor="clientEmail">Email Address*</label>
            <div className="input-with-icon">
              <input id="clientEmail" type="email" name="emailAddress" placeholder="Enter email address" value={clientData.emailAddress} onChange={handleInputChange} required disabled={isLoading} />
            </div>
          </div>
          {/* Phone with country code */}
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
          {/* Address */}
          <div className="form-group">
            <label htmlFor="clientAddress">Address</label>
            <div className="input-with-icon">
              <input id="clientAddress" type="text" name="address" placeholder="Enter address" value={clientData.address} onChange={handleInputChange} disabled={isLoading} />
            </div>
          </div>
          {/* Notes */}
          <div className="form-group">
            <label htmlFor="clientNotes">Notes</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faStickyNote} className="input-icon textarea-icon" />
              <textarea id="clientNotes" name="notes" placeholder="Add any relevant notes" value={clientData.notes} onChange={handleInputChange} disabled={isLoading} rows="3" />
            </div>
          </div>
          {/* Important checkbox */}
          <div className="form-group checkbox-group">
            <input id="clientImportant" type="checkbox" name="isImportant" checked={clientData.isImportant} onChange={handleInputChange} disabled={isLoading} />
            <label htmlFor="clientImportant">
              <FontAwesomeIcon icon={faStar} /> Mark as Important
            </label>
          </div>
          {/* Form buttons */}
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
