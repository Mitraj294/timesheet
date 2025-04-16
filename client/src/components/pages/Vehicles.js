import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const Vehicles = () => {
  // State for report sending
  const [sendEmail, setSendEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [showSendReport, setShowSendReport] = useState(false);

  // State for vehicles and search
  const [vehicles, setVehicles] = useState([]);
  const [search, setSearch] = useState('');
  
  // State for date range used by both report functions
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Toggle for download section
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/vehicles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicles(res.data);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        if (err.response?.status === 401) {
          alert('Unauthorized. Please log in again.');
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          alert('Failed to fetch vehicles. Please try again later.');
        }
      }
    };

    fetchVehicles();
  }, [navigate]);

  const handleDownloadReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select a start and end date for the download report.');
      return;
    }

    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/vehicles/download/all`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all_vehicles_report_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendReport = async () => {
    if (!startDate || !endDate || !sendEmail) {
      alert('Please select a date range and enter an email address.');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/vehicles/send-report`,
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          email: sendEmail,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('Report sent successfully!');
      setSendEmail('');
    } catch (err) {
      console.error('Error sending report:', err);
      alert('Failed to send report.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/vehicles/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles((prev) => prev.filter((v) => v._id !== vehicleId));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Failed to delete vehicle.');
    }
  };

  return (
    <div className="vehicles-page">
      <div className="vehicles-header">
        <h4>Vehicles</h4>
        <div className="breadcrumbs">
          <Link to="/employer/dashboard">Dashboard</Link> / Vehicles
        </div>
      </div>

      <div className="vehicles-actions">
        <Link to="/employer/vehicles/create" className="btn btn-green">
          <FontAwesomeIcon icon={faPlus} /> Create Vehicle
        </Link>
        <button
          className="btn btn-purple"
          onClick={() => setShowSendReport(!showSendReport)}
        >
          <FontAwesomeIcon icon={faPaperPlane} /> Send Report
        </button>
        <button
          className="btn btn-red"
          onClick={() => setShowDateRangePicker(!showDateRangePicker)}
        >
          <FontAwesomeIcon icon={faDownload} /> Download Report
        </button>
      </div>

      {/* Send Report Section */}
      {showSendReport && (
        <div className="send-report-container">
          <div className="date-picker-range">
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText="Start Date"
              dateFormat="yyyy-MM-dd"
            />
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              placeholderText="End Date"
              dateFormat="yyyy-MM-dd"
              minDate={startDate}
            />
          </div>
          <div className="send-report-email">
            <input
              type="email"
              placeholder="Enter recipient email"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
            />
            <button
              className="btn btn-purple"
              onClick={handleSendReport}
              disabled={sending}
            >
              <FontAwesomeIcon icon={faPaperPlane} /> {sending ? 'Sending...' : 'Send Report'}
            </button>
          </div>
        </div>
      )}

      {/* Download Report Section */}
      {showDateRangePicker && (
        <div className="download-date-range">
          <div className="date-picker-range">
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText="Start Date"
              dateFormat="yyyy-MM-dd"
            />
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              placeholderText="End Date"
              dateFormat="yyyy-MM-dd"
              minDate={startDate}
            />
          </div>
          <button className="btn btn-blue" onClick={handleDownloadReport}>
            <FontAwesomeIcon icon={faDownload} /> Download Excel
          </button>
          {downloading && <p>Generating report, please wait...</p>}
        </div>
      )}

      <div className="vehicles-search">
        <input
          type="text"
          placeholder="Search for a Vehicle"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
      </div>

      <div className="vehicles-grid">
        <div className="vehicles-row header">
          <div>Date Created</div>
          <div>Vehicle Name</div>
          <div>Hours</div>
          <div>WOF/Rego</div>
          <div>Actions</div>
        </div>
        {vehicles.length === 0 ? (
          <div className="vehicles-row no-results">No vehicles found.</div>
        ) : (
          vehicles
            .filter((v) =>
              v.name?.toLowerCase().includes(search.toLowerCase())
            )
            .map((vehicle) => (
              <div key={vehicle._id} className="vehicles-row">
                <div>{vehicle.createdAt?.split('T')[0]}</div>
                <div>{vehicle.name}</div>
                <div>{vehicle.hours || '--'}</div>
                <div>{vehicle.wofRego || '--'}</div>
                <div className="actions">
                  <Link to={`/vehicles/view/${vehicle._id}`} className="btn-icon">
                    <FontAwesomeIcon icon={faEye} />
                  </Link>
                  <Link to={`/vehicles/update/${vehicle._id}`} className="btn-icon">
                    <FontAwesomeIcon icon={faPen} />
                  </Link>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDeleteVehicle(vehicle._id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default Vehicles;
