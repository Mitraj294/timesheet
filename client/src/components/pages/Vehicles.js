import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import '../../styles/Vehicles.scss';
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

const API_URL =
  process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [showSendReport, setShowSendReport] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const { user } = useSelector((state) => state.auth || {});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicles = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found.');

        const res = await axios.get(`${API_URL}/vehicles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicles(res.data || []);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError(err.message || 'Failed to fetch vehicles.');
        if (
          err.response?.status === 401 ||
          err.message === 'No authentication token found.'
        ) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [navigate]);

  const handleDownloadReport = async () => {
    if (!startDate || !endDate) {
      setDownloadError('Please select a start and end date.');
      return;
    }
    setDownloadError(null);
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/vehicles/download/all`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      link.download = `vehicles_report_${formattedStartDate}_to_${formattedEndDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      setDownloadError('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendReport = async () => {
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
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/vehicles/send-report`,
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
    } catch (err) {
      console.error('Error sending report:', err);
      setSendError(err.response?.data?.message || 'Failed to send report.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId, vehicleName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete vehicle "${vehicleName}"?`
      )
    )
      return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/vehicles/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles((prev) => prev.filter((v) => v._id !== vehicleId));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setError(`Failed to delete vehicle "${vehicleName}".`);
    }
  };

  const filteredVehicles = vehicles.filter((v) =>
    v?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className='vehicles-page'>
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faCar} /> Vehicles
          </h2>
          <div className='breadcrumbs'>
            <Link
              to='/dashboard'
              className='breadcrumb-link'
            >
              Dashboard
            </Link>
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>Vehicles</span>
          </div>
        </div>
      </div>

      <div className='vehicles-actions'>
        {user?.role === 'employer' && (
          <Link
            to='/employer/vehicles/create'
            className='btn btn-primary'
          >
            <FontAwesomeIcon icon={faPlus} /> Create Vehicle
          </Link>
        )}
        <button
          className='btn btn-send-report'
          onClick={() => {
            setShowSendReport(!showSendReport);
            setShowDateRangePicker(false);
          }}
          aria-expanded={showSendReport}
        >
          <FontAwesomeIcon icon={faPaperPlane} /> Send Report
        </button>
        <button
          className='btn btn-download-report'
          onClick={() => {
            setShowDateRangePicker(!showDateRangePicker);
            setShowSendReport(false);
          }}
          aria-expanded={showDateRangePicker}
        >
          <FontAwesomeIcon icon={faDownload} /> Download Report
        </button>
      </div>

      {showSendReport && (
        <div className='report-options-container send-report-container'>
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
            />
            <button
              className='btn btn-send-report'
              onClick={handleSendReport}
              disabled={sending || !startDate || !endDate || !sendEmail}
            >
              {sending ? (
                <>
                  <FontAwesomeIcon
                    icon={faSpinner}
                    spin
                  />{' '}
                  Sending...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} /> Send
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showDateRangePicker && (
        <div className='report-options-container download-date-range'>
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
            />
          </div>
          <button
            className='btn btn-download-report'
            onClick={handleDownloadReport}
            disabled={downloading || !startDate || !endDate}
          >
            {downloading ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinner}
                  spin
                />{' '}
                Downloading...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faDownload} /> Download Excel
              </>
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
        <FontAwesomeIcon
          icon={faSearch}
          className='search-icon'
        />
      </div>

      {loading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            size='2x'
          />
          <p>Loading vehicles...</p>
        </div>
      )}
      {error && !loading && (
        <div className='error-message'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
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
              No vehicles match your search.
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <div
                key={vehicle._id}
                className='vehicles-row vehicle-card'
              >
                <div data-label='Created'>
                  {vehicle.createdAt
                    ? new Date(vehicle.createdAt).toLocaleDateString()
                    : '--'}
                </div>
                <div data-label='Name'>{vehicle.name || '--'}</div>
                <div data-label='Hours'>{vehicle.hours || '--'}</div>
                <div data-label='WOF/Rego'>{vehicle.wofRego || '--'}</div>
                <div
                  data-label='Actions'
                  className='actions'
                >
                  <Link
                    to={`/vehicles/view/${vehicle._id}`}
                    className='btn-icon btn-icon-blue'
                    title='View Details'
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </Link>
                  {user?.role === 'employer' && (
                    <Link
                      to={`/vehicles/update/${vehicle._id}`}
                      className='btn-icon btn-icon-yellow'
                      title='Edit Vehicle'
                    >
                      <FontAwesomeIcon icon={faPen} />
                    </Link>
                  )}
                  {user?.role === 'employer' && (
                    <button
                      className='btn-icon btn-icon-red'
                      onClick={() =>
                        handleDeleteVehicle(vehicle._id, vehicle.name)
                      }
                      title='Delete Vehicle'
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
    </div>
  );
};

export default Vehicles;
//