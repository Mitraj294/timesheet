import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faClock,
  faIdBadge,
  faEdit,
  faPlus,
  faCalendar,
  faCheck,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/CreateVehicle.scss';

const CreateOrUpdateVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(vehicleId);

  const [vehicleData, setVehicleData] = useState({
    name: '',
    hours: '',
    wofRego: '',
    employeeName: '',
    dateReviewed: '',
    oilChecked: false,
    vehicleChecked: false,
    vehicleBroken: false,
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchVehicle = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`http://localhost:5000/api/vehicles/${vehicleId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = res.data;
          setVehicleData({
            name: data.name || '',
            hours: data.hours || '',
            wofRego: data.wofRego || '',
            employeeName: data.employeeName || '',
            dateReviewed: data.dateReviewed?.split('T')[0] || '',
            oilChecked: data.oilChecked || false,
            vehicleChecked: data.vehicleChecked || false,
            vehicleBroken: data.vehicleBroken || false,
          });
        } catch (err) {
          console.error('Error fetching vehicle:', err);
        }
      };
      fetchVehicle();
    }
  }, [isEditMode, vehicleId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setVehicleData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      if (isEditMode) {
        await axios.put(`http://localhost:5000/api/vehicles/${vehicleId}`, vehicleData, config);
      } else {
        await axios.post('http://localhost:5000/api/vehicles', vehicleData, config);
      }

      navigate('/vehicles');
    } catch (err) {
      console.error('Failed to save vehicle:', err);
      if (err.response?.status === 401) {
        alert('Unauthorized. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  return (
    <div className="create-vehicle-page">
      <div className="header">
        <h4>{isEditMode ? 'Update Vehicle' : 'Create Vehicle'}</h4>
        <div className="breadcrumbs">
          <a href="/employer/dashboard">Dashboard</a> / 
          <a href="/vehicles"> Vehicles</a> / 
          {isEditMode ? ' Update Vehicle' : ' Create Vehicle'}
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="form-group">
            <input
              type="text"
              id="name"
              name="name"
              value={vehicleData.name}
              onChange={handleChange}
              required
              placeholder=" "
            />
            <label htmlFor="name">Name*</label>
            <FontAwesomeIcon icon={faUser} className="form-icon" />
          </div>

          {/* Hours */}
          <div className="form-group">
            <input
              type="number"
              id="hours"
              name="hours"
              value={vehicleData.hours}
              onChange={handleChange}
              required
              placeholder=" "
            />
            <label htmlFor="hours">Hours*</label>
            <FontAwesomeIcon icon={faClock} className="form-icon" />
          </div>

          {/* WOF/Rego */}
          <div className="form-group">
            <input
              type="text"
              id="wofRego"
              name="wofRego"
              value={vehicleData.wofRego}
              onChange={handleChange}
              placeholder=" "
            />
            <label htmlFor="wofRego">WOF/Rego</label>
            <FontAwesomeIcon icon={faIdBadge} className="form-icon" />
          </div>

          {/* Employee Name */}
          <div className="form-group">
            <input
              type="text"
              id="employeeName"
              name="employeeName"
              value={vehicleData.employeeName}
              onChange={handleChange}
              placeholder=" "
            />
            <label htmlFor="employeeName">Employee Name</label>
            <FontAwesomeIcon icon={faUser} className="form-icon" />
          </div>

          {/* Date Reviewed */}
          <div className="form-group">
            <input
              type="date"
              id="dateReviewed"
              name="dateReviewed"
              value={vehicleData.dateReviewed}
              onChange={handleChange}
              placeholder=" "
            />
            <label htmlFor="dateReviewed">Date Reviewed</label>
            <FontAwesomeIcon icon={faCalendar} className="form-icon" />
          </div>

          {/* Oil Checked */}
          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                name="oilChecked"
                checked={vehicleData.oilChecked}
                onChange={handleChange}
              />
              <FontAwesomeIcon icon={faCheck} /> Oil Checked
            </label>
          </div>

          {/* Vehicle Checked */}
          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                name="vehicleChecked"
                checked={vehicleData.vehicleChecked}
                onChange={handleChange}
              />
              <FontAwesomeIcon icon={faCheck} /> Vehicle Checked
            </label>
          </div>

          {/* Vehicle Broken */}
          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                name="vehicleBroken"
                checked={vehicleData.vehicleBroken}
                onChange={handleChange}
              />
              <FontAwesomeIcon icon={faExclamationTriangle} /> Vehicle Broken
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-violet">
              <FontAwesomeIcon icon={isEditMode ? faEdit : faPlus} />
              <span>{isEditMode ? 'Update Vehicle' : 'Create Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrUpdateVehicle;
