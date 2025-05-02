import React, { useState, useEffect, useMemo } from 'react';
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
  resetCurrentVehicle, // Keep reset for cleanup if needed elsewhere, but be careful in useEffect cleanup
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
  resetCurrentReview as resetCurrentReviewState, // Keep reset for cleanup
  clearReviewOperationStatus,
} from '../../redux/slices/vehicleReviewSlice';
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError } from '../../redux/slices/employeeSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';

import '../../styles/Forms.scss';

const CreateOrUpdateVehicleReview = () => {
  const { vehicleId, reviewId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(reviewId);

  const [formData, setFormData] = useState({
    dateReviewed: new Date().toISOString().split('T')[0],
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

  // Combined fetching status - ONLY for initial data loading
  const isFetchingInitialData = useMemo(() =>
    vehicleFetchStatus === 'loading' || // Is vehicle being fetched?
    employeeFetchStatus === 'loading' || // Are employees being fetched?
    (isEditMode && reviewFetchStatus === 'loading') || // Is review being fetched (edit mode)?
    // ADDED: Consider it loading if vehicle is needed but not yet fetched/succeeded and not failed
    (vehicleId && !vehicle && vehicleFetchStatus !== 'failed') ||
    // ADDED: Consider it loading if employees are needed but not yet fetched/succeeded and not failed
    (employeeFetchStatus === 'idle' || (employeeFetchStatus !== 'succeeded' && employeeFetchStatus !== 'failed')) ||
    // ADDED: Consider it loading if review is needed (edit mode) but not yet fetched/succeeded and not failed
    (isEditMode && reviewId && !currentReview && reviewFetchStatus !== 'failed'),
    [vehicleFetchStatus, employeeFetchStatus, reviewFetchStatus, isEditMode, vehicleId, reviewId, vehicle, currentReview]
  );

  // Saving status
  const isSaving = useMemo(() => operationStatus === 'loading', [operationStatus]);

  // Combined fetch error
  const fetchError = useMemo(() =>
    vehicleFetchError || employeeFetchError || (isEditMode && reviewFetchError),
    [vehicleFetchError, employeeFetchError, isEditMode, reviewFetchError]
  );

  // Effect to show alerts for fetch or save errors from Redux state
  useEffect(() => {
    const reduxError = fetchError || operationError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, operationError, dispatch]);

  // Effect to fetch necessary data - Dependencies ONLY trigger on ID/mode change
  useEffect(() => {
    // Fetch vehicle if ID exists and it's not loaded or doesn't match the current ID
    if (vehicleId && (!vehicle || vehicle._id !== vehicleId)) {
      dispatch(fetchVehicleById(vehicleId));
    }
    // Fetch employees if they haven't been loaded yet
    // (Consider adding a check if employee list might become stale, but 'idle' or empty is usually sufficient)
    if (employeeFetchStatus === 'idle' || !employees || employees.length === 0) {
      dispatch(fetchEmployees());
    }
    // Fetch review if editing, ID exists, and it's not loaded or doesn't match the current ID
    if (isEditMode && reviewId) {
      if (!currentReview || currentReview._id !== reviewId) {
         dispatch(fetchReviewById(reviewId));
       }
    } else if (!isEditMode) {
      // Reset form and review state for create mode
      setFormData(prev => ({
        dateReviewed: new Date().toISOString().split('T')[0], // Keep date default
        employeeId: '',
        oilChecked: false,
        vehicleChecked: false,
        vehicleBroken: false,
        hours: '', // Reset hours, will be set by next effect if vehicle loads
        notes: '',
      }));
      dispatch(resetCurrentReviewState()); // Safe to reset review state when creating
    }

    // Cleanup on unmount - Only clear operation status to prevent loops
    return () => {
      // Clear any pending save/update status when leaving the form
      dispatch(clearReviewOperationStatus());
      // Avoid resetting fetched data (vehicle, employees, currentReview) here,
      // let the next component decide if it needs fresh data.
    };
  }, [vehicleId, reviewId, isEditMode, dispatch]);

  // Effect to set default hours from vehicle *after* vehicle is fetched (for create mode)
  useEffect(() => {
    // Only set default if creating, vehicle loaded, vehicle has hours, and form hours haven't been manually set yet
    if (!isEditMode && vehicleFetchStatus === 'succeeded' && vehicle?.hours != null && formData.hours === '') {
        setFormData(prev => ({ ...prev, hours: vehicle.hours.toString() }));
    }
    // This effect depends on vehicle data loading successfully
  }, [isEditMode, vehicleFetchStatus, vehicle, formData.hours]);

  // Effect to populate form *after* review data is fetched for edit mode
  useEffect(() => {
    // Only populate if editing, fetch succeeded, and the correct review is loaded
    if (isEditMode && reviewFetchStatus === 'succeeded' && currentReview?._id === reviewId) {
      const newReviewData = {
        dateReviewed: currentReview.dateReviewed?.split('T')[0] || '',
        employeeId: currentReview.employeeId?._id || currentReview.employeeId || '',
        oilChecked: currentReview.oilChecked || false,
        vehicleChecked: currentReview.vehicleChecked || false,
        vehicleBroken: currentReview.vehicleBroken || false,
        hours: currentReview.hours?.toString() || '',
        notes: currentReview.notes || '',
      };
      // Update local state only if necessary to prevent loops
      setFormData(prevData => {
          // Simple stringify comparison is usually sufficient here
          if (JSON.stringify(prevData) !== JSON.stringify(newReviewData)) {
              return newReviewData;
          }
          return prevData;
      });
    }
    // This effect depends on the review data loading successfully
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
    setFormError(null);
    dispatch(clearReviewOperationStatus());

    const validationError = validateForm();
    if (validationError) {
      dispatch(setAlert(validationError, 'warning'));
      setFormError(validationError);
      return;
    }

    const payload = {
      ...formData,
      vehicle: vehicleId,
      hours: parseFloat(formData.hours),
    };

    try {
      if (isEditMode && reviewId) {
        await dispatch(updateVehicleReview({ reviewId, reviewData: payload })).unwrap();
        dispatch(setAlert('Review updated successfully!', 'success'));
      } else {
        await dispatch(createVehicleReview(payload)).unwrap();
        dispatch(setAlert('Review created successfully!', 'success'));
      }
      navigate(`/vehicles/view/${vehicleId}`);
    } catch (err) {
      console.error('Error submitting review:', err);
      dispatch(setAlert(err?.message || 'Failed to save review.', 'danger'));
    }
  };

  // --- Rendering Logic ---

  // 1. Show Global Loading Indicator if fetching initial essential data
  if (isFetchingInitialData) {
    return (
      <div className='vehicles-page'>
        <Alert /> {/* Show alerts even during loading */}
        <div className='vehicles-header'> {/* Basic header structure */}
          <div className='title-breadcrumbs'>
            <h2>
              <FontAwesomeIcon icon={faClipboardList} />{' '}
              {isEditMode ? 'Edit Vehicle Review' : 'Create Vehicle Review'}
            </h2>
            {/* Simplified breadcrumbs during load */}
            <div className='breadcrumbs'>
              <Link to='/dashboard' className='breadcrumb-link'> Dashboard </Link>
              <span className='breadcrumb-separator'> / </span>
              <Link to='/vehicles' className='breadcrumb-link'> Vehicles </Link>
              {vehicleId && <>
                <span className='breadcrumb-separator'> / </span>
                {/* Link might not have vehicle name yet, keep it simple */}
                <Link to={`/vehicles/view/${vehicleId}`} className='breadcrumb-link'> View Vehicle </Link>
              </>}
              <span className='breadcrumb-separator'> / </span>
              <span className='breadcrumb-current'>
                {isEditMode ? 'Edit Review' : 'Create Review'}
              </span>
            </div>
          </div>
        </div>
        <div className='loading-indicator page-loading'> {/* Centered loading */}
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  // 2. Show Error if fetching failed and essential data (vehicle) is missing
  //    (Check fetchError *after* checking loading state)
  if (!vehicle && fetchError) { // Check specifically for vehicle missing + any fetch error
     return (
       <div className='vehicles-page'>
         <Alert />
         <div className='vehicles-header'> {/* Basic header structure */}
           <div className='title-breadcrumbs'>
             <h2>
               <FontAwesomeIcon icon={faClipboardList} />{' '}
               {isEditMode ? 'Edit Vehicle Review' : 'Create Vehicle Review'}
             </h2>
             <div className='breadcrumbs'>
               {/* Consistent basic breadcrumbs */}
               <Link to='/dashboard' className='breadcrumb-link'> Dashboard </Link>
               <span className='breadcrumb-separator'> / </span>
               <Link to='/vehicles' className='breadcrumb-link'> Vehicles </Link>
               {vehicleId && <>
                 <span className='breadcrumb-separator'> / </span>
                 <Link to={`/vehicles/view/${vehicleId}`} className='breadcrumb-link'> View Vehicle </Link>
               </>}
               <span className='breadcrumb-separator'> / </span>
               <span className='breadcrumb-current'>
                 {isEditMode ? 'Edit Review' : 'Create Review'}
               </span>
             </div>
           </div>
         </div>
         <div className='error-message page-error'>
            <FontAwesomeIcon icon={faExclamationCircle} />
            {/* Display the actual error */}
            <p>Could not load required data: {fetchError}. Please try again later.</p>
            <Link to="/vehicles" className="btn btn-secondary">Back to Vehicles</Link>
         </div>
       </div>
     );
  }

  // 3. Show Form only if NOT fetching initial data AND vehicle data IS available
  //    (This condition should now be met correctly after loading finishes)
  if (!isFetchingInitialData && vehicle) {
    return (
      <div className='vehicles-page'>
        <Alert />
        <div className='vehicles-header'>
          {/* Full header with potentially loaded vehicle name */}
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
                {/* Now safe to use vehicle.name */}
                {vehicle?.name ?? 'View Vehicle'}
              </Link>
              <span className='breadcrumb-separator'> / </span>
              <span className='breadcrumb-current'>
                {isEditMode ? 'Edit Review' : 'Create Review'}
              </span>
            </div>
          </div>
        </div>

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
            {/* Local validation errors */}
            {formError && (
              <div className='form-error-message'>
                <FontAwesomeIcon icon={faExclamationCircle} /> {formError}
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
                disabled={isSaving} // Disable only when saving
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
                disabled={isSaving || employeeFetchStatus === 'loading'} // Disable if saving or employees loading
              >
                <option value=''>-- Select Employee --</option>
                {/* Ensure employees is an array before mapping */}
                {Array.isArray(employees) && employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              {/* Optional: Show loading indicator specifically for employees if needed */}
              {employeeFetchStatus === 'loading' && <FontAwesomeIcon icon={faSpinner} spin style={{ marginLeft: '10px' }}/>}
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
                disabled={isSaving} // Disable only when saving
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
                disabled={isSaving} // Disable only when saving
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
                disabled={isSaving} // Disable only when saving
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
                disabled={isSaving} // Disable only when saving
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
                disabled={isSaving} // Disable only when saving
                placeholder='Add any relevant notes about the vehicle check...'
              ></textarea>
            </div>

            <div className='form-footer'>
              <button
                type='button'
                className='btn btn-danger'
                onClick={() => navigate(`/vehicles/view/${vehicleId}`)}
                disabled={isSaving} // Disable only when saving
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button
                type='submit'
                className='btn btn-success'
                // Add basic client-side disabling for required fields
                disabled={isSaving || !formData.employeeId || !formData.dateReviewed || formData.hours === ''}
              >
                {isSaving ? ( // Use isSaving for button state
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
      </div>
    );
  }

  // 4. Fallback (Should ideally not be reached if logic above is correct)
  //    This might happen if loading finished, vehicle is null, but there was no fetchError reported.
  return (
       <div className='vehicles-page'>
         <Alert />
         <div className='vehicles-header'> {/* Basic header structure */}
           <div className='title-breadcrumbs'>
             <h2>
               <FontAwesomeIcon icon={faClipboardList} />{' '}
               {isEditMode ? 'Edit Vehicle Review' : 'Create Vehicle Review'}
             </h2>
             <div className='breadcrumbs'>
               {/* Consistent basic breadcrumbs */}
            <Link to='/dashboard' className='breadcrumb-link'> Dashboard </Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/vehicles' className='breadcrumb-link'> Vehicles </Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to={`/vehicles/view/${vehicleId}`} className='breadcrumb-link'>
               View Vehicle
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>
              {isEditMode ? 'Edit Review' : 'Create Review'}
            </span>
          </div>
        </div>
        </div>
         <div className='error-message page-error'>
            <FontAwesomeIcon icon={faExclamationCircle} />
            <p>An unexpected error occurred, or the vehicle could not be found.</p>
            <Link to="/vehicles" className="btn btn-secondary">Back to Vehicles</Link>
         </div>
       </div>
  );
};

export default CreateOrUpdateVehicleReview;
