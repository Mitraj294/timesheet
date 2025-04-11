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

  // Fetch vehicles from the API
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/vehicles', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setVehicles(res.data);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        if (err.response?.status === 401) {
          alert('Unauthorized. Please log in again.');
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };

    fetchVehicles();
  }, [navigate]);

  // Handler for deleting a vehicle
  const handleDeleteVehicle = async (vehicleId) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this vehicle?'
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/vehicles/${vehicleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Remove the deleted vehicle from state so UI updates immediately
      setVehicles((prevVehicles) =>
        prevVehicles.filter((vehicle) => vehicle._id !== vehicleId)
      );
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      alert('Failed to delete vehicle. Please try again.');
    }
  };

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

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
        <button className="btn btn-red">
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
        {filteredVehicles.map((vehicle) => (
          <div key={vehicle._id} className="vehicles-row">
            <div>{vehicle.createdAt?.split('T')[0]}</div>
            <div>{vehicle.name}</div>
            <div>{vehicle.hours || '--'}</div>
            <div>{vehicle.wofRego || '--'}</div>
            <div className="actions">
              <Link
                to={`/vehicles/view/${vehicle._id}`}
                className="btn-icon"
              >
                <FontAwesomeIcon icon={faEye} />
              </Link>
              <Link
                to={`/vehicles/update/${vehicle._id}`}
                className="btn-icon"
              >
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
        ))}
      </div>
    </div>
  );
};

export default Vehicles;
