import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
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

import {
  fetchVehicleById,
  selectVehicleByIdState,
  selectCurrentVehicleStatus as selectVehicleFetchStatus,
  selectCurrentVehicleError as selectVehicleFetchError,
  resetCurrentVehicle,
} from '../../redux/slices/vehicleSlice';
import {
  fetchReviewById,
  createVehicleReview,
  updateVehicleReview,
  selectCurrentReviewData,
  selectCurrentReviewStatus as selectReviewFetchStatus,
  selectCurrentReviewError as selectReviewFetchError,
  selectReviewOperationStatus,
  selectReviewOperationError,
  resetCurrentReview as resetCurrentReviewState,
  clearReviewOperationStatus,
} from '../../redux/slices/vehicleReviewSlice';
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from '../../redux/slices/employeeSlice';
import { setAlert } from '../../redux/slices/alertSlice'; // Import setAlert
import Alert from '../layout/Alert'; // Import Alert component

import '../../styles/Forms.scss';

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

  const [formError, setFormError] = useState(null);

  const dispatch = useDispatch();

  // Select state from Redux
  const vehicle = useSelector(selectVehicleByIdState);
  const vehicleFetchStatus = useSelector(selectVehicleFetchStatus);
  const vehicleFetchError = useSelector(selectVehicleFetchError);

  const employees = useSelector(selectAllEmployees);
  const employeeFetchStatus = useSelector(selectEmployeeStatus);
  const employeeFetchError = useSelector(selectEmployeeError);

  const currentReview = useSelector(selectCurrentReviewData);
  const reviewFetchStatus = useSelector(selectReviewFetchStatus);
  const reviewFetchError = useSelector(selectReviewFetchError);

  const operationStatus = useSelector(selectReviewOperationStatus);
  const operationError = useSelector(selectReviewOperationError);

  const isFetching = vehicleFetchStatus === 'loading' || employeeFetchStatus === 'loading' || (isEditMode && reviewFetchStatus === 'loading');
  const fetchError = vehicleFetchError || employeeFetchError || (isEditMode && reviewFetchError);

  // Effect to show alerts for fetch or save errors from Redux state
  useEffect(() => {
    const reduxError = fetchError || operationError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
      // Optionally clear the Redux error after showing the alert
      // dispatch(clearReviewOperationStatus()); // Or specific error clear actions
    }
  }, [fetchError, operationError, dispatch]);

  useEffect(() => {
    dispatch(fetchVehicleById(vehicleId));
    dispatch(fetchEmployees());
    if (isEditMode && reviewId) {
      dispatch(fetchReviewById(reviewId));
    } else if (!isEditMode) { // Reset form for create mode
      // Reset form for create mode
      setFormData({
        dateReviewed: new Date().toISOString().split('T')[0],
        employeeId: '',
        oilChecked: false,
        vehicleChecked: false,
        vehicleBroken: false,
        hours: vehicle?.hours?.toString() || '',
        notes: '',
      });
      dispatch(resetCurrentReviewState());
    } // End of else if block
    return () => {
      dispatch(resetCurrentVehicle());
      dispatch(resetCurrentReviewState());
      dispatch(clearReviewOperationStatus());
    };
  }, [vehicleId, reviewId, isEditMode, dispatch, vehicle?.hours]); // Added vehicle?.hours dependency

  useEffect(() => {
    if (isEditMode && reviewFetchStatus === 'succeeded' && currentReview?._id === reviewId) {
      setFormData({
        dateReviewed: currentReview.dateReviewed?.split('T')[0] || '',
        employeeId: currentReview.employeeId?._id || currentReview.employeeId || '',
        oilChecked: currentReview.oilChecked || false,
        vehicleChecked: currentReview.vehicleChecked || false,
        vehicleBroken: currentReview.vehicleBroken || false,
        hours: currentReview.hours?.toString() || '',
        notes: currentReview.notes || '',
      });
    }
  }, [isEditMode, reviewFetchStatus, currentReview, reviewId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formError) setFormError(null);
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
    setFormError(null); // Clear local validation error
    dispatch(clearReviewOperationStatus());

    const validationError = validateForm();
    if (validationError) {
      dispatch(setAlert(validationError, 'warning')); // Show validation error via Alert
      setFormError(validationError);
      return;
    }

    const payload = {
      ...formData,
      vehicle: vehicleId,
      hours: parseFloat(formData.hours),
    };

    try {
      if (reviewId) {
        await dispatch(updateVehicleReview({ reviewId, reviewData: payload })).unwrap();
        dispatch(setAlert('Review updated successfully!', 'success'));
      } else {
        await dispatch(createVehicleReview(payload)).unwrap();
        dispatch(setAlert('Review created successfully!', 'success'));
      }
      navigate(`/vehicles/view/${vehicleId}`);
    } catch (err) {
      console.error('Error submitting review:', err);
      // Error state is managed by Redux (operationError) and displayed by useEffect
      // If the thunk doesn't dispatch setAlert on error, uncomment the line below
      dispatch(setAlert(err?.message || 'Failed to save review.', 'danger'));
    }
  };

  return (
    <div className='vehicles-page'>
      <Alert /> {/* Render Alert component here */}
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

      {isFetching && !vehicle && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading...</p>
        </div>
      )}

      {/* {(fetchError || formError || operationError) && !isFetching && ( // Handled by Alert component
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
        </div>
      )} */}
      
      {!isFetching && vehicle && ( // <-- Replace isLoading with isFetching here
        <div className='form-container'>
          <div className='vehicle-details-header' style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #dee2e6' }}>
            <h5>
              <FontAwesomeIcon icon={faCar} /> {vehicle.name}
              {vehicle.wofRego && ` (WOF/Reg: ${vehicle.wofRego})`}
            </h5>
          </div>

          <form
            onSubmit={handleSubmit}
            className='employee-form'
            noValidate
          >
            {/* {(formError || operationError) && ( // Handled by Alert component
              <div className='form-error-message'>
                <FontAwesomeIcon icon={faExclamationCircle} /> {error}
              </div>
            )} */}
            

            <div className='form-group'>
              <label htmlFor='dateReviewed'>Date Reviewed*</label>
              <input
                id='dateReviewed'
                required
                type='date'
                name='dateReviewed'
                value={formData.dateReviewed}
                onChange={handleChange}
                disabled={isFetching || operationStatus === 'loading'}
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
                disabled={isFetching || operationStatus === 'loading'}
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
                disabled={isFetching || operationStatus === 'loading'}
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
                disabled={isFetching || operationStatus === 'loading'}
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
                disabled={isFetching || operationStatus === 'loading'}
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
                disabled={isFetching || operationStatus === 'loading'}
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
                disabled={isFetching || operationStatus === 'loading'}
                placeholder='Add any relevant notes about the vehicle check...'
              ></textarea>
            </div>

            <div className='form-footer'>
              <button
                type='button'
                className='btn btn-danger'
                onClick={() => navigate(`/vehicles/view/${vehicleId}`)}
                disabled={operationStatus === 'loading'}
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button
                type='submit'
                className='btn btn-success' // Standard button class
                disabled={isFetching || operationStatus === 'loading'} // Disable during fetch or operation
              >
                {operationStatus === 'loading' ? ( // Use operationStatus for saving state
                  <> <FontAwesomeIcon icon={faSpinner} spin /> Saving... </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={isEditMode ? faEdit : faSave} />
                    {isEditMode ? 'Update Review' : 'Submit Review'}
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

export default CreateOrUpdateVehicleReview;
