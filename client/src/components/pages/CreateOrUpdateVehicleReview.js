import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const CreateOrUpdateVehicleReview = () => {
  const { vehicleId, reviewId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    dateReviewed: '',
    employeeId: '',
    oilChecked: false,
    vehicleChecked: false,
    vehicleBroken: false,
    hours: '',
    notes: '',
  });

  const [employees, setEmployees] = useState([]);
  const [vehicle, setVehicle] = useState(null);

  useEffect(() => {
    // Fetch vehicle details
    axios
      .get(`http://localhost:5000/api/vehicles/${vehicleId}`)
      .then((response) => setVehicle(response.data))
      .catch((error) => console.error('Error fetching vehicle:', error));

    // Fetch employees
    axios
      .get('http://localhost:5000/api/employees', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      .then((response) => setEmployees(response.data))
      .catch((error) => console.error('Error fetching employees:', error));

    // Fetch existing review if editing
// Fetch existing review if editing
if (reviewId) {
  console.log('Fetching review with ID:', reviewId); // Log the review ID
  axios
    .get(`http://localhost:5000/api/vehicles/reviews/${reviewId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
    .then((response) => {
      console.log('Review fetched:', response.data); // Log response
      setFormData(response.data);
    })
    .catch((error) => {
      console.error('Error fetching review:', error);
      alert('Review not found');
    });
}

  }, [vehicleId, reviewId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    // IMPORTANT: Rename "vehicleId" to "vehicle" to match backend expectation
    const payload = {
      ...formData,
      vehicle: vehicleId,
    };

    const request = reviewId
      ? axios.put(`http://localhost:5000/api/vehicles/reviews/${reviewId}`, payload, config)
      : axios.post('http://localhost:5000/api/vehicles/reviews', payload, config);

    request
      .then((response) => {
        console.log('Review submitted successfully:', response.data);
        navigate(`/vehicles/view/${vehicleId}`);
      })
      .catch((error) => {
        console.error('Error submitting review:', error);
        alert('Error submitting review');
      });
  };

  return (
    <div className="main-content authenticated">
      <div className="alert-wrapper"></div>
      <div className="vehicles-page">
        <div className="vehicles-header">
          <h4>{reviewId ? 'Edit' : 'Create'} Vehicle Review</h4>
          <div className="breadcrumbs">
            <a href="/dashboard">Dashboard</a> / <a href="/vehicles">Vehicles</a> /{' '}
            <a href={`/vehicles/view/${vehicleId}`}>View Vehicle</a> /{' '}
            {reviewId ? 'Edit Review' : 'Create Review'}
          </div>
        </div>

        {vehicle && (
          <div className="vehicle-details-header">
            <h5>
              {vehicle.name} - WOF/Reg: {vehicle.wofRego}
            </h5>
          </div>
        )}

        <form className="review-form" onSubmit={handleSubmit}>
          <label>
            Date Reviewed:
            <input
              required
              type="date"
              name="dateReviewed"
              value={formData.dateReviewed?.split('T')[0] || ''}
              onChange={handleChange}
            />
          </label>

          <label>
            Employee:
            <select name="employeeId" required value={formData.employeeId} onChange={handleChange}>
              <option value="">-- Select Employee --</option>
              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Oil Checked:
            <input
              type="checkbox"
              name="oilChecked"
              checked={formData.oilChecked}
              onChange={handleChange}
            />
          </label>

          <label>
            Vehicle Checked:
            <input
              type="checkbox"
              name="vehicleChecked"
              checked={formData.vehicleChecked}
              onChange={handleChange}
            />
          </label>

          <label>
            Vehicle Broken:
            <input
              type="checkbox"
              name="vehicleBroken"
              checked={formData.vehicleBroken}
              onChange={handleChange}
            />
          </label>

          <label>
            Hours:
            <input
              min="0"
              step="0.1"
              type="number"
              name="hours"
              value={formData.hours}
              onChange={handleChange}
            />
          </label>

          <label>
            Notes:
            <textarea name="notes" value={formData.notes} onChange={handleChange}></textarea>
          </label>

          <button type="submit" className="btn btn-purple">
            {reviewId ? 'Update Review' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateOrUpdateVehicleReview;
