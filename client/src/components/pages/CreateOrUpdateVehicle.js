import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faPlus,
  faCar,
  faSpinner,
  faExclamationCircle,
  faTimes,
  faSave,
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/Forms.scss';

const API_URL =
  process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const CreateOrUpdateVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(vehicleId);

  const [vehicleData, setVehicleData] = useState({
    name: '',
    hours: '',
    wofRego: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true);
      setError(null);
      const fetchVehicle = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) throw new Error('Authentication required.');

          const res = await axios.get(`${API_URL}/vehicles/${vehicleId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = res.data;
          setVehicleData({
            name: data.name || '',
            hours: data.hours?.toString() || '',
            wofRego: data.wofRego || '',
          });
        } catch (err) {
          console.error('Error fetching vehicle:', err);
          setError(
            err.response?.data?.message || 'Failed to load vehicle data.'
          );
          if (err.response?.status === 401) {
            navigate('/login');
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchVehicle();
    } else {
      setVehicleData({
        name: '',
        hours: '',
        wofRego: '',
      });
    }
  }, [isEditMode, vehicleId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehicleData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!vehicleData.name.trim()) return 'Vehicle Name is required.';
    if (
      vehicleData.hours === '' ||
      isNaN(parseFloat(vehicleData.hours)) ||
      parseFloat(vehicleData.hours) < 0
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
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication required.');

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const dataToSubmit = {
        ...vehicleData,
        hours: parseFloat(vehicleData.hours),
      };

      if (isEditMode) {
        await axios.put(
          `${API_URL}/vehicles/${vehicleId}`,
          dataToSubmit,
          config
        );
      } else {
        await axios.post(`${API_URL}/vehicles`, dataToSubmit, config);
      }

      navigate('/vehicles');
    } catch (err) {
      console.error('Failed to save vehicle:', err);
      setError(
        err.response?.data?.message ||
          `Failed to ${isEditMode ? 'update' : 'create'} vehicle.`
      );
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='vehicles-page'> {/* Use standard page class */}
      <div className='vehicles-header'> {/* Use standard header */}
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faCar} />{' '}
            {isEditMode ? 'Update Vehicle' : 'Create Vehicle'}
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'> Dashboard </Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/vehicles' className='breadcrumb-link'> Vehicles </Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>
              {isEditMode ? 'Update' : 'Create'}
            </span>
          </div>
        </div>
      </div>

      <div className='form-container'>
        <form
          onSubmit={handleSubmit}
          className='employee-form' 
        >
          {error && (
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {error}
            </div>
          )}

          <div className='form-group'>
            <label htmlFor='name'>Name*</label>
            <input
              type='text'
              id='name'
              name='name'
              value={vehicleData.name}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder='Vehicle Name'
            />
          </div>

          <div className='form-group'>
            <label htmlFor='hours'>Hours*</label>
            <input
              type='number'
              id='hours'
              name='hours'
              value={vehicleData.hours}
              onChange={handleChange}
              required
              disabled={isLoading}
              placeholder='Hours'
              min='0'
              step='any'
            />
          </div>

          <div className='form-group'>
            <label htmlFor='wofRego'>WOF/Rego</label>
            <input
              type='text'
              id='wofRego'
              name='wofRego'
              value={vehicleData.wofRego}
              onChange={handleChange}
              disabled={isLoading}
              placeholder='WOF/Rego Details'
            />
          </div>

          <div className='form-footer'> {/* Use standard footer */}
            <button
              type='button'
              className='btn btn-danger' 
              onClick={() => navigate('/vehicles')}
              disabled={isLoading}
            >
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button
              type='submit'
              className='btn btn-success' 
              disabled={isLoading}
            >
              {isLoading ? (
                <> <FontAwesomeIcon icon={faSpinner} spin /> Saving... </>
              ) : (
                <>
                  <FontAwesomeIcon icon={isEditMode ? faEdit : faSave} />
                  {isEditMode ? 'Update Vehicle' : 'Create Vehicle'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrUpdateVehicle;
