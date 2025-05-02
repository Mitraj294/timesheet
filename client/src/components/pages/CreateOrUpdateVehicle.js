import React, { useEffect, useState, useMemo } from 'react';
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
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';

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
  const [formError, setFormError] = useState(null); // Local validation error

  const dispatch = useDispatch();

  const currentVehicle = useSelector(selectVehicleByIdState);
  const fetchStatus = useSelector(selectCurrentVehicleStatus);
  const fetchError = useSelector(selectCurrentVehicleError);
  const operationStatus = useSelector(selectVehicleOperationStatus);
  const operationError = useSelector(selectVehicleOperationError);

  const isLoading = useMemo(() =>
    fetchStatus === 'loading' || operationStatus === 'loading',
    [fetchStatus, operationStatus]
  );

  // Effect to show alerts for fetch or save errors from Redux state
  useEffect(() => {
    const reduxError = fetchError || operationError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, operationError, dispatch]);

  // Effect to fetch data on edit mode or reset form on create mode
  useEffect(() => {
    dispatch(clearOperationStatus()); // Clear any previous operation status

    if (isEditMode && vehicleId) {
      // Fetch only if status is idle OR if the loaded vehicle ID doesn't match the URL ID
      if (fetchStatus === 'idle' || (currentVehicle?._id !== vehicleId && fetchStatus !== 'loading')) {
         dispatch(fetchVehicleById(vehicleId));
      }
    } else {
      // Reset form and current vehicle state for create mode
      setVehicleData({ name: '', hours: '', wofRego: '' });
      dispatch(resetCurrentVehicle());
    }

    // Cleanup on unmount or if switching between create/edit
    return () => {
      dispatch(resetCurrentVehicle());
      dispatch(clearOperationStatus());
    };
    // Dependencies: Only re-run if mode changes or ID changes
  }, [isEditMode, vehicleId, dispatch]);

  // Effect to populate form *after* data is successfully fetched for edit mode
  useEffect(() => {
    // Only populate if editing, fetch succeeded, and the correct vehicle is loaded
    if (isEditMode && fetchStatus === 'succeeded' && currentVehicle?._id === vehicleId) {
      const newVehicleData = {
        name: currentVehicle.name || '',
        hours: currentVehicle.hours?.toString() || '',
        wofRego: currentVehicle.wofRego || '',
      };

      // Update local state only if necessary to prevent potential loops
      setVehicleData(prevData => {
        if (prevData.name !== newVehicleData.name ||
            prevData.hours !== newVehicleData.hours ||
            prevData.wofRego !== newVehicleData.wofRego) {
          return newVehicleData;
        }
        return prevData;
      });
    }
    // Dependencies: Re-run only when fetch status or the loaded vehicle changes
  }, [fetchStatus, currentVehicle, isEditMode, vehicleId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehicleData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError(null); // Clear local validation error on change
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
      dispatch(setAlert(validationError, 'warning'));
      setFormError(validationError);
      return;
    }

    try {
      // Convert hours back to number for submission
      const dataToSubmit = {
        ...vehicleData,
        hours: vehicleData.hours, // Keep as string if model expects string
        // hours: parseFloat(vehicleData.hours), // Use this if model expects number
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
      // Error alert is handled by the useEffect watching operationError
      // Optionally, re-dispatch alert here if needed for immediate feedback on submit button
      dispatch(setAlert(err?.message || `Failed to ${isEditMode ? 'update' : 'create'} vehicle.`, 'danger'));
      if (err?.message?.includes('401') || err?.message?.includes('403')) {
        navigate('/login'); // Redirect on auth errors
      }
    }
  };

  return (
    <div className='vehicles-page'>
      <Alert />
      <div className='vehicles-header'>
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

      {/* Show loading indicator specifically when fetching for edit mode */}
      {isEditMode && fetchStatus === 'loading' && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" /> <p>Loading vehicle data...</p>
        </div>
      )}

      {/* Show form only when not initially loading in edit mode, or always in create mode */}
      {(!isEditMode || fetchStatus !== 'loading') && (
        <div className='form-container'>
          <form
            onSubmit={handleSubmit}
            className='employee-form'
            noValidate
          >
            {/* Local validation errors */}
            {formError && (
              <div className='form-error-message'>
                <FontAwesomeIcon icon={faExclamationCircle} /> {formError}
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
                disabled={isLoading} // Disable if fetching OR saving
                placeholder='Vehicle Name'
              />
            </div>

            <div className='form-group'>
              <label htmlFor='hours'>Hours*</label>
              <input
                type='number' // Use number for better input control, but handle as string in state/submit if needed
                id='hours'
                name='hours'
                value={vehicleData.hours}
                onChange={handleChange}
                required
                disabled={isLoading}
                placeholder='Hours'
                min='0'
                step='any' // Allow decimals if needed
              />
            </div>

            <div className='form-group'>
              <label htmlFor='wofRego'>WOF/Rego</label>
              <input
                type='text' // Changed to text, assuming it's details not just a date
                id='wofRego'
                name='wofRego'
                value={vehicleData.wofRego}
                onChange={handleChange}
                disabled={isLoading}
                placeholder='WOF/Rego Details or Due Date'
              />
            </div>

            <div className='form-footer'>
              <button
                type='button'
                className='btn btn-danger'
                onClick={() => navigate('/vehicles')}
                disabled={isLoading} // Disable if fetching OR saving
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button
                type='submit'
                className='btn btn-success'
                disabled={isLoading} // Disable if fetching OR saving
              >
                {operationStatus === 'loading' ? ( // Spinner only during save operation
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
      )}
    </div>
  );
};

export default CreateOrUpdateVehicle;
