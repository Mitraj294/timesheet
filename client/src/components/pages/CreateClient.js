import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserTie,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faStickyNote,
  faSave,
  faTimes,
  faSpinner,
  faExclamationCircle,
  faStar,
  faPen,
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/Forms.scss"; // *** Use Forms.scss ***

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const CreateClient = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [clientData, setClientData] = useState({
    name: "",
    emailAddress: "",
    phoneNumber: "",
    address: "",
    notes: "",
    isImportant: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      axios.get(`${API_URL}/clients/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((response) => {
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientData.emailAddress)) return "Please enter a valid email address.";
    if (!clientData.phoneNumber.trim()) return "Phone Number is required.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

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
      navigate("/clients");
    } catch (err) {
      console.error("Error saving client:", err.response || err);
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'save'} client. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className='vehicles-page'> {/* Use standard page class */}
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
          {error && (
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="clientName">Client Name*</label>
            <div className="input-with-icon">
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
              <FontAwesomeIcon icon={faStickyNote} className="input-icon textarea-icon" />
              <textarea id="clientNotes" name="notes" placeholder="Add any relevant notes" value={clientData.notes} onChange={handleInputChange} disabled={isSubmitting} rows="3" />
            </div>
          </div>

          <div className="form-group checkbox-group">
            <input id="clientImportant" type="checkbox" name="isImportant" checked={clientData.isImportant} onChange={handleInputChange} disabled={isSubmitting} />
            <label htmlFor="clientImportant">
              <FontAwesomeIcon icon={faStar} /> Mark as Important
            </label>
          </div>

          <div className="form-footer"> {/* Use standard footer */}
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
