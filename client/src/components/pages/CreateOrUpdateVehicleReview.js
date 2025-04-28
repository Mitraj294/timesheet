import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCar,
  faClipboardList,
  faSpinner,
  faExclamationCircle,
  faSave,
  faEdit,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/Forms.scss'; // *** Use Forms.scss ***

const API_URL =
  process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const CreateOrUpdateVehicleReview = () => {
  const { vehicleId, reviewId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(reviewId);

  const [formData, setFormData] = useState({
    dateReviewed: new Date().toISOString().split('T')[0], // Default to today
    employeeId: '',
    oilChecked: false,
    vehicleChecked: false,
    vehicleBroken: false,
    hours: '',
    notes: '',
  });

  const [employees, setEmployees] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required.');
        setIsLoading(false);
        navigate('/login');
        return;
      }
      const config = { headers: { Authorization: `Bearer ${token}` } };

      try {
        const vehiclePromise = axios.get(`${API_URL}/vehicles/${vehicleId}`, config);
        const employeesPromise = axios.get(`${API_URL}/employees`, config);
        const reviewPromise = reviewId
          ? axios.get(`${API_URL}/vehicles/reviews/${reviewId}`, config)
          : Promise.resolve(null);

        const [vehicleRes, employeesRes, reviewRes] = await Promise.all([
          vehiclePromise,
          employeesPromise,
          reviewPromise,
        ]);

        setVehicle(vehicleRes.data);
        setEmployees(employeesRes.data || []);

        if (reviewId && reviewRes?.data) {
          const reviewData = reviewRes.data;
          setFormData({
            dateReviewed: reviewData.dateReviewed?.split('T')[0] || '',
            employeeId: reviewData.employeeId?._id || reviewData.employeeId || '',
            oilChecked: reviewData.oilChecked || false,
            vehicleChecked: reviewData.vehicleChecked || false,
            vehicleBroken: reviewData.vehicleBroken || false,
            hours: reviewData.hours?.toString() || '',
            notes: reviewData.notes || '',
          });
        } else if (!reviewId && vehicleRes.data) {
          setFormData(prev => ({
            ...prev,
            hours: vehicleRes.data.hours?.toString() || '',
          }));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || 'Failed to load required data.');
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [vehicleId, reviewId, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!formData.dateReviewed) return 'Date Reviewed is required.';
    if (!formData.employeeId) return 'Employee is required.';
    if (
      formData.hours === '' ||
      isNaN(parseFloat(formData.hours)) ||
      parseFloat(formData.hours) < 0
    )
      return 'Valid Hours are required.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      setIsLoading(false);
      navigate('/login');
      return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };
    const payload = {
      ...formData,
      vehicle: vehicleId,
      hours: parseFloat(formData.hours),
    };

    try {
      if (reviewId) {
        await axios.put(
          `${API_URL}/vehicles/reviews/${reviewId}`,
          payload,
          config
        );
      } else {
        await axios.post(`${API_URL}/vehicles/reviews`, payload, config);
      }
      navigate(`/vehicles/view/${vehicleId}`);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(
        err.response?.data?.message || 'Failed to submit review.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='vehicles-page'> {/* Use standard page class */}
      <div className='vehicles-header'> {/* Use standard header */}
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faClipboardList} />{' '}
            {isEditMode ? 'Edit Vehicle Review' : 'Create Vehicle Review'}
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'> Dashboard </Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/vehicles' className='breadcrumb-link'> Vehicles </Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to={`/vehicles/view/${vehicleId}`} className='breadcrumb-link'>
              {vehicle?.name ?? 'View Vehicle'}
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>
              {isEditMode ? 'Edit Review' : 'Create Review'}
            </span>
          </div>
        </div>
      </div>

      {isLoading && !vehicle && (
        <div className='loading-indicator'> {/* Use standard loading */}
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className='error-message'> {/* Use standard error */}
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
        </div>
      )}

      {!isLoading && vehicle && (
        <div className='form-container'> {/* Use standard form container */}
          <div className='vehicle-details-header' style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #dee2e6' }}>
            <h5>
              <FontAwesomeIcon icon={faCar} /> {vehicle.name}
              {vehicle.wofRego && ` (WOF/Reg: ${vehicle.wofRego})`}
            </h5>
          </div>

          <form
            onSubmit={handleSubmit}
            className='employee-form' // Use standard form class
            noValidate
          >
            {error && (
              <div className='form-error-message'>
                <FontAwesomeIcon icon={faExclamationCircle} /> {error}
              </div>
            )}

            <div className='form-group'>
              <label htmlFor='dateReviewed'>Date Reviewed*</label>
              <input
                id='dateReviewed'
                required
                type='date'
                name='dateReviewed'
                value={formData.dateReviewed}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className='form-group'>
              <label htmlFor='employeeId'>Employee*</label>
              <select
                id='employeeId'
                name='employeeId'
                required
                value={formData.employeeId}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option value=''>-- Select Employee --</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='form-group'>
              <label htmlFor='hours'>Hours*</label>
              <input
                id='hours'
                min='0'
                step='any'
                type='number'
                name='hours'
                value={formData.hours}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder='Hours'
              />
            </div>

            <div className='form-group checkbox-group'>
              <input
                id='oilChecked'
                type='checkbox'
                name='oilChecked'
                checked={formData.oilChecked}
                onChange={handleChange}
                disabled={isLoading}
              />
              <label htmlFor='oilChecked'>Oil Checked</label>
            </div>

            <div className='form-group checkbox-group'>
              <input
                id='vehicleChecked'
                type='checkbox'
                name='vehicleChecked'
                checked={formData.vehicleChecked}
                onChange={handleChange}
                disabled={isLoading}
              />
              <label htmlFor='vehicleChecked'>Vehicle Checked</label>
            </div>

            <div className='form-group checkbox-group'>
              <input
                id='vehicleBroken'
                type='checkbox'
                name='vehicleBroken'
                checked={formData.vehicleBroken}
                onChange={handleChange}
                disabled={isLoading}
              />
              <label htmlFor='vehicleBroken'>Vehicle Broken/Issues?</label>
            </div>

            <div className='form-group'>
              <label htmlFor='notes'>Notes</label>
              <textarea
                id='notes'
                name='notes'
                value={formData.notes}
                onChange={handleChange}
                rows='4'
                disabled={isLoading}
                placeholder='Add any relevant notes about the vehicle check...'
              ></textarea>
            </div>

            <div className='form-footer'> {/* Use standard footer */}
              <button
                type='button'
                className='btn btn-danger' // Standard button class
                onClick={() => navigate(`/vehicles/view/${vehicleId}`)}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button
                type='submit'
                className='btn btn-success' // Standard button class
                disabled={isLoading}
              >
                {isLoading ? (
                  <> <FontAwesomeIcon icon={faSpinner} spin /> Saving... </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={isEditMode ? faEdit : faSave} />
                    {isEditMode ? 'Update Review' : 'Submit Review'}
                  </>
                )}
              </button>
            </div>
          </form>//
        </div>
      )}
    </div>
  );
};

export default CreateOrUpdateVehicleReview;
