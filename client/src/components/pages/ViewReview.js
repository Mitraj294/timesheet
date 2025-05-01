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
import { setAlert } from '../../redux/slices/alertSlice'; // Import setAlert
import Alert from '../layout/Alert'; // Import Alert component
import '../../styles/ViewReview.scss';

const ViewReview = () => {
  const { reviewId } = useParams();
  const navigate = useNavigate();

  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [email, setEmail] = useState('');
  // const [emailFormat, setEmailFormat] = useState('pdf'); // Removed, only PDF will be used
  // Local validation errors handled by dispatching alerts

  const dispatch = useDispatch();

  const reviewData = useSelector(selectCurrentReviewData);
  const fetchStatus = useSelector(selectCurrentReviewStatus);
  const fetchError = useSelector(selectCurrentReviewError);
  const reportStatus = useSelector(selectReviewReportStatus);
  const reportError = useSelector(selectReviewReportError);

  useEffect(() => {
    dispatch(fetchReviewById(reviewId))
      .unwrap()
      .catch(err => {
        console.error('Failed to fetch review:', err);
        if (err?.message?.includes('401') || err?.message?.includes('403')) {
          navigate('/login');
        }
        // Error handled by useEffect below
      });

    return () => {
      dispatch(resetCurrentReview());
      dispatch(clearReviewReportStatus());
    };
  }, [reviewId, navigate, dispatch]);

  // Effect to show alerts for fetch or report errors from Redux state
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

    const handleDownload = async (format) => {
      dispatch(clearReviewReportStatus());

      try {
        const resultAction = await dispatch(downloadReviewReport({ reviewId, format })).unwrap();
        const { blob, filename } = resultAction;

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
        console.error('Error downloading report:', error);
        // Error handled by useEffect watching reportError
      }
    };

  const handleSendEmail = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      dispatch(setAlert('Please enter a valid email address.', 'warning'));
      return;
    }
    dispatch(clearReviewReportStatus());

    try {
      // Always send PDF format
      await dispatch(sendReviewReportByClient({ reviewId, email, format: 'pdf' })).unwrap();
      setShowEmailPrompt(false);
      setEmail('');
      dispatch(setAlert(`Review report sent successfully to ${email}.`, 'success'));
    } catch (error) {
      console.error('Error sending email:', error);
      // Error handled by useEffect watching reportError
    }
  };

  if (fetchStatus === 'loading') {
    return (
      <div className='loading-indicator page-loading'>
        <FontAwesomeIcon icon={faSpinner} spin size='2x' />
        <p>Loading Review...</p>
      </div>
    );
  }

  // Error state handled by Alert component
  /*
  if (fetchStatus === 'failed' && !reviewData) {
    return (
      <div className='error-message page-error'>
        <FontAwesomeIcon icon={faExclamationCircle} />
        <p>{fetchError}</p>
        <Link
          to={reviewData?.vehicle?._id ? `/vehicles/view/${reviewData.vehicle._id}` : '/vehicles'}
          className='btn btn-secondary'
        >
          Back
        </Link>
      </div>
    );
  }
  */

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
      <Alert />
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
            {/* Error handled by Alert component */}
            <div className='prompt-actions'>
              <button
                className='btn btn-primary'
                onClick={() => handleDownload('pdf')}
                disabled={reportStatus === 'loading'}
              >
                {reportStatus === 'loading' ? <FontAwesomeIcon icon={faSpinner} spin /> : 'PDF'}
              </button>
              <button
                className='btn btn-success'
                onClick={() => handleDownload('excel')}
                disabled={reportStatus === 'loading'}
              >
                {reportStatus === 'loading' ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Excel'}
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
            {/* Error handled by Alert component */}
            <input
              type='email'
              placeholder='Enter recipient email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='prompt-input'
              aria-label='Recipient Email'
              required
            />
            {/* Removed Format Options */}
            {/* <div className='format-options'>
              <label>
                <input
                  type='radio'
                  name='format'
                  value='pdf'
                  checked={emailFormat === 'pdf'}
                  onChange={() => setEmailFormat('pdf')}
                /> PDF
              </label>
              <label>
                <input
                  type='radio'
                  name='format'
                  value='excel'
                  checked={emailFormat === 'excel'}
                  onChange={() => setEmailFormat('excel')}
                /> Excel
              </label>
            </div>
            */}
            <div className='prompt-actions'>
              <button
                className='btn btn-purple'
                onClick={handleSendEmail}
                disabled={reportStatus === 'loading' || !email || !/\S+@\S+\.\S+/.test(email)}
              >
                {reportStatus === 'loading' ? (
                  <><FontAwesomeIcon icon={faSpinner} spin /> Sending...</>
                ) : (
                  'Send Email'
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

      {/* Error state handled by Alert component */}
      {/*
       {fetchError && fetchStatus !== 'loading' && (
        <div className='error-message' style={{ marginBottom: '1.5rem' }}>
          <FontAwesomeIcon icon={faExclamationCircle} />
          <p>{fetchError}</p>
        </div>
      )}
      */}

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
