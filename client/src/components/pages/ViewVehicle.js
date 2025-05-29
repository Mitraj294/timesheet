// /home/digilab/timesheet/client/src/components/pages/ViewVehicle.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faPlus,
  faEye,
  faSearch,
  faCheck,
  faTimes,
  faPen,
  faTrash,
  faPaperPlane,
  faCar,
  faSpinner,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  fetchVehicleById,
  downloadVehicleReport,
  sendVehicleReportByEmail,
  selectVehicleByIdState,
  selectCurrentVehicleStatus,
  selectCurrentVehicleError,
  selectVehicleReportStatus,
  selectVehicleReportError,
  resetCurrentVehicle,
  clearReportStatus,
} from '../../redux/slices/vehicleSlice';
import {
  fetchReviewsByVehicleId,
  deleteVehicleReview,
  selectAllReviewsForVehicle,
  selectReviewListStatus,
  selectReviewListError,
  selectReviewOperationStatus,
  selectReviewOperationError,
  clearReviewOperationStatus,
  resetReviewState,
} from '../../redux/slices/vehicleReviewSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/ViewVehicle.scss';

const ViewVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  // State for report filter modals
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showSendReport, setShowSendReport] = useState(false);
  const [sendEmail, setSendEmail] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id, name }
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth || {});
  const vehicle = useSelector(selectVehicleByIdState);
  // Vehicle specific fetch status/error
  const vehicleFetchStatus = useSelector(selectCurrentVehicleStatus);
  const vehicleFetchError = useSelector(selectCurrentVehicleError);
  const vehicleHistory = useSelector(selectAllReviewsForVehicle);
  const reviewFetchStatus = useSelector((state) => state.vehicleReviews.status);
  const reviewFetchError = useSelector((state) => state.vehicleReviews.error);
  const reviewOperationStatus = useSelector(selectReviewOperationStatus);
  const reviewOperationError = useSelector(selectReviewOperationError);
  // Report specific status/error
  const reportStatus = useSelector(selectVehicleReportStatus);
  const reportError = useSelector(selectVehicleReportError);

  // Combined loading state for initial page data
  const isLoading = vehicleFetchStatus === 'loading' || reviewFetchStatus === 'loading';
  const fetchError = vehicleFetchError || reviewFetchError;

  // Effects
  // Fetches vehicle details and its review history
  useEffect(() => {
    dispatch(fetchVehicleById(vehicleId));
    dispatch(fetchReviewsByVehicleId(vehicleId));
    // Cleanup on unmount or when vehicleId changes
    return () => {
      dispatch(resetReviewState());
      dispatch(clearReportStatus());
      dispatch(clearReviewOperationStatus());
    };
  }, [vehicleId, dispatch]);

  // Displays errors from Redux state (fetch, operation, report) as alerts
  useEffect(() => {
    const reduxError = fetchError || reviewOperationError || reportError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, reviewOperationError, reportError, dispatch]);

  // Handlers
  // Sets up state for the delete confirmation modal (for reviews)
  const handleDeleteClick = (reviewId, employeeName) => {
    setItemToDelete({ id: reviewId, name: employeeName || 'this employee' });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleCreateReviewClick = () => {
    navigate(`/vehicles/${vehicleId}/review`);
  };

  // Confirms and dispatches the delete action for a vehicle review
  const confirmDeleteReview = async () => {
    if (!itemToDelete) return;
    const { id: reviewId, name: employeeName } = itemToDelete;

    dispatch(clearReviewOperationStatus());
    try {
      await dispatch(deleteVehicleReview(reviewId)).unwrap();
      dispatch(setAlert(`Review by ${employeeName || 'employee'} deleted successfully.`, 'success'));
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting review:', err);
    }
  };

  const handleViewReviewClick = (item) => {
    navigate(`/vehicles/reviews/${item._id}/view`);
  };

  // Handles downloading the vehicle report (Excel)
  const handleDownloadExcelReport = async () => {
    dispatch(clearReportStatus());

    const reportParams = { vehicleId };
    if (startDate) reportParams.startDate = startDate.toISOString();
    if (endDate) reportParams.endDate = endDate.toISOString();

    try {
      const resultAction = await dispatch(downloadVehicleReport(reportParams)).unwrap();

      const { blob, filename } = resultAction;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const safeVehicleName = vehicle?.name?.replace(/\s+/g, '_') || 'vehicle';
      let fallbackFilename = `${safeVehicleName}_report`;
      if (startDate && endDate) {
        fallbackFilename += `_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`;
      } else if (startDate) {
        fallbackFilename += `_from_${startDate.toISOString().split('T')[0]}`;
      } else if (endDate) {
        fallbackFilename += `_until_${endDate.toISOString().split('T')[0]}`;
      } else {
        fallbackFilename += '_all_time';
      }
      fallbackFilename += '.xlsx';
      link.download = filename || fallbackFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowDateRangePicker(false);
      dispatch(setAlert('Vehicle report downloaded successfully.', 'success'));
    } catch (err) {
      console.error('Error downloading Excel report:', err);
    }
  };

  // Handles sending the vehicle report via email
  const handleSendVehicleReport = async () => {
    if (!sendEmail) {
      dispatch(setAlert('Please enter an email address.', 'warning'));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(sendEmail)) {
      dispatch(setAlert('Please enter a valid email address.', 'warning'));
      return;
    }
    dispatch(clearReportStatus());

    const reportData = { vehicleId, email: sendEmail };
    if (startDate) reportData.startDate = startDate.toISOString();
    if (endDate) reportData.endDate = endDate.toISOString();

    try {
      await dispatch(sendVehicleReportByEmail(reportData)).unwrap();

      setShowSendReport(false);
      setSendEmail('');
      setStartDate(null);
      setEndDate(null);
      dispatch(setAlert('Vehicle report sent successfully.', 'success'));
    } catch (err) {
      console.error('Error sending report:', err);
    }
  };

  // Toggles visibility of the Send Report filter section
  const toggleSendReport = () => {
    const currentlyShowing = showSendReport;
    setShowSendReport(!currentlyShowing);
    setShowDateRangePicker(false);
    dispatch(clearReportStatus());
    if (!currentlyShowing) {
        setStartDate(null);
        setEndDate(null);
    }
  };

  // Toggles visibility of the Download Report filter section
  const toggleDownloadReport = () => {
    const currentlyShowing = showDateRangePicker;
    setShowDateRangePicker(!currentlyShowing);
    setShowSendReport(false);
    dispatch(clearReportStatus());
    if (!currentlyShowing) {
        setStartDate(null);
        setEndDate(null);
    }
  };

  // Filters the review history based on the search term (employee name)
  const filteredHistory = useMemo(() => {
    return vehicleHistory
      .filter(entry => {
        // Ensure the employeeId object exists and has a name property.
        // This will filter out reviews where the employee might have been deleted
        // or if the employeeId was not properly populated.
        return entry.employeeId && typeof entry.employeeId.name === 'string' && entry.employeeId.name.trim() !== '';
      })
      .filter((entry) => {
        const employeeName = entry.employeeId.name.toLowerCase(); // Safe to access .name directly due to the previous filter
        return employeeName.includes(search.toLowerCase());
      });
  }, [vehicleHistory, search]);

  // Defines the CSS grid column layout for the reviews table
  const gridColumns = '1fr 1.5fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr';
  const isDeletingReview = reviewOperationStatus === 'loading'; // True if a review delete operation is in progress

  if (isLoading && !vehicle) {
    return (
      <div className='loading-indicator page-loading'>
        <FontAwesomeIcon icon={faSpinner} spin size='2x' />
        <p>Loading vehicle details...</p>
      </div>
    );
  }

  // Render
  // Handles case where vehicle data is not available after loading attempts
  return (
    <div className='vehicles-page'>
      <Alert />
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faCar} /> {vehicle?.name ?? 'Vehicle Details'}
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/vehicles' className='breadcrumb-link'>Vehicles</Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>View</span>
          </div>
        </div>
        <div className='header-actions'>
          {(user?.role === 'employer' || user?.role === 'employee') && ( // Allow employees to create reviews
            <button className='btn btn-green' onClick={handleCreateReviewClick}>
              <FontAwesomeIcon icon={faPlus} /> Create Review
            </button>
          )}
          {user?.role === 'employer' && ( // Keep report actions for employer only
            <>
              <button
                className='btn btn-purple'
                onClick={toggleSendReport}
                aria-expanded={showSendReport}
                aria-controls="send-report-options-view"
              >
                <FontAwesomeIcon icon={faPaperPlane} /> Send Report
              </button>
              <button
                className='btn btn-danger'
                onClick={toggleDownloadReport}
                aria-expanded={showDateRangePicker}
                aria-controls="download-report-options-view"
              >
                <FontAwesomeIcon icon={faDownload} /> Download Report
              </button>
            </>
          )}
          {/* <button
            className='btn btn-purple'
            onClick={toggleSendReport}
            aria-expanded={showSendReport}
            aria-controls="send-report-options-view"
          >
            <FontAwesomeIcon icon={faPaperPlane} /> Send Report
          </button>
          <button
            className='btn btn-danger'
            onClick={toggleDownloadReport}
            aria-expanded={showDateRangePicker}
            aria-controls="download-report-options-view"
          >
            <FontAwesomeIcon icon={faDownload} /> Download Report
          </button> */}
        </div>
      </div>

      {user?.role === 'employer' && showSendReport && ( // Ensure report UI is employer-only
        <div id="send-report-options-view" className='report-options-container send-report-container'>
          <h4>Send Report for {vehicle?.name}</h4>
          {/* Errors for send operation are handled by the global Alert component via Redux state */}
          <div className='date-picker-range'>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText='Start Date'
              dateFormat='yyyy-MM-dd'
              className='date-input'
              wrapperClassName='date-picker-wrapper'
              aria-label="Report Start Date"
            />
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              placeholderText='End Date'
              dateFormat='yyyy-MM-dd'
              minDate={startDate}
              className='date-input'
              wrapperClassName='date-picker-wrapper'
              aria-label="Report End Date"
            />
          </div>
          <div className='send-report-email'>
            <input
              type='email'
              placeholder='Enter recipient email'
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              aria-label='Recipient Email'
              required
            />
            <button
              className='btn btn-purple'
              onClick={handleSendVehicleReport}
              disabled={reportStatus === 'loading' || !sendEmail || !/\S+@\S+\.\S+/.test(sendEmail)}
            >
              {reportStatus === 'loading' ? (
                <><FontAwesomeIcon icon={faSpinner} spin /> Sending...</>
              ) : (
                <><FontAwesomeIcon icon={faPaperPlane} /> Send</>
              )}
            </button>
          </div>
        </div>
      )}

      {user?.role === 'employer' && showDateRangePicker && ( // Ensure report UI is employer-only
        <div id="download-report-options-view" className='report-options-container download-date-range'>
          <h4>Download Report for {vehicle?.name}</h4>
          {/* Errors for download operation are handled by the global Alert component via Redux state */}
          <div className='date-picker-range'>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText='Start Date'
              dateFormat='yyyy-MM-dd'
              className='date-input'
              wrapperClassName='date-picker-wrapper'
              aria-label="Report Start Date"
            />
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              placeholderText='End Date'
              dateFormat='yyyy-MM-dd'
              minDate={startDate}
              className='date-input'
              wrapperClassName='date-picker-wrapper'
              aria-label="Report End Date"
            />
          </div>
          <button
            className='btn btn-danger'
            onClick={handleDownloadExcelReport}
            disabled={reportStatus === 'loading'}
          >
            {reportStatus === 'loading' ? (
              <><FontAwesomeIcon icon={faSpinner} spin /> Downloading...</>
            ) : (
              <><FontAwesomeIcon icon={faDownload} /> Download Excel</>
            )}
          </button>
        </div>
      )}

      {/* Search bar for filtering reviews */}

      <div className='vehicles-search'>
        <input
          type='text'
          placeholder='Search Reviews by Employee...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label='Search Reviews'
        />
        <FontAwesomeIcon icon={faSearch} className='search-icon' />
      </div>

      {/* Vehicle Review History Grid */}
      <div className='vehicles-grid'>
        <div className='vehicles-row header' style={{ gridTemplateColumns: gridColumns }}>
          <div>Date</div>
          <div>Employee</div>
          <div>WOF/Rego</div>
          <div>Oil Checked</div>
          <div>Vehicle Checked</div>
          <div>Vehicle Broken</div>
          <div>Hours</div>
          <div>Actions</div>
        </div>

        {isLoading && vehicleHistory.length === 0 && (
          <div className='loading-indicator' style={{ gridColumn: '1 / -1' }}>
            <FontAwesomeIcon icon={faSpinner} spin /> Loading history...
          </div>
        )}

        {!isLoading && filteredHistory.length === 0 ? (
          <div className='vehicles-row no-results'>
            {vehicleHistory.length === 0 ? 'No reviews found for this vehicle.' : 'No reviews match your search criteria.'}
          </div>
        ) : (
          !isLoading &&
          filteredHistory.map((item) => (
            <div key={item._id} className='vehicles-row vehicle-card' style={{ gridTemplateColumns: gridColumns }}>
              <div data-label='Date'>
                {item.dateReviewed ? new Date(item.dateReviewed).toLocaleDateString() : '--'}
              </div>
              <div data-label='Employee'>{item.employeeId?.name || '--'}</div>
              <div data-label='WOF/Rego'>{vehicle?.wofRego ?? '--'}</div>
              <div data-label='Oil Checked'>
                <FontAwesomeIcon icon={item.oilChecked ? faCheck : faTimes} className={item.oilChecked ? 'icon-green' : 'icon-red'} />
              </div>
              <div data-label='Vehicle Checked'>
                <FontAwesomeIcon icon={item.vehicleChecked ? faCheck : faTimes} className={item.vehicleChecked ? 'icon-green' : 'icon-red'} />
              </div>
              <div data-label='Vehicle Broken'>
                {item.vehicleBroken ? 'Yes' : 'No'}
              </div>
              <div data-label='Hours'>{item.hours || '--'}</div>
              <div data-label='Actions' className='actions'>
                <button
                  onClick={() => handleViewReviewClick(item)}
                  className='btn-icon btn-icon-blue'
                  title='View Review Details'
                  aria-label={`View review by ${item.employeeId?.name || 'employee'}`}
                >
                  <FontAwesomeIcon icon={faEye} />
                </button>
                {(user?.role === 'employer' || user?.name === item.employeeId?.name) && (
                  <Link
                    to={`/vehicles/${vehicleId}/reviews/${item._id}/edit`}
                    className='btn-icon btn-icon-yellow'
                    title='Edit Review'
                    aria-label={`Edit review by ${item.employeeId?.name || 'employee'}`}
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </Link>
                )}
                {user?.role === 'employer' && (
                  <button
                    onClick={() => handleDeleteClick(item._id, item.employeeId?.name)}
                    disabled={isDeletingReview}
                    className='btn-icon btn-icon-red'
                    title='Delete Review'
                    aria-label={`Delete review by ${item.employeeId?.name || 'employee'}`}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay">
            <div className="logout-confirm-dialog">
              <h4>Confirm Review Deletion</h4>
              <p>Are you sure you want to permanently delete the review by <strong>{itemToDelete.name}</strong>? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeletingReview}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteReview} disabled={isDeletingReview}>
                  {isDeletingReview ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete Review'}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default ViewVehicle;
