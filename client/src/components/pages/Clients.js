import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom"; // Added useNavigate
import { useSelector } from "react-redux"; // Keep using useSelector for user role
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faDownload,
  faPlus,
  faSearch,
  faEye,
  faPen, // Changed from faEdit to faPen for consistency
  faTrash,
  faSpinner, // Added for loading state
  faExclamationCircle, // Added for error state
} from "@fortawesome/free-solid-svg-icons";
// Import the shared SCSS file
import "../../styles/Vehicles.scss"; // *** Use Vehicles.scss ***

const API_URL = process.env.REACT_APP_API_URL || "https://timesheet-c4mj.onrender.com/api";

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true); // Added loading state
  const [error, setError] = useState(null); // Added error state
  const [downloading, setDownloading] = useState(false); // Added downloading state
  const [downloadError, setDownloadError] = useState(null); // Added download error state

  const { user } = useSelector((state) => state.auth || {}); // Get user role
  const navigate = useNavigate(); // Use navigate hook

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      setError(null);
      try {
        // Assuming token is needed, add header if required by your API
        const token = localStorage.getItem('token');
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get(`${API_URL}/clients`, config);
        setClients(res.data || []);
      } catch (err) {
        console.error("Error fetching clients:", err);
        setError(err.response?.data?.message || err.message || "Failed to fetch clients.");
        // Optional: Handle auth errors like in Vehicles.js
        if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token'); // Example cleanup
            navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [navigate]); // Added navigate dependency

  const deleteClient = async (clientId, clientName) => { // Added clientName for confirmation
    if (!window.confirm(`Are you sure you want to delete client "${clientName}"?`)) return;

    try {
      // Assuming token is needed
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.delete(`${API_URL}/clients/${clientId}`, config);
      setClients(clients.filter((client) => client._id !== clientId));
      // Consider adding success feedback (toast)
    } catch (err) {
      console.error("Error deleting client:", err);
      // Display error to user (e.g., using setError state or a toast)
      setError(`Failed to delete client "${clientName}". ${err.response?.data?.message || err.message}`);
      // alert("Failed to delete client."); // Avoid using alert
    }
  };

  const filteredClients = clients.filter((client) =>
    client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) || // Added email search
    client?.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) // Added phone search
  );

  const handleDownloadClients = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      // Assuming token is needed
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" } : { responseType: "blob" };

      const response = await axios.get(`${API_URL}/clients/download`, config);

      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "clients.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadError("Failed to download clients.");
      // alert("Failed to download clients."); // Avoid alert
    } finally {
      setDownloading(false);
    }
  };

  // Define grid columns for clients
  const gridColumns = '1.5fr 1.5fr 1fr 2fr 1.5fr auto'; // Adjust fr units as needed

  return (
    // Use the main page class from Vehicles.scss
    <div className="vehicles-page">
      {/* Use the header structure from Vehicles.scss */}
      <div className="vehicles-header">
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faUsers} /> Clients
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">Clients</span>
          </div>
        </div>
        {/* Actions moved to a separate bar below header, like Vehicles.js */}
      </div>

      {/* Action bar like Vehicles.js */}
      <div className="vehicles-actions">
         {/* Use standard button classes */}
         <button
            className="btn btn-download-report" // Using a distinct color like danger/red for download
            onClick={handleDownloadClients}
            disabled={downloading}
          >
            {downloading ? (
                <> <FontAwesomeIcon icon={faSpinner} spin /> Downloading... </>
            ) : (
                <> <FontAwesomeIcon icon={faDownload} /> Download Excel </>
            )}
          </button>
          {user?.role === "employer" && (
            <button
              className="btn btn-success" // Green button for Add
              onClick={() => navigate('/clients/create')}
            >
              <FontAwesomeIcon icon={faPlus} /> Add New Client
            </button>
          )}
      </div>
       {/* Display download error if any */}
       {downloadError && (
            <div className='error-message' style={{marginBottom: '1rem'}}> {/* Inline style for spacing */}
              <FontAwesomeIcon icon={faExclamationCircle} /> {downloadError}
            </div>
        )}

      {/* Search bar using Vehicles.scss styles */}
      <div className="vehicles-search">
        <input
          type="text"
          placeholder="Search by Name, Email, or Phone..." // Updated placeholder
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search Clients"
        />
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
      </div>

      {/* Loading State */}
      {loading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading clients...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
          {/* Optional: Add a retry button */}
          {/* <button className="btn btn-secondary" onClick={fetchClients}>Retry</button> */}
        </div>
      )}

      {/* Client Grid/List */}
      {!loading && !error && (
        <div className="vehicles-grid"> {/* Use vehicles-grid class */}
          {/* Header Row */}
          <div className="vehicles-row header" style={{ gridTemplateColumns: gridColumns }}>
            <div>Client Name</div>
            <div>Email Address</div>
            <div>Phone Number</div>
            <div>Address</div>
            <div>Notes</div>
            {/* Actions only shown if employer */}
            {user?.role === "employer" && <div>Actions</div>}
          </div>

          {/* Data Rows */}
          {filteredClients.length === 0 ? (
            <div className="vehicles-row no-results">
              {searchTerm ? 'No clients match your search.' : 'No clients found.'}
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client._id}
                className="vehicles-row vehicle-card" // Use vehicle-card for responsive
                style={{ gridTemplateColumns: gridColumns }}
              >
                <div data-label="Client Name">{client.name || '--'}</div>
                <div data-label="Email">{client.emailAddress || '--'}</div>
                <div data-label="Phone">{client.phoneNumber || '--'}</div>
                <div data-label="Address">{client.address || '--'}</div>
                <div data-label="Notes">{client.notes || '--'}</div>
                {/* Actions only shown if employer */}
                {user?.role === "employer" && (
                  <div data-label="Actions" className="actions">
                    {/* Use icon buttons from Vehicles.scss */}
                    <button
                      className="btn-icon btn-icon-blue" // View button
                      onClick={() => navigate(`/clients/view/${client._id}`)}
                      title={`View ${client.name}`}
                      aria-label={`View ${client.name}`}
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button
                      className="btn-icon btn-icon-yellow" // Edit button
                      onClick={() => navigate(`/clients/update/${client._id}`)}
                      title={`Edit ${client.name}`}
                      aria-label={`Edit ${client.name}`}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </button>
                    <button
                      className="btn-icon btn-icon-red" // Delete button
                      onClick={() => deleteClient(client._id, client.name)}
                      title={`Delete ${client.name}`}
                      aria-label={`Delete ${client.name}`}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Clients;
