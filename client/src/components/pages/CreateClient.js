import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faEnvelope, faPhone, faMapMarker, faStickyNote, faSave, faTimes } from "@fortawesome/free-solid-svg-icons";
import "../../styles/CreateForms.scss";

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const CreateClient = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [clientData, setClientData] = useState({
    name: "",
    emailAddress: "",
    phoneNumber: "",
    address: "",
    notes: "",
    isImportant: false,
  });


  useEffect(() => {
    if (id) {
      axios.get(`${API_URL}/clients/${id}`)  // Use API_URL here
        .then((response) => setClientData(response.data))
        .catch((error) => console.error("Error fetching client data:", error));
    }
  }, [id]);
  

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setClientData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (id) {
        await axios.put(`${API_URL}/clients/${id}`, clientData);  // Using API_URL here
      } else {
        await axios.post(`${API_URL}/clients`, clientData);  // Using API_URL here
      }
      alert("Client saved successfully!");
      navigate("/clients");
    } catch (error) {
      console.error("Error saving client:", error);
      alert("Failed to save client. Please try again.");
    }
  };
  

  return (
    <div className="create-client-container">
      <h2>{id ? "Update Client" : "Create Client"}</h2>

      <div className="breadcrumb">
  <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
  <span> / </span>
  <Link to="/clients" className="breadcrumb-link">Clients</Link>
  <span> / </span>
  <span>{id ? "Update Client" : "Create Client"}</span>
</div>


      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <FontAwesomeIcon icon={faUser} className="input-icon" />
            <input type="text" name="name" placeholder="Client Name" value={clientData.name} onChange={handleInputChange} required />
          </div>

          <div className="form-group">
            <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
            <input type="email" name="emailAddress" placeholder="Email Address" value={clientData.emailAddress} onChange={handleInputChange} required />
          </div>

          <div className="form-group">
            <FontAwesomeIcon icon={faPhone} className="input-icon" />
            <input type="text" name="phoneNumber" placeholder="Phone Number" value={clientData.phoneNumber} onChange={handleInputChange} required />
          </div>

          <div className="form-group">
            <FontAwesomeIcon icon={faMapMarker} className="input-icon" />
            <input type="text" name="address" placeholder="Address" value={clientData.address} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <FontAwesomeIcon icon={faStickyNote} className="input-icon" />
            <textarea name="notes" placeholder="Notes" value={clientData.notes} onChange={handleInputChange} />
          </div>

          <div className="checkbox-group">
            <input type="checkbox" name="isImportant" checked={clientData.isImportant} onChange={handleInputChange} />
            <label>Important</label>
          </div>

          {/* Buttons */}
          <div className="form-buttons">
            <button type="submit" className="submit-btn">
              <FontAwesomeIcon icon={faSave} /> {id ? "Update Client" : "Save Client"}
            </button>
            <button type="button" className="cancel-btn" onClick={() => navigate("/clients")}>
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClient;
