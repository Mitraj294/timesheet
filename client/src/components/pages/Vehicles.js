import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../styles/Vehicles.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPaperPlane,
  faDownload,
  faEye,
  faPen,
  faTrash,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  // Fetch vehicles from the backend
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const res = await axios.get(`${BASE_URL}/vehicles`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setVehicles(res.data);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        if (err.response?.status === 401) {
          alert('Unauthorized. Please log in again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          alert('Failed to fetch vehicles. Please try again later.');
        }
      }
    };

    fetchVehicles();
  }, [navigate]);

  const handleDownloadReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/vehicles/download-report`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',  // Make sure this is set to handle the file correctly
      });

      // Create a Blob from the response data
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Create an anchor element to trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_vehicles_report.xlsx';  // Filename for download
      a.click();  // Trigger the download
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('Failed to download vehicle report.');
    }
  };

  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  return (
    <div className="vehicles-page">
      <div className="vehicles-header">
        <h4>Vehicles</h4>
        <div className="breadcrumbs">
          <Link to="/employer/dashboard">Dashboard</Link> / Vehicles
        </div>
      </div>

      <div className="vehicles-actions">
        <Link to="/employer/vehicles/create" className="btn btn-green">
          <FontAwesomeIcon icon={faPlus} /> Create Vehicle
        </Link>
        <button className="btn btn-purple">
          <FontAwesomeIcon icon={faPaperPlane} /> Send Report
        </button>
        <button className="btn btn-red" onClick={handleDownloadReport}>
          <FontAwesomeIcon icon={faDownload} /> Download Report
        </button>
      </div>

      <div className="vehicles-search">
        <input
          type="text"
          placeholder="Search for a Vehicle"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
      </div>

      <div className="vehicles-grid">
        <div className="vehicles-row header">
          <div>Date Created</div>
          <div>Vehicle Name</div>
          <div>Hours</div>
          <div>WOF/Rego</div>
          <div>Actions</div>
        </div>
        {vehicles.length === 0 ? (
          <div className="vehicles-row no-results">No vehicles found.</div>
        ) : (
          vehicles.map((vehicle) => (
            <div key={vehicle._id} className="vehicles-row">
              <div>{vehicle.createdAt?.split('T')[0]}</div>
              <div>{vehicle.name}</div>
              <div>{vehicle.hours || '--'}</div>
              <div>{vehicle.wofRego || '--'}</div>
              <div className="actions">
                <Link to={`/vehicles/view/${vehicle._id}`} className="btn-icon">
                  <FontAwesomeIcon icon={faEye} />
                </Link>
                <Link to={`/vehicles/update/${vehicle._id}`} className="btn-icon">
                  <FontAwesomeIcon icon={faPen} />
                </Link>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => handleDeleteVehicle(vehicle._id)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Vehicles;
