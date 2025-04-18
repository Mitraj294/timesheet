import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faDownload,
  faPlus,
  faEye,
  faSearch,
  faCheck,
  faTimes,
  faPen,
  faTrash,
  faPaperPlane,
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/Vehicles.scss';

const ViewVehicle = () => {
    const [sendEmail, setSendEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [showSendReport, setShowSendReport] = useState(false);

  const { vehicleId } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicleWithReviews = async () => {
      try {
        const token = localStorage.getItem('token');
        const vehicleRes = await axios.get(`http://localhost:5000/api/vehicles/${vehicleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicle(vehicleRes.data);

        const reviewsRes = await axios.get(
          `http://localhost:5000/api/vehicles/vehicle/${vehicleId}/reviews`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setVehicleHistory(reviewsRes.data.reviews);
      } catch (err) {
        console.error('Error fetching vehicle with reviews:', err);
        alert('Failed to load vehicle or reviews.');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleWithReviews();
  }, [vehicleId]);

  const filteredHistory = vehicleHistory.filter((entry) => {
    const employeeName = entry.employeeId?.name?.toLowerCase() || '';
    return employeeName.includes(search.toLowerCase());
  });

  const handleCreateReviewClick = () => {
    navigate(`/vehicles/${vehicleId}/review`);
  };

  const handleDeleteReview = async (reviewId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this review? This action cannot be undone.');
    if (!confirmDelete) return;
  
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/vehicles/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicleHistory((prev) => prev.filter((review) => review._id !== reviewId));
    } catch (err) {
      console.error('Error deleting review:', err);
      alert('Error deleting review');
    }
  };
  ;

  const handleViewReviewClick = (item) => {
    navigate(`/vehicles/reviews/${item._id}/view`);
  };

  const handleDownloadExcelReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select a start and end date.');
      return;
    }

    setDownloading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/vehicles/${vehicleId}/download-report`,
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
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vehicle?.name?.replace(/\s+/g, '_') || 'vehicle'}_report_${startDate.toLocaleDateString()}_to_${endDate.toLocaleDateString()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel report:', error);
      alert('Failed to download report.');
    } finally {
      setDownloading(false);
    }
  };
  const handleSendVehicleReport = async () => {
    if (!startDate || !endDate || !sendEmail) {
      alert('Please select a date range and enter an email address.');
      return;
    }
  
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Sending vehicle report for vehicleId:', vehicleId);  // Log the vehicleId
  
      await axios.post(
        `http://localhost:5000/api/vehicles/report/email/${vehicleId}`,
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          email: sendEmail,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
  
      alert('Vehicle report sent successfully via email.');
      setSendEmail('');
    } catch (error) {
      console.error('Error sending report:', error);
      alert('An error occurred while sending the report.');
    } finally {
      setSending(false);
    }
  };
  
  
  


  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="vehicles-page">
      <div className="vehicles-header">
        <h4>View Vehicle</h4>
        <div className="breadcrumbs">
          <Link to="/dashboard">Dashboard</Link>
          <span>/</span>
          <Link to="/vehicles">Vehicles</Link>
          <span>/</span>
          <span>View Vehicle</span>
        </div>
      </div>

      <div className="vehicles-actions">
        <button className="btn btn-green" onClick={handleCreateReviewClick}>
          <FontAwesomeIcon icon={faPlus} /> Create Review
        </button>
              <button
                  className="btn btn-purple"
                  onClick={() => setShowSendReport(!showSendReport)}
                >
                  <FontAwesomeIcon icon={faPaperPlane} /> Send Report
                </button>
        
        <button className="btn btn-red" onClick={() => setShowDateRangePicker(!showDateRangePicker)}>
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
              onClick={handleSendVehicleReport}
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
          <button className="btn btn-blue" onClick={handleDownloadExcelReport}>
            <FontAwesomeIcon icon={faDownload} /> Download Excel
          </button>
          {downloading && <p>Generating report, please wait...</p>}
        </div>
      )}

      <div className="vehicle-name-section">
        <h2 className="vehicle-name-heading">{vehicle?.name ?? 'Vehicle'}</h2>
      </div>

      <div className="vehicles-search">
        <input
          type="text"
          placeholder="Search by Employee"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
      </div>

      <div className="vehicles-grid">
        <div className="vehicles-row header">
          <div>Date</div>
          <div>Employee Name</div>
          <div>WOF/Rego</div>
          <div>Oil Checked</div>
          <div>Vehicle Checked</div>
          <div>Vehicle Broken</div>
          <div>Hours</div>
          <div>Action</div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="no-reviews-message">No reviews found for the employee: {search}</div>
        ) : (
          filteredHistory.map((item) => (
            <div key={item._id} className="vehicles-row">
              <div>{item.dateReviewed ? new Date(item.dateReviewed).toLocaleDateString() : '--'}</div>
              <div>{item.employeeId?.name || '--'}</div>
              <div>{item.vehicle?.wofRego ?? 'N/A'}</div>
              <div>
                <FontAwesomeIcon
                  icon={item.oilChecked ? faCheck : faTimes}
                  className={item.oilChecked ? 'green' : 'red'}
                />
              </div>
              <div>
                <FontAwesomeIcon
                  icon={item.vehicleChecked ? faCheck : faTimes}
                  className={item.vehicleChecked ? 'green' : 'red'}
                />
              </div>
              <div>{item.vehicleBroken ? 'Yes' : 'No'}</div>
              <div>{item.hours || '--'}</div>
              <div className="action-buttons">
                <button onClick={() => handleViewReviewClick(item)}>
                  <FontAwesomeIcon icon={faEye} className="eye-icon" />
                </button>
                <button>
                  <Link to={`/vehicles/${vehicleId}/reviews/${item._id}/edit`}>
                    <FontAwesomeIcon icon={faPen} className="edit-icon" />
                  </Link>
                </button>
                <button onClick={() => handleDeleteReview(item._id)} className="btn-icon btn-red">
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

export default ViewVehicle;
