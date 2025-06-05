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
  // const params = useParams(); 
  // console.log('[CreateOrUpdateVehicleReview] Raw params from useParams():', params);
  const { vehicleId, reviewId } = useParams();
  // console.log('[CreateOrUpdateVehicleReview] Destructured params - vehicleId:', vehicleId, 'reviewId:', reviewId);

  const navigate = useNavigate();
  const isEditMode = Boolean(reviewId);

  // Local form state
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

  // Redux state selectors
  const { user } = useSelector((state) => state.auth || {}); // Get user from auth state
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

  // Derived state: True if any initial essential data is being fetched
  const isFetchingInitialData = useMemo(() =>
    vehicleFetchStatus === 'loading' ||
    employeeFetchStatus === 'loading' ||
    (isEditMode && reviewFetchStatus === 'loading') ||
    (vehicleId && !vehicle && vehicleFetchStatus !== 'failed') ||
    (employeeFetchStatus === 'idle' || (employeeFetchStatus !== 'succeeded' && employeeFetchStatus !== 'failed')) ||
    (isEditMode && reviewId && !currentReview && reviewFetchStatus !== 'failed'),
    [vehicleFetchStatus, employeeFetchStatus, reviewFetchStatus, isEditMode, vehicleId, reviewId, vehicle, currentReview]
  );

  // Derived state: True if a create/update operation is in progress
  const isSaving = useMemo(() => operationStatus === 'loading', [operationStatus]);

  // Derived state: Combines all potential fetch errors for initial data
  const fetchError = useMemo(() =>
    vehicleFetchError || employeeFetchError || (isEditMode && reviewFetchError),
    [vehicleFetchError, employeeFetchError, isEditMode, reviewFetchError]
  );

  // Effects
  // Displays errors from Redux state (fetch or save operations) as alerts
  useEffect(() => {
    const reduxError = fetchError || operationError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, operationError, dispatch]);

  // Fetches essential data (vehicle, employees, and review if editing)
  useEffect(() => {
    if (vehicleId && (!vehicle || vehicle._id !== vehicleId)) {
      dispatch(fetchVehicleById(vehicleId));
    }
    // Fetch all employees ONLY if the user is not an employee (i.e., employer needs to select)
    if (user?.role !== 'employee') {
      if (employeeFetchStatus === 'idle' || !employees || employees.length === 0) {
        dispatch(fetchEmployees());
      }
    }
    // Fetch review data if in edit mode and it's not already loaded or is incorrect
    if (isEditMode && reviewId) {
      // Ensure employeeId is not reset if editing
      if (!currentReview || currentReview._id !== reviewId) {
         dispatch(fetchReviewById(reviewId));
       }
    } else if (!isEditMode) {
      // Reset form and review state for create mode
      setFormData(prev => ({
        dateReviewed: new Date().toISOString().split('T')[0], // Keep date default
        // Pre-fill employeeId if logged-in user is an employee and has an employeeProfileId
        employeeId: (user?.role === 'employee' && user?.employeeProfileId) ? user.employeeProfileId : '',
        oilChecked: false,
        vehicleChecked: false,
        vehicleBroken: false,
        hours: '', // Reset hours, will be set by next effect if vehicle loads
        notes: '',
      }));
      dispatch(resetCurrentReviewState()); // Safe to reset review state when creating
    }

    // Cleanup when component unmounts or dependencies change
    return () => {
      dispatch(clearReviewOperationStatus());
    };
  }, [vehicleId, reviewId, isEditMode, dispatch, vehicle, currentReview, employeeFetchStatus, employees, user]);

  // Sets default hours from the vehicle data when creating a new review
  useEffect(() => {
    if (!isEditMode && vehicleFetchStatus === 'succeeded' && vehicle?.hours != null && formData.hours === '') {
        setFormData(prev => ({ ...prev, hours: vehicle.hours.toString() }));
    }
  }, [isEditMode, vehicleFetchStatus, vehicle, formData.hours]);

  // Populates the form with fetched review data when in edit mode
  useEffect(() => {
    if (isEditMode && reviewFetchStatus === 'succeeded' && currentReview?._id === reviewId) {
      const newReviewData = {
        dateReviewed: currentReview.dateReviewed?.split('T')[0] || '',
        employeeId: currentReview.employeeId?._id || currentReview.employeeId || '', // Handles populated or direct ID
        oilChecked: currentReview.oilChecked || false,
        vehicleChecked: currentReview.vehicleChecked || false,
        vehicleBroken: currentReview.vehicleBroken || false,
        hours: currentReview.hours?.toString() || '',
        notes: currentReview.notes || '',
      };
      // Update local state only if necessary to prevent loops
      setFormData(prevData => {
          if (JSON.stringify(prevData) !== JSON.stringify(newReviewData)) {
              return newReviewData;
          }
          return prevData;
      });
    }
  }, [isEditMode, reviewFetchStatus, currentReview, reviewId]);

  // Handlers
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
    // console.log('[handleSubmit] Start. vehicleId from component scope:', vehicleId, 'reviewId from component scope:', reviewId);

    // Clear previous states
    setFormError(null);
    dispatch(clearReviewOperationStatus());

    const validationError = validateForm();
    
    // Most critical check: Is the identifier 'vehicleId' even known here?
    // typeof is safe to use even if vehicleId was somehow not declared in this scope.
    if (typeof vehicleId === 'undefined') {
      // console.error('[handleSubmit] CRITICAL: typeof vehicleId is "undefined". This indicates a major issue with variable scope or declaration from useParams.');
      dispatch(setAlert('Critical error: Vehicle ID context is lost. Cannot submit.', 'danger'));
      setFormError('A critical error occurred with the Vehicle ID. Please refresh or contact support.');
      return;
    }

    // Check if vehicleId has a falsy value (e.g., it's undefined, null, or an empty string from URL)
    // This check comes AFTER the typeof check to ensure vehicleId is at least a declared variable.
    if (!vehicleId) { 
      // console.error('[handleSubmit] Error: vehicleId is falsy (e.g., undefined, null, empty string). Value:', vehicleId, '. Cannot submit review.');
      dispatch(setAlert('Vehicle ID is missing or invalid. Cannot submit review.', 'danger'));
      setFormError('Vehicle ID is missing or invalid. Operation cannot proceed.');
      return;
    }

    if (validationError) {
      // console.warn('[handleSubmit] Validation Error:', validationError);
      dispatch(setAlert(validationError, 'warning'));
      setFormError(validationError);
      return;
    }
    try {
      // Prepare the main body of the review data
      const reviewDataForBody = {
        ...formData,
        hours: parseFloat(formData.hours),
      };

      // Logic for dateReviewed (conditionally removing it if editing and it's the default today's date)
      if (isEditMode && reviewDataForBody.dateReviewed === new Date().toISOString().split('T')[0]) {
        // This logic might need adjustment based on backend requirements.
        // If the backend expects dateReviewed for updates, don't delete it.
        // If sending today's date is fine, remove this block.
        // delete reviewDataForBody.dateReviewed; 
      } else if (!isEditMode && !reviewId) { 
        // This block is for create mode.
        // formData.dateReviewed is already part of reviewDataForBody.
        // No specific action needed here unless there's a special case for create mode date.
      }

      // console.log('[handleSubmit] Submitting. Mode:', isEditMode ? 'edit' : 'create', 'Review ID:', reviewId, 'Vehicle ID for URL:', vehicleId);
      // console.log('[handleSubmit] Payload for request body:', reviewDataForBody);

      let operationSuccessful = false;
      let successMessage = '';

      if (isEditMode && reviewId) {
        // The current `updateVehicleReview` thunk expects `reviewId` and `reviewData`.
        await dispatch(updateVehicleReview({ reviewId, reviewData: reviewDataForBody })).unwrap();
        operationSuccessful = true;
        successMessage = 'Review updated successfully!';
      } else {
        // For create, the thunk expects { vehicleId, ...reviewData }
        // vehicleId (from useParams) is for the URL, reviewDataForBody is for the request body.
        await dispatch(createVehicleReview({ vehicleId: vehicleId, ...reviewDataForBody })).unwrap();
        operationSuccessful = true;
        successMessage = 'Review created successfully!';
      }

      if (operationSuccessful) {
        dispatch(setAlert(successMessage, 'success'));
        navigate(-1); // Go back to the previous page
      }
    } catch (err) {
      console.error('Error submitting review:', err); // Keep a general error log
      // console.error('[handleSubmit] err.message:', err.message); 
      // console.error('[handleSubmit] err.name:', err.name); 
      const errorMessage = err.payload?.message || err.message || 'Failed to save review. Please try again.';
      dispatch(setAlert(errorMessage, 'danger'));
      setFormError(errorMessage);
    }
  };

  // Render logic
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
            <div className='breadcrumbs'>
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
        <div className='loading-indicator page-loading'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  // Handles error state if essential data (like vehicle) failed to load
  if (!vehicle && fetchError) {
     return (
       <div className='vehicles-page'>
         <Alert />
         <div className='vehicles-header'>
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
            <p>Could not load required data: {fetchError}. Please try again later.</p>
            <Link to="/vehicles" className="btn btn-secondary">Back to Vehicles</Link>
         </div>
       </div>
     );
  }

  // Renders the form if initial data is loaded and vehicle data is available
  if (!isFetchingInitialData && vehicle) {
    return (
      <div className='vehicles-page'>
        <Alert />
        <div className='vehicles-header'>
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
            {/* Display local form validation errors */}
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
                disabled={isSaving}
              />
            </div>

            {user?.role === 'employee' ? (
              <div className='form-group'>
                <label htmlFor='employeeNameDisplay'>Employee</label>
                <input
                  type='text'
                  id='employeeNameDisplay'
                  value={user.name || 'Current User'} // Display user's name from auth state
                  readOnly
                  disabled
                  className='form-control-plaintext' // Optional: for styling as plain text
                />
              </div>
            ) : (
              <div className='form-group'>
                <label htmlFor='employeeId'>Employee*</label>
                <select
                  id='employeeId'
                  name='employeeId'
                  required
                  value={formData.employeeId}
                  onChange={handleChange}
                  disabled={isSaving || employeeFetchStatus === 'loading'}
                >
                  <option value=''>-- Select Employee --</option>
                  {Array.isArray(employees) && employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
                {user?.role !== 'employee' && employeeFetchStatus === 'loading' && <FontAwesomeIcon icon={faSpinner} spin style={{ marginLeft: '10px' }}/>}
              </div>
            )}

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
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
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
                disabled={isSaving}
                placeholder='Add any relevant notes about the vehicle check...'
              ></textarea>
            </div>

            <div className='form-footer'>
              <button
                type='button'
                className='btn btn-danger'
                onClick={() => navigate(`/vehicles/view/${vehicleId}`)}
                disabled={isSaving}
              >
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button
                type='submit'
                className='btn btn-green'
                disabled={
                  isSaving ||
                  !formData.employeeId ||
                  !formData.dateReviewed ||
                  formData.hours === ''
                }
              >
                {isSaving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                  </>
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

  // Fallback render if none of the above conditions are met (e.g., unexpected state)
  return (
       <div className='vehicles-page'>
         <Alert />
         <div className='vehicles-header'>
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
