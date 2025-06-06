import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit, faPlus, faCar, faSpinner, faExclamationCircle, faTimes, faSave,
} from '@fortawesome/free-solid-svg-icons';
import {
  fetchVehicleById, createVehicle, updateVehicle,
  selectVehicleByIdState, selectCurrentVehicleStatus, selectCurrentVehicleError,
  selectVehicleOperationStatus, selectVehicleOperationError,
  resetCurrentVehicle, clearOperationStatus,
} from '../../redux/slices/vehicleSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/Forms.scss';

const CreateOrUpdateVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(vehicleId);

  // Local state for form fields
  const [vehicleData, setVehicleData] = useState({
    name: '',
    hours: '',
    wofRego: '',
  });
  const [formError, setFormError] = useState(null);

  const dispatch = useDispatch();

  // Redux selectors
  const currentVehicle = useSelector(selectVehicleByIdState);
  const fetchStatus = useSelector(selectCurrentVehicleStatus);
  const fetchError = useSelector(selectCurrentVehicleError);
  const operationStatus = useSelector(selectVehicleOperationStatus);
  const operationError = useSelector(selectVehicleOperationError);

  // Loading if fetching or saving
  const isLoading = useMemo(() =>
    fetchStatus === 'loading' || operationStatus === 'loading',
    [fetchStatus, operationStatus]
  );

  // Show Redux errors as alerts
  useEffect(() => {
    const reduxError = fetchError || operationError;
    if (reduxError) {
      console.error("[CreateOrUpdateVehicle] Redux error:", reduxError);
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, operationError, dispatch]);

  // Fetch or reset vehicle data on mount/change
  useEffect(() => {
    console.log("[CreateOrUpdateVehicle] useEffect: isEditMode =", isEditMode, "vehicleId =", vehicleId, "fetchStatus =", fetchStatus);
    dispatch(clearOperationStatus());
    if (isEditMode && vehicleId) {
      if (fetchStatus === 'idle' || (currentVehicle?._id !== vehicleId && fetchStatus !== 'loading')) {
        console.log("[CreateOrUpdateVehicle] Fetching vehicle by id:", vehicleId);
        dispatch(fetchVehicleById(vehicleId));
      }
    } else {
      setVehicleData({ name: '', hours: '', wofRego: '' });
      dispatch(resetCurrentVehicle());
      console.log("[CreateOrUpdateVehicle] Creating new vehicle, reset form.");
    }
    return () => {
      dispatch(resetCurrentVehicle());
      dispatch(clearOperationStatus());
      console.log("[CreateOrUpdateVehicle] Cleanup: reset current vehicle and operation status.");
    };
  }, [isEditMode, vehicleId, dispatch]);

  // Populate form when editing and data is loaded
  useEffect(() => {
    if (isEditMode && fetchStatus === 'succeeded' && currentVehicle?._id === vehicleId) {
      setVehicleData({
        name: currentVehicle.name || '',
        hours: currentVehicle.hours?.toString() || '',
        wofRego: currentVehicle.wofRego || '',
      });
      console.log("[CreateOrUpdateVehicle] Populated form for editing vehicle:", currentVehicle);
    }
  }, [fetchStatus, currentVehicle, isEditMode, vehicleId]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setVehicleData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError(null);
    console.log(`[CreateOrUpdateVehicle] Input changed: ${name} =`, value);
  };

  // Simple validation
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

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    dispatch(clearOperationStatus());
    const validationError = validateForm();
    if (validationError) {
      dispatch(setAlert(validationError, 'warning'));
      setFormError(validationError);
      console.warn("[CreateOrUpdateVehicle] Validation error:", validationError);
      return;
    }
    try {
      const dataToSubmit = {
        ...vehicleData,
        hours: vehicleData.hours,
      };
      if (isEditMode) {
        console.log("[CreateOrUpdateVehicle] Updating vehicle:", vehicleId, dataToSubmit);
        await dispatch(updateVehicle({ vehicleId, vehicleData: dataToSubmit })).unwrap();
        dispatch(setAlert('Vehicle updated successfully!', 'success'));
      } else {
        console.log("[CreateOrUpdateVehicle] Creating vehicle:", dataToSubmit);
        await dispatch(createVehicle(dataToSubmit)).unwrap();
        dispatch(setAlert('Vehicle created successfully!', 'success'));
      }
      navigate('/vehicles');
    } catch (err) {
      dispatch(setAlert(err?.message || `Failed to ${isEditMode ? 'update' : 'create'} vehicle.`, 'danger'));
      console.error("[CreateOrUpdateVehicle] Submit error:", err);
      if (err?.message?.includes('401') || err?.message?.includes('403')) {
        navigate('/login');
      }
    }
  };

  // Render
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
      {/* Show loading spinner if fetching for edit */}
      {isEditMode && fetchStatus === 'loading' && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size="2x" /> <p>Loading vehicle data...</p>
        </div>
      )}
      {/* Show form when ready */}
      {(!isEditMode || fetchStatus !== 'loading') && (
        <div className='form-container'>
          <form
            onSubmit={handleSubmit}
            className='employee-form'
            noValidate
          >
            {/* Show local validation error */}
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
                placeholder='WOF/Rego Details or Due Date'
              />
            </div>
            <div className='form-footer'>
              <button
                type='button'
                className='btn btn-danger'
                onClick={() => {
                  console.log("[CreateOrUpdateVehicle] Cancel button clicked, navigating to /vehicles");
                  navigate('/vehicles');
                }}
                disabled={isLoading}
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button
                type='submit'
                className='btn btn-green'
                disabled={isLoading}
              >
                {operationStatus === 'loading' ? (
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
