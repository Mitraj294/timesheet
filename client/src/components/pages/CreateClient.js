import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserTie, // Changed icon for Client
  faEnvelope,
  faPhone,
  faMapMarkerAlt, // Changed icon for Address
  faStickyNote,
  faSave,
  faTimes,
  faSpinner,
  faExclamationCircle,
  faStar, // Icon for Important
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/EmployeeForms.scss"; // Use shared form styles

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const CreateClient = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get client ID if editing
  const isEditing = Boolean(id);

  const [clientData, setClientData] = useState({
    name: "",
    emailAddress: "",
    phoneNumber: "",
    address: "",
    notes: "",
    isImportant: false,
  });

  const [isLoading, setIsLoading] = useState(false); // Loading state for fetching data (if editing)
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for form submission
  const [error, setError] = useState(null); // Error state

  // Fetch client data if editing
  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("token"); // Assuming auth is needed
      axios.get(`${API_URL}/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((response) => {
          // Ensure response.data exists and has expected fields
          const data = response.data || {};
          setClientData({
            name: data.name || "",
            emailAddress: data.emailAddress || "",
            phoneNumber: data.phoneNumber || "",
            address: data.address || "",
            notes: data.notes || "",
            isImportant: data.isImportant || false,
          });
        })
        .catch((err) => {
          console.error("Error fetching client data:", err);
          setError("Failed to load client data.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    // Removed the eslint-disable comment. Dependencies [id, isEditing] seem correct.
    // API_URL is a constant, state setters (setIsLoading, setError, setClientData) are generally stable.
  }, [id, isEditing]);


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClientData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!clientData.name.trim()) return "Client Name is required.";
    if (!clientData.emailAddress.trim()) return "Email Address is required.";
    // Basic email format check (optional, browser validation often handles this)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.emailAddress)) return "Please enter a valid email address.";
    if (!clientData.phoneNumber.trim()) return "Phone Number is required.";
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

    try {
      if (isEditing) {
        await axios.put(`${API_URL}/clients/${id}`, clientData, config);
      } else {
        await axios.post(`${API_URL}/clients`, clientData, config);
      }
      // Consider showing a success message via state/toast instead of alert
      // alert("Client saved successfully!");
      navigate("/clients"); // Navigate back to the clients list
    } catch (err) {
      console.error("Error saving client:", err.response || err);
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'save'} client. Please try again.`);
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
          <p>Loading client data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page-container"> {/* Outer container */}
      <div className="form-header"> {/* Header section */}
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faUserTie} /> {/* Title icon */}
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

      <div className="form-container"> {/* Form container */}
        <form onSubmit={handleSubmit} className="employee-form" noValidate> {/* Form with class */}
          {error && (
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="clientName">Client Name*</label>
            <div className="input-with-icon"> {/* Wrapper for icon and input */}
              <FontAwesomeIcon icon={faUserTie} className="input-icon" />
              <input id="clientName" type="text" name="name" placeholder="Enter client name" value={clientData.name} onChange={handleInputChange} required disabled={isSubmitting} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientEmail">Email Address*</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
              <input id="clientEmail" type="email" name="emailAddress" placeholder="Enter email address" value={clientData.emailAddress} onChange={handleInputChange} required disabled={isSubmitting} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientPhone">Phone Number*</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faPhone} className="input-icon" />
              <input id="clientPhone" type="tel" name="phoneNumber" placeholder="Enter phone number" value={clientData.phoneNumber} onChange={handleInputChange} required disabled={isSubmitting} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientAddress">Address</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faMapMarkerAlt} className="input-icon" />
              <input id="clientAddress" type="text" name="address" placeholder="Enter address" value={clientData.address} onChange={handleInputChange} disabled={isSubmitting} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="clientNotes">Notes</label>
            <div className="input-with-icon">
              <FontAwesomeIcon icon={faStickyNote} className="input-icon textarea-icon" /> {/* Added class for alignment */}
              <textarea id="clientNotes" name="notes" placeholder="Add any relevant notes" value={clientData.notes} onChange={handleInputChange} disabled={isSubmitting} rows="3" />
            </div>
          </div>

          <div className="form-group checkbox-group"> {/* Checkbox group */}
            <input id="clientImportant" type="checkbox" name="isImportant" checked={clientData.isImportant} onChange={handleInputChange} disabled={isSubmitting} />
            <label htmlFor="clientImportant">
              <FontAwesomeIcon icon={faStar} /> Mark as Important
            </label>
          </div>

          {/* Buttons */}
          <div className="form-footer"> {/* Footer for buttons */}
            <button type="button" className="btn btn-danger" onClick={() => navigate("/clients")} disabled={isSubmitting}>
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} /> {isEditing ? "Update Client" : "Save Client"}
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
