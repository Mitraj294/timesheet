// /home/digilab/timesheet/client/src/components/pages/Vehicles.js
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faPaperPlane, faDownload, faEye, faPen, faTrash, faSearch, faCar, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  fetchVehicles, deleteVehicle, downloadAllVehiclesReport, sendAllVehiclesReportByEmail,
  selectAllVehicles, selectVehicleListStatus, selectVehicleListError,
  selectVehicleOperationStatus, selectVehicleOperationError,
  selectVehicleReportStatus, selectVehicleReportError,
  clearOperationStatus, clearReportStatus,
} from '../../redux/slices/vehicleSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/Vehicles.scss';

// Vehicles page
const Vehicles = () => {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sendEmail, setSendEmail] = useState('');
  const [showSendReport, setShowSendReport] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth || {});
  const vehicles = useSelector(selectAllVehicles);
  const loadingStatus = useSelector(selectVehicleListStatus);
  const fetchError = useSelector(selectVehicleListError);
  const operationStatus = useSelector(selectVehicleOperationStatus);
  const operationError = useSelector(selectVehicleOperationError);
  const reportStatus = useSelector(selectVehicleReportStatus);
  const reportError = useSelector(selectVehicleReportError);

  // Fetch vehicles on mount
  useEffect(() => {
    if (loadingStatus === 'idle') {
      dispatch(fetchVehicles()).unwrap().catch((error) => {
        if (
          error?.message?.includes('401') ||
          error?.message?.includes('403') ||
          error?.message?.includes('No authentication token found')
        ) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      });
    }
  }, [loadingStatus, dispatch, navigate]);

  // Show errors as alerts
  useEffect(() => {
    const reduxError = fetchError || operationError || reportError;
    if (reduxError) {
      console.error("[Vehicles] Error:", reduxError);
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, operationError, reportError, dispatch]);

  // Download vehicle report
  const handleDownloadReport = async () => {
    dispatch(clearReportStatus());
    console.log("[Vehicles] Downloading vehicle report...");
    const reportParams = {};
    if (startDate) reportParams.startDate = startDate.toISOString();
    if (endDate) reportParams.endDate = endDate.toISOString();
    try {
      const resultAction = await dispatch(downloadAllVehiclesReport(reportParams)).unwrap();
      const url = window.URL.createObjectURL(resultAction.blob);
      const link = document.createElement('a');
      link.href = url;
      let fallbackFilename = 'vehicles_report';
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
      link.download = resultAction.filename || fallbackFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      dispatch(setAlert('Vehicle report downloaded successfully.', 'success'));
      console.log("[Vehicles] Vehicle report downloaded.");
    } catch (err) {
      // Error handled by alert
    }
  };

  // Send vehicle report by email
  const handleSendReport = async () => {
    if (!sendEmail || !/\S+@\S+\.\S+/.test(sendEmail)) {
      dispatch(setAlert('Please enter a valid email address.', 'warning'));
      return;
    }
    dispatch(clearReportStatus());
    console.log("[Vehicles] Sending vehicle report to:", sendEmail);
    const reportData = { email: sendEmail };
    if (startDate) reportData.startDate = startDate.toISOString();
    if (endDate) reportData.endDate = endDate.toISOString();
    try {
      await dispatch(sendAllVehiclesReportByEmail(reportData)).unwrap();
      setShowSendReport(false);
      setSendEmail('');
      setStartDate(null);
      setEndDate(null);
      dispatch(setAlert('Vehicle report sent successfully.', 'success'));
      console.log("[Vehicles] Vehicle report sent.");
    } catch (err) {
      // Error handled by alert
    }
  };

  // Delete vehicle
  const handleDeleteClick = (vehicleId, vehicleName) => {
    console.log(`[Vehicles] Request to delete vehicle: ${vehicleName} (${vehicleId})`);
    setItemToDelete({ id: vehicleId, name: vehicleName });
    setShowDeleteConfirm(true);
  };
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    console.log("[Vehicles] Cancelled vehicle deletion");
  };
  const confirmDeleteVehicle = async () => {
    if (!itemToDelete) return;
    const { id: vehicleId, name: vehicleName } = itemToDelete;
    dispatch(clearOperationStatus());
    console.log(`[Vehicles] Confirming delete for vehicle: ${vehicleName} (${vehicleId})`);
    try {
      await dispatch(deleteVehicle(vehicleId)).unwrap();
      dispatch(setAlert(`Vehicle "${vehicleName}" deleted successfully.`, 'success'));
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      console.log(`[Vehicles] Vehicle "${vehicleName}" deleted.`);
    } catch (err) {
      // Error handled by alert
    }
  };

  // Filter vehicles by search
  const filteredVehicles = useMemo(() =>
    vehicles.filter((v) => v?.name?.toLowerCase().includes(search.toLowerCase()))
  , [vehicles, search]);

  // Toggle send/download report sections
  const toggleSendReport = () => {
    setShowSendReport(prev => !prev);
    setShowDateRangePicker(false);
    dispatch(clearReportStatus());
    if (!showSendReport) { setStartDate(null); setEndDate(null); }
    console.log("[Vehicles] Toggled send report filter");
  };
  const toggleDownloadReport = () => {
    setShowDateRangePicker(prev => !prev);
    setShowSendReport(false);
    dispatch(clearReportStatus());
    if (!showDateRangePicker) { setStartDate(null); setEndDate(null); }
    console.log("[Vehicles] Toggled download report filter");
  };

  const isDeleting = operationStatus === 'loading';

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
            <Link to='/vehicles/create' className='btn btn-green'>
              <FontAwesomeIcon icon={faPlus} /> Create Vehicle
            </Link>
          )}
          {user?.role === 'employer' && (
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

      {user?.role === 'employer' && showSendReport && (
        <div id="send-report-options" className='report-options-container send-report-container'>
          <h4>Send Vehicle Report</h4>
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

      {user?.role === 'employer' && showDateRangePicker && (
        <div id="download-report-options" className='report-options-container download-date-range'>
          <h4>Download Vehicle Report</h4>
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
            className='btn btn-download-report'
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
          onChange={e => {
            setSearch(e.target.value);
          }}
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
                {isDeleting ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;
