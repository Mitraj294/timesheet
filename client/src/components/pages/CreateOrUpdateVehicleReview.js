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
      console.error("[CreateOrUpdateVehicleReview] Redux error:", reduxError);
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, operationError, dispatch]);

  // Fetches essential data (vehicle, employees, and review if editing)
  useEffect(() => {
    console.log("[CreateOrUpdateVehicleReview] useEffect: vehicleId =", vehicleId, "reviewId =", reviewId, "isEditMode =", isEditMode);
    if (vehicleId && (!vehicle || vehicle._id !== vehicleId)) {
      console.log("[CreateOrUpdateVehicleReview] Fetching vehicle by id:", vehicleId);
      dispatch(fetchVehicleById(vehicleId));
    }
    if (user?.role !== 'employee') {
      if (employeeFetchStatus === 'idle' || !employees || employees.length === 0) {
        console.log("[CreateOrUpdateVehicleReview] Fetching employees for employer role...");
        dispatch(fetchEmployees());
      }
    }
    if (isEditMode && reviewId) {
      if (!currentReview || currentReview._id !== reviewId) {
        console.log("[CreateOrUpdateVehicleReview] Fetching review by id:", reviewId);
        dispatch(fetchReviewById(reviewId));
      }
    } else if (!isEditMode) {
      setFormData(prev => ({
        dateReviewed: new Date().toISOString().split('T')[0],
        employeeId: (user?.role === 'employee' && user?.employeeProfileId) ? user.employeeProfileId : '',
        oilChecked: false,
        vehicleChecked: false,
        vehicleBroken: false,
        hours: '',
        notes: '',
      }));
      dispatch(resetCurrentReviewState());
      console.log("[CreateOrUpdateVehicleReview] Reset form and review state for create mode.");
    }
    return () => {
      dispatch(clearReviewOperationStatus());
      console.log("[CreateOrUpdateVehicleReview] Cleanup: cleared review operation status.");
    };
  }, [vehicleId, reviewId, isEditMode, dispatch, vehicle, currentReview, employeeFetchStatus, employees, user]);

  // Sets default hours from the vehicle data when creating a new review
  useEffect(() => {
    if (!isEditMode && vehicleFetchStatus === 'succeeded' && vehicle?.hours != null && formData.hours === '') {
      setFormData(prev => ({ ...prev, hours: vehicle.hours.toString() }));
      console.log("[CreateOrUpdateVehicleReview] Set default hours from vehicle:", vehicle.hours);
    }
  }, [isEditMode, vehicleFetchStatus, vehicle, formData.hours]);

  // Populates the form with fetched review data when in edit mode
  useEffect(() => {
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
      setFormData(prevData => {
        if (JSON.stringify(prevData) !== JSON.stringify(newReviewData)) {
          console.log("[CreateOrUpdateVehicleReview] Populated form for editing review:", currentReview);
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
    console.log(`[CreateOrUpdateVehicleReview] Input changed: ${name} =`, type === 'checkbox' ? checked : value);
  };

  const validateForm = () => {
    if (!formData.dateReviewed) return 'Date Reviewed is required.';
    if (!formData.employeeId || formData.employeeId === '' || formData.employeeId === 'undefined') return 'Employee is required.';
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

    if (typeof vehicleId === 'undefined' || !vehicleId) {
      dispatch(setAlert('Vehicle ID is missing or invalid. Cannot submit review.', 'danger'));
      setFormError('Vehicle ID is missing or invalid. Operation cannot proceed.');
      console.error("[CreateOrUpdateVehicleReview] Error: vehicleId is falsy. Value:", vehicleId);
      return;
    }
    if (!formData.employeeId || formData.employeeId === '' || formData.employeeId === 'undefined') {
      dispatch(setAlert('Employee is required. Please select an employee.', 'danger'));
      setFormError('Employee is required. Please select an employee.');
      return;
    }
    if (validationError) {
      dispatch(setAlert(validationError, 'warning'));
      setFormError(validationError);
      console.warn("[CreateOrUpdateVehicleReview] Validation error:", validationError);
      return;
    }
    try {
      const reviewDataForBody = {
        ...formData,
        hours: parseFloat(formData.hours),
      };
      // Debug log for POST body
      console.log("[CreateOrUpdateVehicleReview] Submitting review data:", {
        vehicleId,
        ...reviewDataForBody,
      });
      let operationSuccessful = false;
      let successMessage = '';
      if (isEditMode && reviewId) {
        await dispatch(updateVehicleReview({ reviewId, reviewData: reviewDataForBody })).unwrap();
        operationSuccessful = true;
        successMessage = 'Review updated successfully!';
      } else {
        // Pass vehicleId and review fields at the top level
        await dispatch(createVehicleReview({ vehicleId, ...reviewDataForBody })).unwrap();
        operationSuccessful = true;
        successMessage = 'Review created successfully!';
      }
      if (operationSuccessful) {
        dispatch(setAlert(successMessage, 'success'));
        navigate(-1);
      }
    } catch (err) {
      // Show more specific error if employee not found
      let errorMessage = err.payload?.message || err.message || 'Failed to save review. Please try again.';
      if (errorMessage.includes('Employee record not found')) {
        errorMessage = 'The selected employee does not exist. Please select a valid employee.';
      }
      dispatch(setAlert(errorMessage, 'danger'));
      setFormError(errorMessage);
      console.error("[CreateOrUpdateVehicleReview] Submit error:", errorMessage);
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
