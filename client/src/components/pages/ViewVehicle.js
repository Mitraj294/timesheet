// /home/digilab/timesheet/client/src/components/pages/ViewVehicle.js
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload, faPlus, faEye, faSearch, faCheck, faTimes, faPen, faTrash, faPaperPlane, faCar, faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  fetchVehicleById, downloadVehicleReport, sendVehicleReportByEmail,
  selectVehicleByIdState, selectCurrentVehicleStatus, selectCurrentVehicleError,
  selectVehicleReportStatus, selectVehicleReportError,  clearReportStatus,
} from '../../redux/slices/vehicleSlice';
import {
  fetchReviewsByVehicleId, deleteVehicleReview, selectAllReviewsForVehicle,
 selectReviewOperationStatus, selectReviewOperationError,
  clearReviewOperationStatus, resetReviewState,
} from '../../redux/slices/vehicleReviewSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/ViewVehicle.scss';

const ViewVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Local state
  const [search, setSearch] = useState('');
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showSendReport, setShowSendReport] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Redux selectors
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

  // Fetch vehicle and reviews on mount
  useEffect(() => {
    dispatch(fetchVehicleById(vehicleId));
    dispatch(fetchReviewsByVehicleId(vehicleId));
    return () => {
      dispatch(resetReviewState());
      dispatch(clearReportStatus());
      dispatch(clearReviewOperationStatus());
    };
  }, [vehicleId, dispatch]);

  // Show errors as alerts
  useEffect(() => {
    const reduxError = fetchError || reviewOperationError || reportError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
      console.error("[ViewVehicle] Error:", reduxError);
    }
  }, [fetchError, reviewOperationError, reportError, dispatch]);

  // Delete review handlers
  const handleDeleteClick = (reviewId, employeeName) => {
    setItemToDelete({ id: reviewId, name: employeeName || 'this employee' });
    setShowDeleteConfirm(true);
    console.log(`[ViewVehicle] Request to delete review by: ${employeeName} (${reviewId})`);
  };
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    console.log("[ViewVehicle] Cancelled review deletion");
  };
  const confirmDeleteReview = async () => {
    if (!itemToDelete) return;
    const { id: reviewId, name: employeeName } = itemToDelete;
    dispatch(clearReviewOperationStatus());
    try {
      await dispatch(deleteVehicleReview(reviewId)).unwrap();
      dispatch(setAlert(`Review by ${employeeName || 'employee'} deleted successfully.`, 'success'));
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      console.log(`[ViewVehicle] Review by ${employeeName} deleted.`);
    } catch (err) {
      // Error handled by alert
    }
  };

  // Navigation handlers
  const handleCreateReviewClick = () => {
    console.log("[ViewVehicle] Navigating to create review for vehicle:", vehicleId);
    navigate(`/vehicles/${vehicleId}/review`);
  };
  const handleViewReviewClick = (item) => {
    console.log("[ViewVehicle] Navigating to view review:", item._id);
    navigate(`/vehicles/reviews/${item._id}/view`);
  };

  // Download Excel report
  const handleDownloadExcelReport = async () => {
    dispatch(clearReportStatus());
    const reportParams = { vehicleId };
    if (startDate) reportParams.startDate = startDate.toISOString();
    if (endDate) reportParams.endDate = endDate.toISOString();
    console.log("[ViewVehicle] Downloading vehicle report...", reportParams);
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
      console.log("[ViewVehicle] Vehicle report downloaded.");
    } catch (err) {
      // Error handled by alert
    }
  };

  // Send vehicle report by email
  const handleSendVehicleReport = async () => {
    if (!sendEmail || !/\S+@\S+\.\S+/.test(sendEmail)) {
      dispatch(setAlert('Please enter a valid email address.', 'warning'));
      return;
    }
    dispatch(clearReportStatus());
    const reportData = { vehicleId, email: sendEmail };
    if (startDate) reportData.startDate = startDate.toISOString();
    if (endDate) reportData.endDate = endDate.toISOString();
    console.log("[ViewVehicle] Sending vehicle report to:", sendEmail, reportData);
    try {
      await dispatch(sendVehicleReportByEmail(reportData)).unwrap();
      setShowSendReport(false);
      setSendEmail('');
      setStartDate(null);
      setEndDate(null);
      dispatch(setAlert('Vehicle report sent successfully.', 'success'));
      console.log("[ViewVehicle] Vehicle report sent.");
    } catch (err) {
      // Error handled by alert
    }
  };

  // Toggle report filter sections
  const toggleSendReport = () => {
    setShowSendReport(prev => !prev);
    setShowDateRangePicker(false);
    dispatch(clearReportStatus());
    if (!showSendReport) { setStartDate(null); setEndDate(null); }
    console.log("[ViewVehicle] Toggled send report filter");
  };
  const toggleDownloadReport = () => {
    setShowDateRangePicker(prev => !prev);
    setShowSendReport(false);
    dispatch(clearReportStatus());
    if (!showDateRangePicker) { setStartDate(null); setEndDate(null); }
    console.log("[ViewVehicle] Toggled download report filter");
  };

  // Filter reviews by employee name
  const filteredHistory = useMemo(() =>
    vehicleHistory
      .filter(entry => entry.employeeId && typeof entry.employeeId.name === 'string' && entry.employeeId.name.trim() !== '')
      .filter(entry => entry.employeeId.name.toLowerCase().includes(search.toLowerCase()))
  , [vehicleHistory, search]);

  const gridColumns = '1fr 1.5fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr';
  const isDeletingReview = reviewOperationStatus === 'loading';

  if (isLoading && !vehicle) {
    return (
      <div className='loading-indicator page-loading'>
        <FontAwesomeIcon icon={faSpinner} spin size='2x' />
        <p>Loading vehicle details...</p>
      </div>
    );
  }

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
          {(user?.role === 'employer' || user?.role === 'employee') && (
            <button className='btn btn-green' onClick={handleCreateReviewClick}>
              <FontAwesomeIcon icon={faPlus} /> Create Review
            </button>
          )}
          {user?.role === 'employer' && (
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
        </div>
      </div>

      {user?.role === 'employer' && showSendReport && (
        <div id="send-report-options-view" className='report-options-container send-report-container'>
          <h4>Send Report for {vehicle?.name}</h4>
          <div className='date-picker-range'>
            <DatePicker
              selected={startDate}
              onChange={setStartDate}
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
              onChange={setEndDate}
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
              onChange={e => setSendEmail(e.target.value)}
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

      {user?.role === 'employer' && showDateRangePicker && (
        <div id="download-report-options-view" className='report-options-container download-date-range'>
          <h4>Download Report for {vehicle?.name}</h4>
          <div className='date-picker-range'>
            <DatePicker
              selected={startDate}
              onChange={setStartDate}
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
              onChange={setEndDate}
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

      <div className='vehicles-search'>
        <input
          type='text'
          placeholder='Search Reviews by Employee...'
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            console.log("[ViewVehicle] Search changed:", e.target.value);
          }}
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
                {isDeletingReview ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewVehicle;
