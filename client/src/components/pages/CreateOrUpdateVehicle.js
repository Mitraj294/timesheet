import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../../styles/CreateVehicle.scss';


const CreateOrUpdateVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(vehicleId);

  const [vehicleData, setVehicleData] = useState({
    name: '',
    hours: '',
    wofRego: '',
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchVehicle = async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/vehicles/${vehicleId}`);
          setVehicleData({
            name: res.data.name || '',
            hours: res.data.hours || '',
            wofRego: res.data.wofRego || '',
          });
        } catch (err) {
          console.error('Error fetching vehicle:', err);
        }
      };
      fetchVehicle();
    }
  }, [isEditMode, vehicleId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehicleData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await axios.put(`http://localhost:5000/api/vehicles/${vehicleId}`, vehicleData);
      } else {
        await axios.post('http://localhost:5000/api/vehicles', vehicleData);
      }
      navigate('/employer/vehicles');
    } catch (err) {
      console.error('Failed to save vehicle:', err);
    }
  };

  return (
    <div className="create-vehicle-page">
      <div className="header">
        <h4>{isEditMode ? 'Update Vehicle' : 'Create Vehicle'}</h4>
        <div className="breadcrumbs">
          <a href="/employer/dashboard">Dashboard</a> / <a href="/employer/vehicles">Vehicles</a> / {isEditMode ? 'Update Vehicle' : 'Create Vehicle'}
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              id="name"
              name="name"
              value={vehicleData.name}
              onChange={handleChange}
              required
            />
            <label htmlFor="name">Name*</label>
            <i className="material-icons">person</i>
          </div>

          <div className="form-group">
            <input
              type="text"
              id="hours"
              name="hours"
              value={vehicleData.hours}
              onChange={handleChange}
              required
            />
            <label htmlFor="hours">Hours*</label>
            <i className="material-icons">schedule</i>
          </div>

          <div className="form-group">
            <input
              type="text"
              id="wofRego"
              name="wofRego"
              value={vehicleData.wofRego}
              onChange={handleChange}
            />
            <label htmlFor="wofRego">WOF/Rego</label>
            <i className="material-icons">badge</i>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-violet">
              <i className="material-icons">{isEditMode ? 'edit' : 'add'}</i>
              <span>{isEditMode ? 'Update Vehicle' : 'Create Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrUpdateVehicle;
