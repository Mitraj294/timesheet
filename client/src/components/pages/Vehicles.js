// /home/digilab/timesheet/client/src/components/pages/Vehicles.js
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPaperPlane,
  faDownload,
  faEye,
  faPen,
  faTrash,
  faSearch,
  faCar,
  faSpinner,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  fetchVehicles,
  deleteVehicle,
  downloadAllVehiclesReport,
  sendAllVehiclesReportByEmail,
  selectAllVehicles,
  selectVehicleListStatus,
  selectVehicleListError,
  selectVehicleOperationStatus,
  selectVehicleOperationError,
  selectVehicleReportStatus,
  selectVehicleReportError,
  clearOperationStatus,
  clearReportStatus,
} from '../../redux/slices/vehicleSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/Vehicles.scss';

// Main Vehicles component
const Vehicles = () => {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sendEmail, setSendEmail] = useState('');
  const [showSendReport, setShowSendReport] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Stores { id, name } for deletion confirmation

  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Redux state selectors

  const { user } = useSelector((state) => state.auth || {});
  const vehicles = useSelector(selectAllVehicles);
  const loadingStatus = useSelector(selectVehicleListStatus);
  const fetchError = useSelector(selectVehicleListError);
  const operationStatus = useSelector(selectVehicleOperationStatus);
  const operationError = useSelector(selectVehicleOperationError);
  const reportStatus = useSelector(selectVehicleReportStatus);
  const reportError = useSelector(selectVehicleReportError);

  // Effects
  // Fetches vehicles if the list is not already loaded or if an error occurred previously
  useEffect(() => {
    if (loadingStatus === 'idle') {
      try { // Initial fetch
        dispatch(fetchVehicles()).unwrap();
      } catch (error) {
        console.error('Failed to fetch vehicles:', error);
        if (
          error?.message?.includes('401') ||
          error?.message?.includes('403') ||
          error?.message?.includes('No authentication token found')
        ) {
          localStorage.removeItem('token'); // Might be better handled by an interceptor
          navigate('/login');
        }
      }
    }
  }, [loadingStatus, dispatch, navigate]);

  // Displays errors from Redux state (fetch, operation, report) as alerts
  useEffect(() => {
    const reduxError = fetchError || operationError || reportError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, operationError, reportError, dispatch]);

  // Handlers
  // Handles downloading the report for all vehicles
  const handleDownloadReport = async () => {
    dispatch(clearReportStatus());
    const reportParams = {};
    if (startDate) reportParams.startDate = startDate.toISOString();
    if (endDate) reportParams.endDate = endDate.toISOString();

    try {
      const resultAction = await dispatch(downloadAllVehiclesReport(reportParams)).unwrap();

      const url = window.URL.createObjectURL(resultAction.blob);
      const link = document.createElement('a');
      link.href = url;
      let fallbackFilename = 'vehicles_report'; // Construct a fallback filename
      if (startDate && endDate) {
        fallbackFilename += `_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`;
      } else if (startDate) {
        fallbackFilename += `_from_${startDate.toISOString().split('T')[0]}`;
      } else if (endDate) { // Should ideally not happen if minDate for endDate is startDate and startDate is null
        fallbackFilename += `_until_${endDate.toISOString().split('T')[0]}`;
      } else {
        fallbackFilename += '_all_time';
      }
      fallbackFilename += '.xlsx';
      link.download = resultAction.filename || fallbackFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      dispatch(setAlert('Vehicle report downloaded successfully.', 'success'));
    } catch (err) {
      console.error('Download report error:', err);
    }
  };
  // Handles sending the report for all vehicles via email
  const handleSendReport = async () => {
    if (!sendEmail) {
      dispatch(setAlert('Please enter an email address.', 'warning'));
      return;
    }
    if (!/\S+@\S+\.\S+/.test(sendEmail)) {
      dispatch(setAlert('Please enter a valid email address.', 'warning'));
      return;
    }
    dispatch(clearReportStatus());
    const reportData = { email: sendEmail };
    if (startDate) reportData.startDate = startDate.toISOString();
    if (endDate) reportData.endDate = endDate.toISOString();

    try {
      await dispatch(sendAllVehiclesReportByEmail(reportData)).unwrap();

      setShowSendReport(false); // Close modal on success
      setSendEmail('');
      setStartDate(null);
      setEndDate(null);
      dispatch(setAlert('Vehicle report sent successfully.', 'success'));
    } catch (err) {
      console.error('Error sending report:', err);
    }
  };

  // Initiates the delete process for a vehicle
  const handleDeleteClick = (vehicleId, vehicleName) => {
    setItemToDelete({ id: vehicleId, name: vehicleName });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  // Confirms and dispatches the delete action for a vehicle
  const confirmDeleteVehicle = async () => {
    if (!itemToDelete) return;
    const { id: vehicleId, name: vehicleName } = itemToDelete;

    dispatch(clearOperationStatus());
    try {
      await dispatch(deleteVehicle(vehicleId)).unwrap();
      dispatch(setAlert(`Vehicle "${vehicleName}" deleted successfully.`, 'success'));
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting vehicle:', err);
    }
  };

  // Memoized data
  // Filters vehicles based on the search term
  const filteredVehicles = vehicles.filter((v) =>
    v?.name?.toLowerCase().includes(search.toLowerCase())
  );

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

  // Derived state for UI
  const isDeleting = operationStatus === 'loading'; // True if a delete operation is in progress
  // Render
  return (
    <div className='vehicles-page'>
      <Alert />
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faCar} /> Vehicles
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>Vehicles</span>
          </div>
        </div>
        <div className="header-actions">
          {user?.role === 'employer' && (
            <Link to='/vehicles/create' className='btn btn-success'>
              <FontAwesomeIcon icon={faPlus} /> Create Vehicle
            </Link>
          )}
          {user?.role === 'employer' && ( // Conditionally render Send and Download buttons
            <>
              <button
                className='btn btn-purple'
                onClick={toggleSendReport}
                aria-expanded={showSendReport}
                aria-controls="send-report-options"
              >
                <FontAwesomeIcon icon={faPaperPlane} /> Send Report
              </button>
              <button
                className='btn btn-danger'
                onClick={toggleDownloadReport}
                aria-expanded={showDateRangePicker}
                aria-controls="download-report-options"
              >
                <FontAwesomeIcon icon={faDownload} /> Download Report
              </button>
            </>
          )}
        </div>
      </div>

      {user?.role === 'employer' && showSendReport && ( // Also conditional here
        <div id="send-report-options" className='report-options-container send-report-container'>
          <h4>Send Vehicle Report</h4>
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
              onClick={handleSendReport}
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

      {user?.role === 'employer' && showDateRangePicker && ( // Also conditional here
        <div id="download-report-options" className='report-options-container download-date-range'>
          <h4>Download Vehicle Report</h4>
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
            className='btn btn-download-report' // Consider changing to btn-danger or a consistent report button style
            onClick={handleDownloadReport}
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
          placeholder='Search by Vehicle Name...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label='Search Vehicles'
        />
        <FontAwesomeIcon icon={faSearch} className='search-icon' />
      </div>

      {loadingStatus === 'loading' && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading vehicles...</p>
        </div>
      )}

      {/* Vehicle Grid: displayed when not loading and no fetch error occurred */}
      {loadingStatus === 'succeeded' && !fetchError && (
        <div className='vehicles-grid'>
          <div className='vehicles-row header'>
            <div>Date Created</div>
            <div>Vehicle Name</div>
            <div>Hours</div>
            <div>WOF/Rego</div>
            <div>Actions</div>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className='vehicles-row no-results'>
              {vehicles.length === 0 ? 'No vehicles have been added yet.' : 'No vehicles match your search.'}
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <div key={vehicle._id} className='vehicles-row vehicle-card'>
                <div data-label='Created'>
                  {vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : '--'}
                </div>
                <div data-label='Name'>{vehicle.name || '--'}</div>
                <div data-label='Hours'>{vehicle.hours || '--'}</div>
                <div data-label='WOF/Rego'>{vehicle.wofRego || '--'}</div>
                <div data-label='Actions' className='actions'>
                  <Link
                    to={`/vehicles/view/${vehicle._id}`}
                    className='btn-icon btn-icon-blue'
                    title='View Details'
                    aria-label={`View details for ${vehicle.name}`}
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </Link>
                  {user?.role === 'employer' && (
                    <Link
                      to={`/vehicles/update/${vehicle._id}`}
                      className='btn-icon btn-icon-yellow'
                      title='Edit Vehicle'
                      aria-label={`Edit ${vehicle.name}`}
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </Link>
                  )}
                  {user?.role === 'employer' && (
                    <button
                      className='btn-icon btn-icon-red'
                      onClick={() => handleDeleteClick(vehicle._id, vehicle.name)}
                      disabled={isDeleting}
                      title='Delete Vehicle'
                      aria-label={`Delete ${vehicle.name}`}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay">
            <div className="logout-confirm-dialog">
              <h4>Confirm Vehicle Deletion</h4>
              <p>Are you sure you want to permanently delete vehicle "<strong>{itemToDelete.name}</strong>"? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeleting}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteVehicle} disabled={isDeleting}>
                  {isDeleting ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete Vehicle'}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default Vehicles;
