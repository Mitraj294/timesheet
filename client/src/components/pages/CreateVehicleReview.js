import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../../styles/Vehicles.scss';

const CreateVehicleReview = () => {
  const { vehicleId, reviewId } = useParams(); // reviewId will be available when editing
  const navigate = useNavigate();

  const [form, setForm] = useState({
    oilChecked: false,
    vehicleChecked: false,
    vehicleBroken: false,
    hours: '',
    notes: '',
    dateReviewed: new Date().toISOString().split('T')[0],
    employeeId: '', 
  });

  const [employees, setEmployees] = useState([]);
  const [vehicle, setVehicle] = useState({ name: '', wofReg: '' });  // New state for vehicle details
  const [loading, setLoading] = useState(true);  // For loading state

  // Fetch employee list
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/employees', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setEmployees(res.data || []);
      } catch (err) {
        console.error('Failed to load employees:', err);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch vehicle data by vehicleId
// Fetch vehicle data by vehicleId
useEffect(() => {
    const fetchVehicleData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/vehicles/${vehicleId}`, {

          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        console.log("Fetched Vehicle Data:", res.data);  // Debugging
  
        setVehicle({
          name: res.data.name,
          wofReg: res.data.wofReg,  // Assuming wofReg is part of the vehicle data
        });
      } catch (err) {
        console.error('Failed to load vehicle data:', err);
        alert('Failed to load vehicle data.');
      }
    };
  
    fetchVehicleData();
  }, [vehicleId]);  // Re-fetch data when vehicleId changes
  
  

  // Fetch review data when editing
// Fetch review data when editing
useEffect(() => {
    const fetchReviewData = async () => {
      if (reviewId) {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`http://localhost:5000/api/vehicles/reviews/${vehicleId}`, {

            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
  
          console.log("Fetched Review Data:", res.data);  // Debugging the review data
  
          setForm({
            oilChecked: res.data.oilChecked,
            vehicleChecked: res.data.vehicleChecked,
            vehicleBroken: res.data.vehicleBroken,
            hours: res.data.hours || '',
            notes: res.data.notes || '',
            dateReviewed: res.data.dateReviewed || new Date().toISOString().split('T')[0],
            employeeId: res.data.employeeId._id || '',
          });
        } catch (err) {
          console.error('Failed to load review:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);  // In case it's a create operation
      }
    };
  
    fetchReviewData();
  }, [reviewId]);  // Trigger when reviewId changes for edit mode
  

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prevForm) => ({
      ...prevForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
  
    try {
      const payload = {
        vehicle: vehicleId,
        oilChecked: form.oilChecked,
        vehicleChecked: form.vehicleChecked,
        vehicleBroken: form.vehicleBroken,
        notes: form.notes.trim(),
        dateReviewed: form.dateReviewed,
        employeeId: form.employeeId,  // Send employeeId here
      };
  
      if (form.hours !== '') {
        payload.hours = Number(form.hours);
      }
  
      if (reviewId) {
        // Update review if reviewId exists (edit mode)
        await axios.put(`http://localhost:5000/api/vehicle/reviews/${reviewId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new review (create mode)
        await axios.post('http://localhost:5000/api/vehicle/reviews', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
  
      navigate(`/vehicles/view/${vehicleId}`);
    } catch (err) {
      console.error('Error creating/updating review:', err.response?.data || err.message);
      alert('Failed to submit review. Please try again.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;  // Show loading indicator while fetching data
  }

  return (
    <div className="vehicles-page">
      <div className="vehicles-header">
        <h4>{reviewId ? 'Edit Vehicle Review' : 'Create Vehicle Review'}</h4>
        <div className="breadcrumbs">
          <Link to="/dashboard">Dashboard</Link> /
          <Link to="/vehicles"> Vehicles</Link> /
          <Link to={`/vehicles/view/${vehicleId}`}>View Vehicle</Link> /
          {reviewId ? 'Edit Review' : 'Create Review'}
        </div>
      </div>

      <div className="vehicle-details-header">
        <h5>{vehicle.name} - WOF/Reg: {vehicle.wofReg}</h5>
      </div>

      <form className="review-form" onSubmit={handleSubmit}>
        <label>
          Date Reviewed:
          <input
            type="date"
            name="dateReviewed"
            value={form.dateReviewed}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Employee:
          <select
            name="employeeId"
            value={form.employeeId}  // Using employeeId instead of employeeName
            onChange={handleChange}
            required
          >
            <option value="">-- Select Employee --</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Oil Checked:
          <input
            type="checkbox"
            name="oilChecked"
            checked={form.oilChecked}
            onChange={handleChange}
          />
        </label>

        <label>
          Vehicle Checked:
          <input
            type="checkbox"
            name="vehicleChecked"
            checked={form.vehicleChecked}
            onChange={handleChange}
          />
        </label>

        <label>
          Vehicle Broken:
          <input
            type="checkbox"
            name="vehicleBroken"
            checked={form.vehicleBroken}
            onChange={handleChange}
          />
        </label>

        <label>
          Hours:
          <input
            type="number"
            name="hours"
            value={form.hours}
            min="0"
            step="0.1"
            onChange={handleChange}
          />
        </label>

        <label>
          Notes:
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
          ></textarea>
        </label>

        <button type="submit" className="btn btn-purple">
          {reviewId ? 'Update Review' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
};

export default CreateVehicleReview;
