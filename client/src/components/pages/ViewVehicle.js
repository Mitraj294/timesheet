import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
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
// Import the dedicated SCSS file
import '../../styles/ViewVehicle.scss'; // Use ViewVehicle.scss

const API_URL =
  process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const ViewVehicle = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [showSendReport, setShowSendReport] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const { user } = useSelector((state) => state.auth || {});

  useEffect(() => {
    const fetchVehicleWithReviews = async () => {
      setLoading(true);
      setError(null);
      setDownloadError(null);
      setSendError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required.');

        const config = { headers: { Authorization: `Bearer ${token}` } };

        const [vehicleRes, reviewsRes] = await Promise.all([
          axios.get(`${API_URL}/vehicles/${vehicleId}`, config),
          axios.get(`${API_URL}/vehicles/vehicle/${vehicleId}/reviews`, config),
        ]);

        setVehicle(vehicleRes.data);
        setVehicleHistory(reviewsRes.data.reviews || []);
      } catch (err) {
        console.error('Error fetching vehicle data:', err);
        setError(
          err.response?.data?.message || 'Failed to load vehicle data.'
        );
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleWithReviews();
  }, [vehicleId, navigate]);

  const filteredHistory = vehicleHistory.filter((entry) => {
    const employeeName = entry.employeeId?.name?.toLowerCase() || '';
    return employeeName.includes(search.toLowerCase());
  });

  const handleCreateReviewClick = () => {
    navigate(`/vehicles/${vehicleId}/review`);
  };

  const handleDeleteReview = async (reviewId, employeeName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this review by ${
        employeeName || 'this employee'
      }? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setError(null);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/vehicles/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicleHistory((prev) =>
        prev.filter((review) => review._id !== reviewId)
      );
    } catch (err) {
      console.error('Error deleting review:', err);
      setError(err.response?.data?.message || 'Error deleting review');
    }
  };

  const handleViewReviewClick = (item) => {
    navigate(`/vehicles/reviews/${item._id}/view`);
  };

  const handleDownloadExcelReport = async () => {
    if (!startDate || !endDate) {
      setDownloadError('Please select a start and end date.');
      return;
    }
    setDownloadError(null);
    setDownloading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/vehicles/${vehicleId}/download-report`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }
      );

      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeVehicleName = vehicle?.name?.replace(/\s+/g, '_') || 'vehicle';
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      link.download = `${safeVehicleName}_report_${formattedStartDate}_to_${formattedEndDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowDateRangePicker(false);
      setStartDate(null);
      setEndDate(null);
    } catch (error) {
      console.error('Error downloading Excel report:', error);
      setDownloadError(error.response?.data?.message || 'Failed to download report.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendVehicleReport = async () => {
    if (!startDate || !endDate || !sendEmail) {
      setSendError('Please select a date range and enter an email address.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(sendEmail)) {
      setSendError('Please enter a valid email address.');
      return;
    }
    setSendError(null);
    setSending(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/vehicles/report/email/${vehicleId}`,
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          email: sendEmail,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowSendReport(false);
      setSendEmail('');
      setStartDate(null);
      setEndDate(null);
    } catch (error) {
      console.error('Error sending report:', error);
      setSendError(error.response?.data?.message || 'Failed to send report.');
    } finally {
      setSending(false);
    }
  };

  // Toggle function for Send Report section
  const toggleSendReport = () => {
    const currentlyShowing = showSendReport;
    setShowSendReport(!currentlyShowing);
    setShowDateRangePicker(false);
    setSendError(null);
    if (!currentlyShowing) {
        setStartDate(null);
        setEndDate(null);
    }
  };

  // Toggle function for Download Report section
  const toggleDownloadReport = () => {
    const currentlyShowing = showDateRangePicker;
    setShowDateRangePicker(!currentlyShowing);
    setShowSendReport(false);
    setDownloadError(null);
    if (!currentlyShowing) {
        setStartDate(null);
        setEndDate(null);
    }
  };

  // Define grid columns for the review history
  const gridColumns = '1fr 1.5fr 1.5fr 0.8fr 0.8fr 0.8fr 0.8fr 1.2fr';

  if (loading && !vehicle) {
    return (
      <div className='loading-indicator page-loading'>
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          size='2x'
        />
        <p>Loading vehicle details...</p>
      </div>
    );
  }

  if (error && !vehicle) {
    return (
      <div className='error-message page-error'>
        <FontAwesomeIcon icon={faExclamationCircle} />
        <p>{error}</p>
        <Link
          to='/vehicles'
          className='btn btn-secondary'
        >
          Back to Vehicles
        </Link>
      </div>
    );
  }

  return (
    // Use standard page class
    <div className='vehicles-page'>
      {/* Use standard header */}
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faCar} /> {vehicle?.name ?? 'Vehicle Details'}
          </h2>
          <div className='breadcrumbs'>
            <Link
              to='/dashboard'
              className='breadcrumb-link'
            >
              Dashboard
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <Link
              to='/vehicles'
              className='breadcrumb-link'
            >
              Vehicles
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>View</span>
          </div>
        </div>
        {/* Use standard header actions container */}
        <div className='header-actions'>
          {user?.role === 'employer' && (
            <button
              className='btn btn-success'
              onClick={handleCreateReviewClick}
            >
              <FontAwesomeIcon icon={faPlus} /> Create Review
            </button>
          )}
          <button
            className='btn btn-purple' // Use consistent class
            onClick={toggleSendReport}
            aria-expanded={showSendReport}
            aria-controls="send-report-options-view" // Unique ID for ARIA
          >
            <FontAwesomeIcon icon={faPaperPlane} /> Send Report
          </button>
          <button
            className='btn btn-danger' // Use consistent class
            onClick={toggleDownloadReport}
            aria-expanded={showDateRangePicker}
            aria-controls="download-report-options-view" // Unique ID for ARIA
          >
            <FontAwesomeIcon icon={faDownload} /> Download Report
          </button>
        </div>
      </div>

      {/* Report Options Containers */}
      {showSendReport && (
        <div id="send-report-options-view" className='report-options-container send-report-container'>
          <h4>Send Vehicle Report</h4>
          {sendError && (
            <p className='error-text'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {sendError}
            </p>
          )}
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
              onChange={(e) => {
                setSendEmail(e.target.value);
                setSendError(null);
              }}
              aria-label='Recipient Email'
              required
            />
            <button
              className='btn btn-purple' // Use consistent class
              onClick={handleSendVehicleReport}
              disabled={sending || !startDate || !endDate || !sendEmail || !/\S+@\S+\.\S+/.test(sendEmail)}
            >
              {sending ? (
                <> <FontAwesomeIcon icon={faSpinner} spin /> Sending... </>
              ) : (
                <> <FontAwesomeIcon icon={faPaperPlane} /> Send </>
              )}
            </button>
          </div>
        </div>
      )}

      {showDateRangePicker && (
        <div id="download-report-options-view" className='report-options-container download-date-range'>
          <h4>Download Vehicle Report</h4>
          {downloadError && (
            <p className='error-text'>
              <FontAwesomeIcon icon={faExclamationCircle} /> {downloadError}
            </p>
          )}
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
            className='btn btn-danger' // Use consistent class
            onClick={handleDownloadExcelReport}
            disabled={downloading || !startDate || !endDate}
          >
            {downloading ? (
              <> <FontAwesomeIcon icon={faSpinner} spin /> Downloading... </>
            ) : (
              <> <FontAwesomeIcon icon={faDownload} /> Download Excel </>
            )}
          </button>
        </div>
      )}

      {/* Display general errors below report options */}
      {error && (
        <div className='error-message' style={{ marginBottom: '1.5rem' }}>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
        </div>
      )}

      {/* Use standard search bar */}
      <div className='vehicles-search'>
        <input
          type='text'
          placeholder='Search Reviews by Employee...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label='Search Reviews'
        />
        <FontAwesomeIcon
          icon={faSearch}
          className='search-icon'
        />
      </div>

      {/* Use standard grid structure */}
      <div className='vehicles-grid'>
        {/* Header Row */}
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

        {/* Loading state specific to the grid */}
        {loading && vehicleHistory.length === 0 && (
          <div className='loading-indicator' style={{ gridColumn: '1 / -1' }}>
            <FontAwesomeIcon icon={faSpinner} spin /> Loading history...
          </div>
        )}

        {/* Data Rows */}
        {!loading && filteredHistory.length === 0 ? (
          <div className='vehicles-row no-results'>
            {vehicleHistory.length === 0 ? 'No reviews found for this vehicle.' : 'No reviews match your search criteria.'}
          </div>
        ) : (
          !loading &&
          filteredHistory.map((item) => (
            <div
              key={item._id}
              // Use standard row and card classes
              className='vehicles-row vehicle-card'
              style={{ gridTemplateColumns: gridColumns }}
            >
              <div data-label='Date'>
                {item.dateReviewed
                  ? new Date(item.dateReviewed).toLocaleDateString()
                  : '--'}
              </div>
              <div data-label='Employee'>{item.employeeId?.name || '--'}</div>
              <div data-label='WOF/Rego'>{vehicle?.wofRego ?? '--'}</div>
              <div data-label='Oil Checked'>
                <FontAwesomeIcon
                  icon={item.oilChecked ? faCheck : faTimes}
                  className={item.oilChecked ? 'icon-green' : 'icon-red'}
                />
              </div>
              <div data-label='Vehicle Checked'>
                <FontAwesomeIcon
                  icon={item.vehicleChecked ? faCheck : faTimes}
                  className={item.vehicleChecked ? 'icon-green' : 'icon-red'}
                />
              </div>
              <div data-label='Vehicle Broken'>
                {item.vehicleBroken ? 'Yes' : 'No'}
              </div>
              <div data-label='Hours'>{item.hours || '--'}</div>
              <div
                data-label='Actions'
                className='actions' // Standard actions class
              >
                <button
                  onClick={() => handleViewReviewClick(item)}
                  className='btn-icon btn-icon-blue'
                  title='View Review Details'
                  aria-label={`View review by ${item.employeeId?.name || 'employee'}`}
                >
                  <FontAwesomeIcon icon={faEye} />
                </button>
                {(user?.role === 'employer' ||
                  user?.name === item.employeeId?.name) && (
                  <Link
                    to={`/vehicles/${vehicleId}/reviews/${item._id}/edit`}
                    className='btn-icon btn-icon-yellow'
                    title='Edit Review'
                    aria-label={`Edit review by ${item.employeeId?.name || 'employee'}`}
                  >
                    <FontAwesomeIcon icon={faPen} />
                  </Link>
                )}
                {(user?.role === 'employer' ||
                  user?.name === item.employeeId?.name) && (
                  <button
                    onClick={() =>
                      handleDeleteReview(item._id, item.employeeId?.name)
                    }
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
    </div>
  );
};

export default ViewVehicle;
