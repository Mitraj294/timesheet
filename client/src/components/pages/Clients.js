import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faDownload, faPlus, faSearch, faEye, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";
import "../../styles/Clients.scss";

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useSelector((state) => state.auth); // Get logged-in user

  useEffect(() => {
    axios.get(`${API_URL}/clients`)  // Use API_URL here
      .then(res => setClients(res.data))
      .catch(err => console.error("Error fetching clients:", err));
  }, []);

  const deleteClient = async (clientId) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;

    try {
      await axios.delete(`${API_URL}/clients/${clientId}`);  // Use API_URL here
      setClients(clients.filter(client => client._id !== clientId));
    } catch (err) {
      console.error("Error deleting client:", err);
      alert("Failed to delete client.");
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadClients = async () => {
    try {
      const response = await axios.get(`${API_URL}/clients/download`, {  // Use API_URL here
        responseType: 'blob',  
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'clients.xlsx'); // Download filename
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download clients.');
    }
  };



  
  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h2><FontAwesomeIcon icon={faUsers} /> Clients</h2>
        <div className="actions">
        <button className="btn btn-download" onClick={handleDownloadClients}>
  <FontAwesomeIcon icon={faDownload} /> Download
</button>
{user?.role === "employer" && (
          <Link to="/clients/create" className="btn btn-primary">
            <FontAwesomeIcon icon={faPlus} /> Add New Client
          </Link>)}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link> / <span>Clients</span>
      </div>

      {/* Search */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by Client Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button>
          <FontAwesomeIcon icon={faSearch} />
        </button>
      </div>

      {/* Clients List */}
      <div className="list">
        <table>
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Email Address</th>
              <th>Phone Number</th>
              <th>Address</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map(client => (
              <tr key={client._id}>
                <td>{client.name}</td>
                <td>{client.emailAddress}</td>
                <td>{client.phoneNumber}</td>
                <td>{client.address || "--"}</td>
                <td>{client.notes || "--"}</td>
             
                <td className="actions">
                  <Link to={`/clients/view/${client._id}`} className="btn btn-view">
                    <FontAwesomeIcon icon={faEye} />
                  </Link>
                  {user?.role === "employer" && (
                  <Link to={`/clients/update/${client._id}`} className="btn btn-edit">
                    <FontAwesomeIcon icon={faEdit} />
                  </Link>
                  )}
                      {user?.role === "employer" && (
                  <button className="btn btn-delete" onClick={() => deleteClient(client._id)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clients;
