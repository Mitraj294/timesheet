import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom'; // Import Link for breadcrumbs
import { setAlert } from '../../redux/slices/alertSlice'; // Corrected path
import axios from 'axios'; // Import axios directly
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faSpinner, faEnvelopeOpenText, faUsersCog } from '@fortawesome/free-solid-svg-icons'; // Added faUsersCog for header
import '../../styles/ManageInvitations.scss'; // Corrected path

const ManageInvitations = () => {
  const dispatch = useDispatch();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({}); // To track loading state for individual approve/reject actions

  // Use environment variable for API base URL, with a fallback
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com';

  const fetchPendingInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await axios.get(`${API_BASE_URL}/auth/invitations/pending`, config);
      setInvitations(res.data);
    } catch (err) {
      console.error("Error fetching invitations:", err); // Log the full error object
      let errorMessage = 'Failed to fetch invitations'; // Default error message

      // Handle unauthorized errors specifically, e.g., redirect to login
      if (err.response) {
        // We got a response from the server, but it's an error
        console.error("Server responded with error:", err.response.status, err.response.data);
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        if (err.response.status === 401) errorMessage = 'Session expired. Please log in again.';
      } else if (err.request) {
        // The request was made but no response was received
        console.error("No response received for fetching invitations:", err.request);
        errorMessage = 'Network error or server is not responding.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error setting up request for fetching invitations:", err.message);
        errorMessage = err.message || 'An unexpected error occurred.';
      }
      dispatch(setAlert(errorMessage, 'danger')); // Dispatch the determined error message
      setInvitations([]); // Clear invitations on error
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchPendingInvitations();
  }, [fetchPendingInvitations]);

  const handleAction = async (invitationId, action) => {
    setActionLoading(prev => ({ ...prev, [invitationId]: action })); // Store the action type for specific spinner
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      // For POST requests, send an empty object {} if no data is needed but JSON is expected.
      const res = await axios.post(`${API_BASE_URL}/auth/invitations/${invitationId}/${action}`, {}, config);
      dispatch(setAlert(res.data.message, 'success'));
      // Refresh invitations after action
      fetchPendingInvitations();
    } catch (err) {
      console.error(`Error during ${action} action:`, err); // Log the full error
      let errorMessage = `Failed to ${action} invitation`;

      if (err.response) {
        console.error(`Server responded with error during ${action}:`, err.response.status, err.response.data);
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        if (err.response.status === 401) errorMessage = 'Session expired. Please log in again.';
      } else if (err.request) {
        console.error(`No response received for ${action} action:`, err.request);
        errorMessage = 'Network error or server is not responding.';
      } else {
        console.error(`Error setting up request for ${action} action:`, err.message);
        errorMessage = err.message || 'An unexpected error occurred.';
      }
      dispatch(setAlert(errorMessage, 'danger'));
    } finally {
      setActionLoading(prev => ({ ...prev, [invitationId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="manage-invitations-loading">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" />
        <p>Loading pending invitations...</p>
      </div>
    );
  }

  return (
    <div className="manage-invitations-container">
      {/* Header Section */}
      <div className="page-header">
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faUsersCog} /> Manage Invitations
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator">/</span>
            <Link to="/settings" className="breadcrumb-link">Settings</Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">Manage Invitations</span>
          </div>
        </div>
      </div>

      {invitations.length === 0 ? (
        <p className="no-invitations-message">No pending invitations at the moment.</p>
      ) : (
        <ul className="invitations-list">
          {invitations.map((invite) => (
            <li key={invite._id} className="invitation-item">
              <div className="invitation-details">
                <p><strong>Name:</strong> {invite.prospectiveEmployeeName}</p>
                <p><strong>Email:</strong> {invite.prospectiveEmployeeEmail}</p>
                <p><strong>Requested Company Name:</strong> {invite.companyName}</p>
                <p><strong>Requested On:</strong> {new Date(invite.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="invitation-actions">
                <button
                  onClick={() => handleAction(invite._id, 'approve')}
                  className="btn btn-success btn-sm"
                  disabled={!!actionLoading[invite._id]}
                >
                  {actionLoading[invite._id] === 'approve' ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheckCircle} />}
                  {' '}Approve
                </button>
                <button
                  onClick={() => handleAction(invite._id, 'reject')}
                  className="btn btn-danger btn-sm"
                  disabled={!!actionLoading[invite._id]}
                >
                  {actionLoading[invite._id] === 'reject' ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faTimesCircle} />}
                  {' '}Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ManageInvitations;