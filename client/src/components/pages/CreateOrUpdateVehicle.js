import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
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

import {
  fetchVehicleById,
  createVehicle,
  updateVehicle,
  selectVehicleByIdState,
  selectCurrentVehicleStatus,
  selectCurrentVehicleError,
  selectVehicleOperationStatus,
  selectVehicleOperationError,
  resetCurrentVehicle,
  clearOperationStatus,
} from '../../redux/slices/vehicleSlice';
import { setAlert } from '../../redux/slices/alertSlice'; // Import setAlert
import Alert from '../layout/Alert'; // Import Alert component


import '../../styles/Forms.scss';

const CreateOrUpdateVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(vehicleId);

  const [vehicleData, setVehicleData] = useState({
    name: '',
    hours: '',
    wofRego: '',
  });
  const [formError, setFormError] = useState(null);

  const dispatch = useDispatch();

  const currentVehicle = useSelector(selectVehicleByIdState);
  const fetchStatus = useSelector(selectCurrentVehicleStatus);
  const fetchError = useSelector(selectCurrentVehicleError);
  const operationStatus = useSelector(selectVehicleOperationStatus);
  const operationError = useSelector(selectVehicleOperationError);

  // Effect to show alerts for fetch or save errors from Redux state
  useEffect(() => {
    const reduxError = fetchError || operationError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
      // Optionally clear the Redux error after showing the alert
      // dispatch(clearOperationStatus()); // Or specific error clear actions
    }
  }, [fetchError, operationError, dispatch]);

  useEffect(() => {
    dispatch(clearOperationStatus());

    if (isEditMode) {
      if (fetchStatus === 'idle' || currentVehicle?._id !== vehicleId) {
         dispatch(fetchVehicleById(vehicleId));
      }
    } else {
      // Reset form and current vehicle state for create mode
      setVehicleData({
        name: '',
        hours: '',
        wofRego: '',
      });
      dispatch(resetCurrentVehicle());
    }

    return () => {
      dispatch(resetCurrentVehicle());
      dispatch(clearOperationStatus());
    };
  }, [isEditMode, vehicleId, dispatch, fetchStatus, currentVehicle?._id]); // Added fetchStatus and currentVehicle?._id

  useEffect(() => {
    if (isEditMode && fetchStatus === 'succeeded' && currentVehicle?._id === vehicleId) {
      setVehicleData({
        name: currentVehicle.name || '',
        hours: currentVehicle.hours?.toString() || '',
        wofRego: currentVehicle.wofRego || '',
      });
    }
  }, [fetchStatus, currentVehicle, isEditMode, vehicleId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehicleData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError(null);
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
    setFormError(null);
    dispatch(clearOperationStatus());

    const validationError = validateForm();
    if (validationError) {
      dispatch(setAlert(validationError, 'warning')); // Show validation error via Alert
      setFormError(validationError);
      return;
    }

    try {
      const dataToSubmit = {
        ...vehicleData,
        hours: parseFloat(vehicleData.hours),
      };

      if (isEditMode) {
        await dispatch(updateVehicle({ vehicleId, vehicleData: dataToSubmit })).unwrap();
        dispatch(setAlert('Vehicle updated successfully!', 'success'));
      } else {
        await dispatch(createVehicle(dataToSubmit)).unwrap();
        dispatch(setAlert('Vehicle created successfully!', 'success'));
      }

      navigate('/vehicles');
    } catch (err) {
      console.error('Failed to save vehicle:', err);
      // Error is now handled by Redux state (operationError) and displayed by useEffect
      // If the thunk doesn't dispatch setAlert on error, uncomment the line below
      dispatch(setAlert(err?.message || `Failed to ${isEditMode ? 'update' : 'create'} vehicle.`, 'danger'));
      if (err?.message?.includes('401') || err?.message?.includes('403')) {
        navigate('/login');
      }
    }
  };

  return (
    <div className='vehicles-page'>
      <Alert /> {/* Render Alert component here */}
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

      {isEditMode && fetchStatus === 'loading' && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" /> <p>Loading vehicle data...</p>
        </div>
      )}

      <div className='form-container'> {/* Ensure this div is closed */}
        <form
          onSubmit={handleSubmit}
          className='employee-form'
        >
          {/* {(formError || fetchError || operationError) && ( // Handled by Alert component
            <div className='form-error-message'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {formError || fetchError || operationError}
            </div>
          )} */}
          

          <div className='form-group'>
            <label htmlFor='name'>Name*</label>
            <input
              type='text'
              id='name'
              name='name'
              value={vehicleData.name}
              onChange={handleChange}
              required
              disabled={operationStatus === 'loading' || fetchStatus === 'loading'}
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
              disabled={operationStatus === 'loading' || fetchStatus === 'loading'}
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
              disabled={operationStatus === 'loading' || fetchStatus === 'loading'}
              placeholder='WOF/Rego Details'
            />
          </div>

          <div className='form-footer'>
            <button
              type='button'
              className='btn btn-danger'
              onClick={() => navigate('/vehicles')}
              disabled={operationStatus === 'loading'}
            >
              <FontAwesomeIcon icon={faTimes} /> Cancel
            </button>
            <button
              type='submit'
              className='btn btn-success' // Standard button class
              disabled={operationStatus === 'loading' || fetchStatus === 'loading'} // Disable during fetch or operation
            >
              {operationStatus === 'loading' ? ( // Check Redux operationStatus instead of isLoading
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
      </div> {/* Closes form-container div */}
    </div>
  );
};

export default CreateOrUpdateVehicle;
