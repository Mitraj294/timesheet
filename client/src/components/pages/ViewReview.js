// /home/digilab/timesheet/client/src/components/pages/ViewReview.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faPaperPlane,
  faSpinner,
  faExclamationCircle,
  faClipboardList,
  faCar,
  faCalendarAlt,
  faUser,
  faCheck,
  faTimes,
  faStickyNote,
  faRulerVertical,
  faGasPump,
  faWrench,
  faSearch,
  faFileContract,
} from '@fortawesome/free-solid-svg-icons';
import {
  fetchReviewById,
  downloadReviewReport,
  sendReviewReportByClient,
  selectCurrentReviewData,
  selectCurrentReviewStatus,
  selectCurrentReviewError,
  selectReviewReportStatus,
  selectReviewReportError,
  resetCurrentReview,
  clearReviewReportStatus,
} from '../../redux/slices/vehicleReviewSlice';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import '../../styles/ViewReview.scss';

const ViewReview = () => {
  const { reviewId } = useParams();
  const navigate = useNavigate();

  // Local component state
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [email, setEmail] = useState('');

  const dispatch = useDispatch();

  // Redux state selectors
  const reviewData = useSelector(selectCurrentReviewData);
  const fetchStatus = useSelector(selectCurrentReviewStatus);
  const fetchError = useSelector(selectCurrentReviewError);
  const reportStatus = useSelector(selectReviewReportStatus);
  const reportError = useSelector(selectReviewReportError);

  // Effects
  // Fetches the specific review data when the component mounts or reviewId changes
  useEffect(() => {
    dispatch(fetchReviewById(reviewId))
      .unwrap()
      .catch(err => {
        console.error('Failed to fetch review:', err);
        if (err?.message?.includes('401') || err?.message?.includes('403')) {
          navigate('/login');
        }
      });

    // Cleanup when component unmounts or reviewId changes
    return () => {
      dispatch(resetCurrentReview());
      dispatch(clearReviewReportStatus());
    };
  }, [reviewId, navigate, dispatch]);

  // Displays errors from Redux state (fetch or report generation) as alerts
  useEffect(() => {
    const reduxError = fetchError || reportError;
    if (reduxError) {
      dispatch(setAlert(reduxError, 'danger'));
    }
  }, [fetchError, reportError, dispatch]);
  const formattedDate = reviewData?.dateReviewed
    ? new Date(reviewData.dateReviewed).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '--';

    // Handlers
    // Handles downloading the review report (PDF or Excel)
    const handleDownload = async (format) => {
      dispatch(clearReviewReportStatus());

      try {
        // Dispatch the thunk and unwrap the result.
        // The `unwrap()` method will return the fulfilled value or throw an error.
        const { blob, filename } = await dispatch(downloadReviewReport({ reviewId, format })).unwrap();

        // The warning occurs because the above line, when successful, dispatches
        // an action like { type: 'vehicleReviews/downloadReport/fulfilled', payload: { blob, filename } }
        // and the `blob` in the payload is non-serializable.

        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename || `review_${reviewId}.${format}`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          setShowDownloadPrompt(false);
          dispatch(setAlert(`Review report (${format}) downloaded successfully.`, 'success'));
        } else {
          throw new Error('No data received for download.');
        }
      } catch (error) {
        // Errors from unwrap() or other issues will be caught here.
        // The error alert is handled by the useEffect watching reportError.
        console.error('Error downloading report:', error);
      }
    };

  // Handles sending the review report via email
  const handleSendEmail = async (format) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      dispatch(setAlert('Please enter a valid email address.', 'warning'));
      return;
    }
    dispatch(clearReviewReportStatus());
    try {
      // Pass the selected format to the thunk
      await dispatch(sendReviewReportByClient({ reviewId, email, format })).unwrap();
      setShowEmailPrompt(false);
      setEmail('');
      dispatch(setAlert(`Review report sent successfully to ${email}.`, 'success'));
    } catch (error) {
      console.error('Error sending email:', error);
      // Error handled by useEffect watching reportError
    }
  };

  // Render logic
  if (fetchStatus === 'loading') {
    return (
      <div className='loading-indicator page-loading'>
        <FontAwesomeIcon icon={faSpinner} spin size='2x' />
        <p>Loading Review...</p>
      </div>
    );
  }

  // Handles case where review data is not available after loading attempts
  if (fetchStatus === 'succeeded' && !reviewData) {
    return (
      <div className='vehicles-page'>
        <Alert /> {/* Show alert if fetch succeeded but no data */}
        <div className='error-message page-error'>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>Review data not found.</p>
          <Link to='/vehicles' className='btn btn-secondary'>
            Back to Vehicles
          </Link>
        </div>
      </div>
    );
  }

  const vehicleTargetId = reviewData?.vehicle?._id || reviewData?.vehicle;

  return (
    <div className='vehicles-page'>
      <Alert /> {/* Global alert display */}
      <div className='vehicles-header'>
        <div className='title-breadcrumbs'>
          <h2>
            <FontAwesomeIcon icon={faClipboardList} /> Review Details
          </h2>
          <div className='breadcrumbs'>
            <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
            <span className='breadcrumb-separator'> / </span>
            <Link to='/vehicles' className='breadcrumb-link'>Vehicles</Link>
            {vehicleTargetId && (
              <>
                <span className='breadcrumb-separator'> / </span>
                <Link to={`/vehicles/view/${vehicleTargetId}`} className='breadcrumb-link'>
                  {reviewData.vehicle?.name ?? 'View Vehicle'}
                </Link>
              </>
            )}
            <span className='breadcrumb-separator'> / </span>
            <span className='breadcrumb-current'>View Review</span>
          </div>
        </div>
        <div className='header-actions'>
          <button
            className='btn btn-purple'
            onClick={() => setShowEmailPrompt(true)}
            aria-controls="email-prompt-view-review"
            aria-expanded={showEmailPrompt}
          >
            <FontAwesomeIcon icon={faPaperPlane} /> Send Report
          </button>
          <button
            className='btn btn-danger'
            onClick={() => setShowDownloadPrompt(true)}
            aria-controls="download-prompt-view-review"
            aria-expanded={showDownloadPrompt}
          >
            <FontAwesomeIcon icon={faDownload} /> Download Report
          </button>
        </div>
      </div>

      {showDownloadPrompt && (
        <div className='prompt-overlay'>
          <div id="download-prompt-view-review" className='prompt-container'>
            <h4 className='prompt-title'>Download Report</h4>
            <div className='prompt-actions'>
              <button
                className='btn btn-danger'
                onClick={() => handleDownload('pdf')}
                disabled={reportStatus === 'loading'}
              >
                {reportStatus === 'loading' ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Download PDF'}
              </button>
               <button // Added Excel download option
                className='btn btn-success' // Different color for Excel
                onClick={() => handleDownload('excel')}
                disabled={reportStatus === 'loading'}
              >
                {reportStatus === 'loading' ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Download Excel'}
              </button>
              <button
                className='btn btn-secondary'
                onClick={() => setShowDownloadPrompt(false)}
                disabled={reportStatus === 'loading'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmailPrompt && (
        <div className='prompt-overlay'>
          <div id="email-prompt-view-review" className='prompt-container'>
            <h4 className='prompt-title'>Send Report via Email</h4>
            <input
              type='email'
              placeholder='Enter recipient email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='prompt-input'
              aria-label='Recipient Email'
              required
            />
            <div className='prompt-actions'>
              <button
                className='btn btn-purple'
                onClick={() => handleSendEmail('pdf')}
                disabled={reportStatus === 'loading' || !email || !/\S+@\S+\.\S+/.test(email)}
              >
                {reportStatus === 'loading' ? (
                  <><FontAwesomeIcon icon={faSpinner} spin /> Sending PDF...</>
                ) : (
                  'Send as PDF'
                )}
              </button>
              <button
                className='btn btn-success' // Using success color like Excel download
                onClick={() => handleSendEmail('excel')}
                disabled={reportStatus === 'loading' || !email || !/\S+@\S+\.\S+/.test(email)}
              >
                {reportStatus === 'loading' ? (
                  <><FontAwesomeIcon icon={faSpinner} spin /> Sending Excel...</>
                ) : (
                  'Send as Excel'
                )}
              </button>
              <button
                className='btn btn-secondary'
                onClick={() => setShowEmailPrompt(false)}
                disabled={reportStatus === 'loading'}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Display review details if data is available */}
      {reviewData && (
        <>
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
                <span className='info-value'>{reviewData.employeeId?.name || 'Unknown'}</span>
              </div>
            </div>
          </div>

          <div className='view-review-details-container'>
            <div className='detail-item'>
              <span className='detail-label'><FontAwesomeIcon icon={faFileContract} /> WOF/Rego</span>
              <span className='detail-value'>{reviewData.vehicle?.wofRego || '--'}</span>
            </div>
            <div className='detail-item'>
              <span className='detail-label'><FontAwesomeIcon icon={faGasPump} /> Oil Checked</span>
              <span className={`detail-value status ${reviewData.oilChecked ? 'status-yes' : 'status-no'}`}>
                <FontAwesomeIcon icon={reviewData.oilChecked ? faCheck : faTimes} />{' '}
                {reviewData.oilChecked ? 'Yes' : 'No'}
              </span>
            </div>
            <div className='detail-item'>
              <span className='detail-label'><FontAwesomeIcon icon={faSearch} /> Vehicle Checked</span>
              <span className={`detail-value status ${reviewData.vehicleChecked ? 'status-yes' : 'status-no'}`}>
                <FontAwesomeIcon icon={reviewData.vehicleChecked ? faCheck : faTimes} />{' '}
                {reviewData.vehicleChecked ? 'Yes' : 'No'}
              </span>
            </div>
            <div className='detail-item'>
              <span className='detail-label'><FontAwesomeIcon icon={faWrench} /> Vehicle Broken/Issues</span>
              <span className={`detail-value status ${reviewData.vehicleBroken ? 'status-no' : 'status-yes'}`}>
                <FontAwesomeIcon icon={reviewData.vehicleBroken ? faTimes : faCheck} />{' '}
                {reviewData.vehicleBroken ? 'Yes' : 'No'}
              </span>
            </div>
            <div className='detail-item'>
              <span className='detail-label'><FontAwesomeIcon icon={faRulerVertical} /> Hours Recorded</span>
              <span className='detail-value'>{reviewData.hours || '--'} hrs</span>
            </div>
            <div className='detail-item detail-item-full'>
              <span className='detail-label'><FontAwesomeIcon icon={faStickyNote} /> Notes</span>
              <span className='detail-value notes-value'>{reviewData.notes || 'N/A'}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ViewReview;
