import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setAlert } from '../../redux/slices/alertSlice';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../../styles/ManageInvitations.scss';

const ManageInvitations = () => {
  const dispatch = useDispatch();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  // Use environment variable for API base URL, with a fallback
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com';

  // Fetch pending invitations
  const fetchPendingInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'Content-Type': 'application/json' }
      };
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      const res = await axios.get(`${API_BASE_URL}/auth/invitations/pending`, config);
      setInvitations(res.data);
    } catch (err) {
      let errorMessage = 'Failed to fetch invitations';
      if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        if (err.response.status === 401) errorMessage = 'Session expired. Please log in again.';
      } else if (err.request) {
        errorMessage = 'Network error or server is not responding.';
      } else {
        errorMessage = err.message || 'An unexpected error occurred.';
      }
      dispatch(setAlert(errorMessage, 'danger'));
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch, API_BASE_URL]);

  useEffect(() => {
    fetchPendingInvitations();
    return () => {
    };
  }, [fetchPendingInvitations]);

  // Approve or reject invitation
  const handleAction = async (invitationId, action) => {
    setActionLoading(prev => ({ ...prev, [invitationId]: action }));
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'Content-Type': 'application/json' }
      };
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      const res = await axios.post(`${API_BASE_URL}/auth/invitations/${invitationId}/${action}`, {}, config);
      dispatch(setAlert(res.data.message, 'success'));
      fetchPendingInvitations();
    } catch (err) {
      let errorMessage = `Failed to ${action} invitation`;
      if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        if (err.response.status === 401) errorMessage = 'Session expired. Please log in again.';
      } else if (err.request) {
        errorMessage = 'Network error or server is not responding.';
      } else {
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
      <div className="page-header">
        <div className="title-breadcrumbs">
          <h2>Manage Invitations</h2>
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
                  className="btn btn-green"
                  disabled={!!actionLoading[invite._id]}
                >
                  {actionLoading[invite._id] === 'approve'
                    ? <FontAwesomeIcon icon={faSpinner} spin />
                    : <FontAwesomeIcon icon={faCheckCircle} />}
                  {' '}Approve
                </button>
                <button
                  onClick={() => handleAction(invite._id, 'reject')}
                  className="btn btn-danger btn-sm"
                  disabled={!!actionLoading[invite._id]}
                >
                  {actionLoading[invite._id] === 'reject'
                    ? <FontAwesomeIcon icon={faSpinner} spin />
                    : <FontAwesomeIcon icon={faTimesCircle} />}
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