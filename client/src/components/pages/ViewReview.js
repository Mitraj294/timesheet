import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import '../../styles/Vehicles.scss';

const ViewReview = () => {
  const { reviewId } = useParams();
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [email, setEmail] = useState('');
  const [emailFormat, setEmailFormat] = useState('pdf');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/vehicles/reviews/${reviewId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReviewData(res.data);
      } catch (error) {
        console.error('Error fetching review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [reviewId]);

  if (loading) return <div>Loading...</div>;
  if (!reviewData) return <p>Review data not found.</p>;

  const formattedDate = new Date(reviewData.dateReviewed).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handleDownload = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/vehicles/reviews/${reviewId}/download?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      if (response && response.data) {
        const url = window.URL.createObjectURL(new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `VehicleReview-${reviewId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      alert('Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/vehicles/reviews/report/email/${reviewId}`,
        { email, format: emailFormat },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Email sent successfully!');
      setShowEmailPrompt(false);
      setEmail('');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const openDownloadPrompt = () => setShowDownloadPrompt(true);
  const closeDownloadPrompt = () => setShowDownloadPrompt(false);

  const openEmailPrompt = () => setShowEmailPrompt(true);
  const closeEmailPrompt = () => setShowEmailPrompt(false);

  return (
    <div className="vehicles-page view-review">
      <div className="vehicles-header">
        <h4>View Review</h4>
        <div className="breadcrumbs">
          <Link to="/dashboard">Dashboard</Link> /
          <Link to="/vehicles"> Vehicles</Link> /
          <Link to={`/vehicles/view/${reviewData.vehicleId?._id || reviewData.vehicleId}`}>View Vehicle</Link> /
          View Review
        </div>

        <div className="view-review-header">
          <div className="right">
            <button className="btn btn-purple" onClick={openEmailPrompt}>Send Report</button>
            <button className="btn btn-red" onClick={openDownloadPrompt}>Download Report</button>
          </div>
        </div>
      </div>

      {/* Prompt for choosing download format */}
      {showDownloadPrompt && (
        <div className="download-prompt">
          <h4>Choose Report Format</h4>
          <button className="btn btn-green" onClick={() => handleDownload('pdf')}>Download as PDF</button>
          <button className="btn btn-blue" onClick={() => handleDownload('excel')}>Download as Excel</button>
          <button className="btn btn-gray" onClick={closeDownloadPrompt}>Cancel</button>
        </div>
      )}

      {/* Prompt for sending email */}
      {showEmailPrompt && (
        <div className="download-prompt">
          <h4>Send Report via Email</h4>
          <input
            type="email"
            placeholder="Enter recipient email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-email"
          />
          <div className="format-options">
            <label>
              <input
                type="radio"
                name="format"
                value="pdf"
                checked={emailFormat === 'pdf'}
                onChange={() => setEmailFormat('pdf')}
              />
              PDF
            </label>
            <label>
              <input
                type="radio"
                name="format"
                value="excel"
                checked={emailFormat === 'excel'}
                onChange={() => setEmailFormat('excel')}
              />
              Excel
            </label>
          </div>
          <div className="email-actions">
            <button className="btn btn-green" onClick={handleSendEmail} disabled={sending}>
              {sending ? 'Sending...' : 'Send Email'}
            </button>
            <button className="btn btn-gray" onClick={closeEmailPrompt} disabled={sending}>Cancel</button>
          </div>
        </div>
      )}

      {/* Review details */}
      <div className="view-review-header">
        <div className="left">
          <h1>{reviewData.vehicle?.name || 'Unnamed Vehicle'}</h1>
        </div>
        <div className="middle">
          <div className="review-meta">
            <div>
              <p>Date Reviewed</p>
              <h4>{formattedDate}</h4>
            </div>
            <div>
              <p>Name of Employee</p>
              <h4>{reviewData.employeeId?.name || 'Unknown Employee'}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Review fields */}
      <div className="review-table">
        <div className="row">
          <div className="label">WOF/Rego</div>
          <div className="value bold">{reviewData.wofRego || 'N/A'}</div>
        </div>
        <div className="row">
          <div className="label">Oil Checked</div>
          <div className="value status">
            <span className={reviewData.oilChecked ? 'green' : 'red'}>
              {reviewData.oilChecked ? '✔ YES' : '✘ NO'}
            </span>
          </div>
        </div>
        <div className="row">
          <div className="label">Vehicle Checked</div>
          <div className="value status">
            <span className={reviewData.vehicleChecked ? 'green' : 'red'}>
              {reviewData.vehicleChecked ? '✔ YES' : '✘ NO'}
            </span>
          </div>
        </div>
        <div className="row">
          <div className="label">Vehicle Broken</div>
          <div className="value status">
            <span className={reviewData.vehicleBroken ? 'red' : 'green'}>
              {reviewData.vehicleBroken ? '✘ YES' : '✔ NO'}
            </span>
          </div>
        </div>
        <div className="row">
          <div className="label">Hours Used</div>
          <div className="value bold">{reviewData.hours || '--'} hrs</div>
        </div>
        <div className="row">
          <div className="label">Other Notes</div>
          <div className="value bold">{reviewData.notes || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};

export default ViewReview;
