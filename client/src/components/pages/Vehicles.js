import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../../styles/Vehicles.scss';


const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/vehicles');
        setVehicles(res.data);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
      }
    };
    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter(v =>
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
          <i className="material-icons">add</i> Create Vehicle
        </Link>
        <button className="btn btn-purple">
          <i className="material-icons">send</i> Send Report
        </button>
        <button className="btn btn-red">
          <i className="material-icons">download</i> Download Report
        </button>
      </div>

      <div className="vehicles-search">
        <input
          type="text"
          placeholder="Search for a Vehicle"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <i className="material-icons search-icon">search</i>
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
              <Link to={`/employer/vehicles/view/${vehicle._id}`} className="btn-icon">
                <i className="material-icons">visibility</i>
              </Link>
              <Link to={`/employer/vehicles/update/${vehicle._id}`} className="btn-icon">
                <i className="material-icons">edit</i>
              </Link>
              <button className="btn-icon btn-danger">
                <i className="material-icons">highlight_off</i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Vehicles;