import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faPaperPlane,
  faSpinner,
  faExclamationCircle,
  faClipboardList,
  faCar,
  faCalendarAlt, // Added for consistency if needed elsewhere
  faUser, // Added for consistency if needed elsewhere
  faCheck,
  faTimes,
  faStickyNote,
  faRulerVertical,
  faGasPump,
  faWrench,
  faSearch, // Keep search icon
  faFileContract, // Keep specific icon
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker'; // Keep DatePicker
import 'react-datepicker/dist/react-datepicker.css';
// Import the dedicated SCSS file
import '../../styles/ViewReview.scss'; // Use ViewReview.scss

const API_URL =
  process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

const ViewReview = () => {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep prompt states
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [email, setEmail] = useState('');
  const [emailFormat, setEmailFormat] = useState('pdf');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  useEffect(() => {
    const fetchReview = async () => {
      setLoading(true);
      setError(null);
      setSendError(null);
      setDownloadError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Authentication required.');

        const res = await axios.get(`${API_URL}/vehicles/reviews/${reviewId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReviewData(res.data);
      } catch (err) {
        console.error('Error fetching review:', err);
        setError(err.response?.data?.message || 'Failed to load review data.');
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [reviewId, navigate]);

  const formattedDate = reviewData?.dateReviewed
    ? new Date(reviewData.dateReviewed).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '--';

  const handleDownload = async (format) => {
    setDownloadError(null);
    setDownloading(true);
    setError(null); // Clear main error
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/vehicles/reviews/${reviewId}/download?format=${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );

      if (response?.data) {
        const contentType =
          format === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const blob = new Blob([response.data], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeVehicleName =
          reviewData?.vehicle?.name?.replace(/\s+/g, '_') || 'vehicle';
        const safeEmployeeName =
          reviewData?.employeeId?.name?.replace(/\s+/g, '_') || 'employee';
        const safeDate = reviewData?.dateReviewed?.split('T')[0] || 'date';
        link.setAttribute(
          'download',
          `Review_${safeVehicleName}_${safeEmployeeName}_${safeDate}.${
            format === 'pdf' ? 'pdf' : 'xlsx'
          }`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setShowDownloadPrompt(false); // Close prompt on success
      } else {
        throw new Error('No data received for download.');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      setDownloadError(error.response?.data?.message || 'Failed to download report.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setSendError('Please enter a valid email address.');
      return;
    }

    setSendError(null);
    setSending(true);
    setError(null); // Clear main error

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/vehicles/reviews/report/email/${reviewId}`,
        { email, format: emailFormat },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowEmailPrompt(false); // Close prompt on success
      setEmail('');
    } catch (error) {
      console.error('Error sending email:', error);
      setSendError(error.response?.data?.message || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className='loading-indicator page-loading'>
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          size='2x'
        />
        <p>Loading Review...</p>
      </div>
    );
  }

  if (error && !reviewData) { // Show full page error only if reviewData failed to load
    return (
      <div className='error-message page-error'>
        <FontAwesomeIcon icon={faExclamationCircle} />
        <p>{error}</p>
        <Link
          to={
            reviewData?.vehicle?._id // Try to link back to specific vehicle if possible
              ? `/vehicles/view/${reviewData.vehicle._id}`
              : '/vehicles'
          }
          className='btn btn-secondary'
        >
          Back
        </Link>
      </div>
    );
  }

  if (!reviewData) { // Handle case where loading finished but no data (should be rare if error handling works)
    return (
      <div className='error-message page-error'>
        <FontAwesomeIcon icon={faExclamationCircle} />
        <p>Review data not found.</p>
        <Link
          to='/vehicles'
          className='btn btn-secondary'
        >
          Back to Vehicles
        </Link>
      </div>
    );
  }

  const vehicleTargetId = reviewData.vehicle?._id || reviewData.vehicle;

  return (
    // Use standard page class
    <div className='vehicles-page'>
      {/* Use standard header */}
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faClipboardList} /> Review Details
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
            {vehicleTargetId && (
              <>
                <span className='breadcrumb-separator'> / </span>
                <Link
                  to={`/vehicles/view/${vehicleTargetId}`}
                  className='breadcrumb-link'
                >
                  {reviewData.vehicle?.name ?? 'View Vehicle'}
                </Link>
              </>
            )}
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>View Review</span>
          </div>
        </div>
        {/* Use standard header actions */}
        <div className='header-actions'>
          <button
            className='btn btn-purple' // Use standard class
            onClick={() => setShowEmailPrompt(true)}
            aria-controls="email-prompt-view-review"
            aria-expanded={showEmailPrompt}
          >
            <FontAwesomeIcon icon={faPaperPlane} /> Send Report
          </button>
          <button
            className='btn btn-danger' // Use standard class
            onClick={() => setShowDownloadPrompt(true)}
            aria-controls="download-prompt-view-review"
            aria-expanded={showDownloadPrompt}
          >
            <FontAwesomeIcon icon={faDownload} /> Download Report
          </button>
        </div>
      </div>

      {/* Removed the old view-review-actions div */}

      {/* Download Prompt */}
      {showDownloadPrompt && (
        <div className='prompt-overlay'>
          <div id="download-prompt-view-review" className='prompt-container'>
            <h4 className='prompt-title'>Choose Download Format</h4>
            {downloadError && (
              <p className='error-text'>
                <FontAwesomeIcon icon={faExclamationCircle} /> {downloadError}
              </p>
            )}
            <div className='prompt-actions'>
              <button
                className='btn btn-primary' // Standard class
                onClick={() => handleDownload('pdf')}
                disabled={downloading}
              >
                {downloading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'PDF'}
              </button>
              <button
                className='btn btn-success' // Standard class
                onClick={() => handleDownload('excel')}
                disabled={downloading}
              >
                {downloading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Excel'}
              </button>
              <button
                className='btn btn-secondary' // Use secondary for cancel
                onClick={() => setShowDownloadPrompt(false)}
                disabled={downloading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Prompt */}
      {showEmailPrompt && (
        <div className='prompt-overlay'>
          <div id="email-prompt-view-review" className='prompt-container'>
            <h4 className='prompt-title'>Send Report via Email</h4>
            {sendError && (
              <p className='error-text'>
                <FontAwesomeIcon icon={faExclamationCircle} /> {sendError}
              </p>
            )}
            <input
              type='email'
              placeholder='Enter recipient email'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSendError(null);
              }}
              className='prompt-input'
              aria-label='Recipient Email'
              required
            />
            <div className='format-options'>
              <label>
                <input
                  type='radio'
                  name='format'
                  value='pdf'
                  checked={emailFormat === 'pdf'}
                  onChange={() => setEmailFormat('pdf')}
                />
                PDF
              </label>
              <label>
                <input
                  type='radio'
                  name='format'
                  value='excel'
                  checked={emailFormat === 'excel'}
                  onChange={() => setEmailFormat('excel')}
                />
                Excel
              </label>
            </div>
            <div className='prompt-actions'>
              <button
                className='btn btn-purple' // Standard class
                onClick={handleSendEmail}
                disabled={sending || !email || !/\S+@\S+\.\S+/.test(email)}
              >
                {sending ? (
                  <> <FontAwesomeIcon icon={faSpinner} spin /> Sending... </>
                ) : (
                  'Send Email'
                )}
              </button>
              <button
                className='btn btn-secondary' // Use secondary for cancel
                onClick={() => setShowEmailPrompt(false)}
                disabled={sending}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Display general errors below header/prompts */}
       {error && (
        <div className='error-message' style={{ marginBottom: '1.5rem' }}>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{error}</p>
        </div>
      )}

      {/* Keep specific content structure for ViewReview */}
      <div className='view-review-top-info'>
        <h3 className='vehicle-name'>
          <FontAwesomeIcon icon={faCar} /> {reviewData.vehicle?.name || 'N/A'}
        </h3>
        <div className='date-employee-info'>
          <div className='info-item'>
            <span className='info-label'>Date Reviewed</span>
            <span className='info-value'>{formattedDate}</span>
          </div>
          <div className='info-item'>
            <span className='info-label'>Employee</span>
            <span className='info-value'>
              {reviewData.employeeId?.name || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className='view-review-details-container'>
        <div className='detail-item'>
          <span className='detail-label'>
            <FontAwesomeIcon icon={faFileContract} /> WOF/Rego
          </span>
          <span className='detail-value'>
            {reviewData.vehicle?.wofRego || '--'}
          </span>
        </div>
        <div className='detail-item'>
          <span className='detail-label'>
            <FontAwesomeIcon icon={faGasPump} /> Oil Checked
          </span>
          <span className={`detail-value status ${reviewData.oilChecked ? 'status-yes' : 'status-no'}`}>
            <FontAwesomeIcon icon={reviewData.oilChecked ? faCheck : faTimes} />{' '}
            {reviewData.oilChecked ? 'Yes' : 'No'}
          </span>
        </div>
        <div className='detail-item'>
          <span className='detail-label'>
            <FontAwesomeIcon icon={faSearch} /> Vehicle Checked
          </span>
          <span className={`detail-value status ${reviewData.vehicleChecked ? 'status-yes' : 'status-no'}`}>
            <FontAwesomeIcon icon={reviewData.vehicleChecked ? faCheck : faTimes} />{' '}
            {reviewData.vehicleChecked ? 'Yes' : 'No'}
          </span>
        </div>
        <div className='detail-item'>
          <span className='detail-label'>
            <FontAwesomeIcon icon={faWrench} /> Vehicle Broken/Issues
          </span>
          <span className={`detail-value status ${reviewData.vehicleBroken ? 'status-no' : 'status-yes'}`}>
            {/* Note: Icon logic reversed here compared to others */}
            <FontAwesomeIcon icon={reviewData.vehicleBroken ? faTimes : faCheck} />{' '}
            {reviewData.vehicleBroken ? 'Yes' : 'No'}
          </span>
        </div>
        <div className='detail-item'>
          <span className='detail-label'>
            <FontAwesomeIcon icon={faRulerVertical} /> Hours Recorded
          </span>
          <span className='detail-value'>{reviewData.hours || '--'} hrs</span>
        </div>
        <div className='detail-item detail-item-full'> {/* Added class for full width */}
          <span className='detail-label'>
            <FontAwesomeIcon icon={faStickyNote} /> Notes
          </span>
          <span className='detail-value notes-value'>
            {reviewData.notes || 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ViewReview;
