import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VehicleReview = () => {
  const location = useLocation();
  const navigate = useNavigate();

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

  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/employees', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEmployees(res.data);
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };

    fetchEmployees();

    // Prefill only name, hours, and wofRego from passed vehicleData via location.state
    const incoming = location.state?.vehicleData;
    if (incoming) {
      console.log('Received vehicleData:', incoming); // DEBUG
      setVehicleData((prev) => ({
        ...prev,
        name: incoming.name || '',
        hours: incoming.hours || '',
        wofRego: incoming.wofRego || '',
      }));
    } else {
      console.warn('No vehicleData found in location.state');
    }
  }, [location.state]);

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
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Always POST a new review
      await axios.post('http://localhost:5000/api/vehicles', vehicleData, config);

      navigate('/vehicles');
    } catch (err) {
      console.error('Failed to save vehicle review:', err);
    }
  };

  return (
    <div className='create-vehicle-page'>
      <div className='header'>
        <h4>Submit New Vehicle Review</h4>
      </div>
      <div className='card'>
        <form onSubmit={handleSubmit}>
          {/* Prefilled fields */}
          <div className='form-group'>
            <input type='text' name='name' value={vehicleData.name} readOnly />
            <label htmlFor='name'>Name</label>
          </div>
          <div className='form-group'>
            <input type='number' name='hours' value={vehicleData.hours} readOnly />
            <label htmlFor='hours'>Hours</label>
          </div>
          <div className='form-group'>
            <input type='text' name='wofRego' value={vehicleData.wofRego} readOnly />
            <label htmlFor='wofRego'>WOF/Rego</label>
          </div>

          {/* New review fields */}
          <div className='form-group'>
            <select name='employeeName' value={vehicleData.employeeName} onChange={handleChange} required>
              <option value='' disabled>Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp.name}>{emp.name}</option>
              ))}
            </select>
            <label htmlFor='employeeName'>Employee Name</label>
          </div>
          <div className='form-group'>
            <input type='date' name='dateReviewed' value={vehicleData.dateReviewed} onChange={handleChange} required />
            <label htmlFor='dateReviewed'>Date Reviewed</label>
          </div>

          <div className='form-checkbox'>
            <label>
              <input type='checkbox' name='oilChecked' checked={vehicleData.oilChecked} onChange={handleChange} />
              Oil Checked
            </label>
          </div>
          <div className='form-checkbox'>
            <label>
              <input type='checkbox' name='vehicleChecked' checked={vehicleData.vehicleChecked} onChange={handleChange} />
              Vehicle Checked
            </label>
          </div>
          <div className='form-checkbox'>
            <label>
              <input type='checkbox' name='vehicleBroken' checked={vehicleData.vehicleBroken} onChange={handleChange} />
              Vehicle Broken
            </label>
          </div>

          <div className='form-actions'>
            <button type='submit' className='btn btn-violet'>
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleReview;
