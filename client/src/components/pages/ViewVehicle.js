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
import { setAlert } from '../../redux/slices/alertSlice'; // Import setAlert
import Alert from '../layout/Alert'; // Import Alert component
import '../../styles/ViewVehicle.scss';

const ViewVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showSendReport, setShowSendReport] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  // Local validation errors handled by dispatching alerts

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id, name }
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth || {});
  const vehicle = useSelector(selectVehicleByIdState);
  const vehicleFetchStatus = useSelector(selectCurrentVehicleStatus);
  const vehicleFetchError = useSelector(selectCurrentVehicleError);
  const vehicleHistory = useSelector(selectAllReviewsForVehicle);
  const reviewFetchStatus = useSelector((state) => state.vehicleReviews.status);
  const reviewFetchError = useSelector((state) => state.vehicleReviews.error);
  const reviewOperationStatus = useSelector(selectReviewOperationStatus);
  const reviewOperationError = useSelector(selectReviewOperationError);
  const reportStatus = useSelector(selectVehicleReportStatus);
  const reportError = useSelector(selectVehicleReportError);

  const isLoading = vehicleFetchStatus === 'loading' || reviewFetchStatus === 'loading';
  const fetchError = vehicleFetchError || reviewFetchError;

  useEffect(() => {
    dispatch(fetchVehicleById(vehicleId));
    dispatch(fetchReviewsByVehicleId(vehicleId));
    return () => {
      // Don't reset currentVehicle here, Create/Update might need it immediately.
      // dispatch(resetCurrentVehicle());
      dispatch(resetReviewState());
      // Reset statuses specific to this page's operations
      dispatch(clearReportStatus());
      dispatch(clearReviewOperationStatus());
    };
  }, [vehicleId, dispatch]);

  // Effect to show alerts for fetch, operation, or report errors from Redux state
  useEffect(() => {
    const reduxError = fetchError || reviewOperationError || reportError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, reviewOperationError, reportError, dispatch]);

  // --- Refactored Delete Confirmation ---
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

  const confirmDeleteReview = async () => {
    if (!itemToDelete) return;
    const { id: reviewId, name: employeeName } = itemToDelete;

    dispatch(clearReviewOperationStatus());
    try {
      await dispatch(deleteVehicleReview(reviewId)).unwrap();
      dispatch(setAlert(`Review by ${employeeName || 'employee'} deleted successfully.`, 'success'));
      setShowDeleteConfirm(false); // Close modal on success
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting review:', err);
      // Error handled by useEffect watching reviewOperationError
    }
  };

  const handleViewReviewClick = (item) => {
    navigate(`/vehicles/reviews/${item._id}/view`);
  };

  const handleDownloadExcelReport = async () => {
    if (!startDate || !endDate) {
      dispatch(setAlert('Please select a start and end date.', 'warning'));
      return;
    }
    dispatch(clearReportStatus());

    try {
      const resultAction = await dispatch(downloadVehicleReport({
        vehicleId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })).unwrap();

      const { blob, filename } = resultAction;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeVehicleName = vehicle?.name?.replace(/\s+/g, '_') || 'vehicle';
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      link.download = filename || `${safeVehicleName}_report_${formattedStartDate}_to_${formattedEndDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowDateRangePicker(false);
      dispatch(setAlert('Vehicle report downloaded successfully.', 'success'));
    } catch (err) {
      console.error('Error downloading Excel report:', err);
      // Error handled by useEffect watching reportError
    }
  };

  const handleSendVehicleReport = async () => {
    if (!startDate || !endDate || !sendEmail) {
      dispatch(setAlert('Please select a date range and enter an email address.', 'warning'));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(sendEmail)) {
      dispatch(setAlert('Please enter a valid email address.', 'warning'));
      return;
    }
    dispatch(clearReportStatus());

    try {
      await dispatch(sendVehicleReportByEmail({
        vehicleId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        email: sendEmail,
      })).unwrap();

      setShowSendReport(false);
      setSendEmail('');
      setStartDate(null);
      setEndDate(null);
      dispatch(setAlert('Vehicle report sent successfully.', 'success'));
    } catch (err) {
      console.error('Error sending report:', err);
      // Error handled by useEffect watching reportError
    }
  };

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

  const filteredHistory = vehicleHistory.filter((entry) => {
    const employeeName = entry.employeeId?.name?.toLowerCase() || '';
    return employeeName.includes(search.toLowerCase());
  });

  const gridColumns = '1fr 1.5fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr';
  const isDeleting = reviewOperationStatus === 'loading'; // Use Redux status

  if (isLoading && !vehicle) {
    return (
      <div className='loading-indicator page-loading'>
        <FontAwesomeIcon icon={faSpinner} spin size='2x' />
        <p>Loading vehicle details...</p>
      </div>
    );
  }

  // Error state handled by Alert component
  /*
  if (fetchError && !isLoading && !vehicle) {
    return (
      <div className='error-message page-error'>
        <FontAwesomeIcon icon={faExclamationCircle} /> {fetchError}
        <Link to='/vehicles' className='btn btn-secondary'>
          Back to Vehicles
        </Link>
      </div>
    );
  }
  */

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
          {user?.role === 'employer' && (
            <button className='btn btn-success' onClick={handleCreateReviewClick}>
              <FontAwesomeIcon icon={faPlus} /> Create Review
            </button>
          )}
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
        </div>
      </div>

      {showSendReport && (
        <div id="send-report-options-view" className='report-options-container send-report-container'>
          <h4>Send Report for {vehicle?.name}</h4>
          {/* Error handled by Alert component */}
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
              disabled={reportStatus === 'loading' || !startDate || !endDate || !sendEmail || !/\S+@\S+\.\S+/.test(sendEmail)}
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

      {showDateRangePicker && (
        <div id="download-report-options-view" className='report-options-container download-date-range'>
          <h4>Download Report for {vehicle?.name}</h4>
          {/* Error handled by Alert component */}
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
            disabled={reportStatus === 'loading' || !startDate || !endDate}
          >
            {reportStatus === 'loading' ? (
              <><FontAwesomeIcon icon={faSpinner} spin /> Downloading...</>
            ) : (
              <><FontAwesomeIcon icon={faDownload} /> Download Excel</>
            )}
          </button>
        </div>
      )}

      {/* Error state handled by Alert component */}
      {/*
      {(fetchError || reviewOperationError || reportError) && !isLoading && (
        <div className='error-message' style={{ marginBottom: '1.5rem' }}>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{fetchError || reviewOperationError || reportError}</p>
        </div>
      )}
      */}

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
                {(user?.role === 'employer' || user?.name === item.employeeId?.name) && (
                  <button
                    onClick={() => handleDeleteClick(item._id, item.employeeId?.name)} // Trigger modal
                    disabled={isDeleting} // Use Redux status
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay"> {/* Re-use styles */}
            <div className="logout-confirm-dialog">
              <h4>Confirm Review Deletion</h4>
              <p>Are you sure you want to permanently delete the review by <strong>{itemToDelete.name}</strong>? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeleting}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteReview} disabled={isDeleting}>
                  {isDeleting ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete Review'}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default ViewVehicle;
