import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faDownload,
  faPlus,
  faSearch,
  faEye,
  faPen,
  faTrash,
  faSpinner,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";

import "../../styles/Vehicles.scss"; 

const API_URL = process.env.REACT_APP_API_URL || "https://timesheet-c4mj.onrender.com/api";

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const { user } = useSelector((state) => state.auth || {});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      setError(null);
      setDownloadError(null); 
      try {
        const token = localStorage.getItem('token');
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        const res = await axios.get(`${API_URL}/clients`, config);
        setClients(res.data || []);
      } catch (err) {
        console.error("Error fetching clients:", err);
        setError(err.response?.data?.message || err.message || "Failed to fetch clients.");
        if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, [navigate]);

  const deleteClient = async (clientId, clientName) => {
    if (!window.confirm(`Are you sure you want to delete client "${clientName}"?`)) return;

    setError(null); 
    try {
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.delete(`${API_URL}/clients/${clientId}`, config);
      setClients(clients.filter((client) => client._id !== clientId));
    
    } catch (err) {
      console.error("Error deleting client:", err);
      setError(`Failed to delete client "${clientName}". ${err.response?.data?.message || err.message}`);
    }
  };

  const filteredClients = clients.filter((client) =>
    client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadClients = async () => {
    setDownloading(true);
    setDownloadError(null);
    setError(null); 
    try {
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
      setDownloadError(error.response?.data?.message || "Failed to download clients.");
    } finally {
      setDownloading(false);
    }
  };


  const gridColumns = '1.5fr 1.5fr 1fr 2fr 1.5fr auto'; 

  return (

    <div className="vehicles-page">

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
  
        <div className="header-actions"> 
          <button
            className="btn btn-danger" 
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
              className="btn btn-success" 
              onClick={() => navigate('/clients/create')}
            >
              <FontAwesomeIcon icon={faPlus} /> Add New Client
            </button>
          )}
        </div>

      </div>

    
       {downloadError && (
            <div className='error-message' style={{marginBottom: '1rem'}}>
              <FontAwesomeIcon icon={faExclamationCircle} /> {downloadError}
            </div>
        )}

   
      <div className="vehicles-search">
        <input
          type="text"
          placeholder="Search by Name, Email, or Phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search Clients"
        />
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
      </div>

  
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
        
        </div>
      )}

   
      {!loading && !error && (
        <div className="vehicles-grid"> 
        
          <div className="vehicles-row header" style={{ gridTemplateColumns: gridColumns }}>
            <div>Client Name</div>
            <div>Email Address</div>
            <div>Phone Number</div>
            <div>Address</div>
            <div>Notes</div>
            {user?.role === "employer" && <div>Actions</div>}
          </div>

        
          {filteredClients.length === 0 ? (
            <div className="vehicles-row no-results">
              {searchTerm ? 'No clients match your search.' : 'No clients found.'}
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client._id}//
                className="vehicles-row vehicle-card" 
                style={{ gridTemplateColumns: gridColumns }}
              >
                <div data-label="Client Name">{client.name || '--'}</div>
                <div data-label="Email">{client.emailAddress || '--'}</div>
                <div data-label="Phone">{client.phoneNumber || '--'}</div>
                <div data-label="Address">{client.address || '--'}</div>
                <div data-label="Notes">{client.notes || '--'}</div>
                {user?.role === "employer" && (
                  <div data-label="Actions" className="actions"> 
            
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
