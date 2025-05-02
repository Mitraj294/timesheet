// /home/digilab/timesheet/client/src/components/pages/Clients.js
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Redux Imports
import {
  fetchClients,
  deleteClient,
  downloadClients,
  selectAllClients,
  selectClientStatus,
  selectClientError,
  selectClientDeleteStatus,
  selectClientDownloadStatus,
  selectClientDownloadError,
  clearClientError, // Import clear error action
  clearDownloadStatus // Import clear download status action
} from "../../redux/slices/clientSlice";
import { setAlert } from "../../redux/slices/alertSlice"; // Import alert action
import Alert from "../layout/Alert"; // Import the Alert component

import {
  faUsers,
  faDownload,
  faPlus,
  faSearch,
  faEye,
  faPen,
  faTrash,
  faSpinner,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";

import "../../styles/Vehicles.scss"; // Assuming shared styles

const Clients = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux State
  const clients = useSelector(selectAllClients);
  const clientStatus = useSelector(selectClientStatus);
  const clientError = useSelector(selectClientError);
  const deleteStatus = useSelector(selectClientDeleteStatus); // Optional: for delete loading state
  const downloadStatus = useSelector(selectClientDownloadStatus);
  const downloadError = useSelector(selectClientDownloadError);
  const { user } = useSelector((state) => state.auth || {});

  // Local UI State
  const [searchTerm, setSearchTerm] = useState("");
  const [localDownloadError, setLocalDownloadError] = useState(null); // Local state for download error display

  // Derived State
  const isLoading = useMemo(() => clientStatus === 'loading', [clientStatus]);
  const isDownloading = useMemo(() => downloadStatus === 'loading', [downloadStatus]);
  const isDeleting = useMemo(() => deleteStatus === 'loading', [deleteStatus]); // Optional

  useEffect(() => {
    // Fetch clients if status is idle
    if (clientStatus === 'idle') {
      dispatch(fetchClients());
    }
  }, [dispatch, clientStatus]);

  // Effect to handle general client fetch/delete errors
  useEffect(() => {
    if (clientError) {
      dispatch(setAlert(clientError, 'danger'));
      // Optional: Clear the error in the slice after showing the alert
      // dispatch(clearClientError());
    }
  }, [clientError, dispatch]);
  
  // Effect to handle download status/errors
  useEffect(() => {
    if (downloadStatus === 'failed' && downloadError) {
      dispatch(setAlert(downloadError, 'danger')); // Show download error via Alert component
      dispatch(clearDownloadStatus()); // Reset Redux state after handling
    } // Success alert for download is handled in handleDownloadClients
  }, [downloadStatus, downloadError, dispatch]);

  // --- Refactored Delete Confirmation ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id, name }

  const handleDeleteClick = (clientId, clientName) => {
    setItemToDelete({ id: clientId, name: clientName });
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const confirmDeleteClient = () => {
    if (!itemToDelete) return;
    const { id: clientId, name: clientName } = itemToDelete;

    dispatch(deleteClient(clientId))
      .unwrap()
      .then(() => dispatch(setAlert(`Client "${clientName}" deleted successfully.`, 'success')))
      .catch((err) => {
        const errorMessage = err?.message || `Failed to delete client "${clientName}".`; // Extract message
        dispatch(setAlert(errorMessage, 'danger'));
      });
    // Close modal after dispatching
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const filteredClients = clients.filter((client) =>
    client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadClients = async () => {
    setLocalDownloadError(null); // Clear local error on new attempt
    dispatch(clearDownloadStatus()); // Clear Redux status

    dispatch(downloadClients())
      .unwrap()
      .then((result) => {
        // Success: Create and trigger download link
        const blob = new Blob([result.blob], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', result.filename || 'clients_report.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        dispatch(setAlert('Client report downloaded.', 'success'));
      })
      .catch((error) => { // Error is now handled by the useEffect watching downloadStatus/downloadError
        // Error is handled by the useEffect watching downloadError
        console.error('Download dispatch failed:', error);
      });
  };


  const gridColumns = '1.5fr 1.5fr 1fr 2fr 1.5fr auto';

  return (

    <div className="vehicles-page">
      <Alert /> {/* Render Alert component here */}

      <div className="vehicles-header">
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faUsers} /> Clients
          </h2>
          <div className="breadcrumbs">
            <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">Clients</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-danger"
            onClick={handleDownloadClients}
            disabled={isDownloading} // Use Redux state
          >
            {isDownloading ? (
                <> <FontAwesomeIcon icon={faSpinner} spin /> Downloading... </>
            ) : (
                <> <FontAwesomeIcon icon={faDownload} /> Download Excel </>
            )}
          </button>
          {user?.role === "employer" && (
            <button
              className="btn btn-success"
              onClick={() => navigate('/clients/create')}
            >
              <FontAwesomeIcon icon={faPlus} /> Add New Client
            </button>
          )}
        </div>

      </div>


      <div className="vehicles-search">
        <input
          type="text"
          placeholder="Search by Name, Email, or Phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search Clients"
        />
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
      </div>


      {isLoading && ( // Use Redux loading state
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading clients...</p>
        </div>
      )}

      {/* Error State Handled by Alert component */}

      {!isLoading && !clientError && ( // Use Redux states
        <div className="vehicles-grid">

          <div className="vehicles-row header" style={{ gridTemplateColumns: gridColumns }}>
            <div>Client Name</div>
            <div>Email Address</div>
            <div>Phone Number</div>
            <div>Address</div>
            <div>Notes</div>
            {/* Always show Actions header */}
            <div>Actions</div>
          </div>


          {filteredClients.length === 0 ? (
            <div className="vehicles-row no-results">
              {searchTerm ? 'No clients match your search.' : 'No clients found.'}
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client._id}//
                className="vehicles-row vehicle-card"
                style={{ gridTemplateColumns: gridColumns }}
              >
                <div data-label="Client Name">{client.name || '--'}</div>
                <div data-label="Email">{client.emailAddress || '--'}</div>
                <div data-label="Phone">{client.phoneNumber || '--'}</div>
                <div data-label="Address">{client.address || '--'}</div>
                <div data-label="Notes" className="notes-cell">{client.notes || '--'}</div>
                {/* Always render the Actions cell */}
                <div data-label="Actions" className="actions">
                  {/* Always show View button */}
                  <button
                    className="btn-icon btn-icon-blue" // View button
                    onClick={() => navigate(`/clients/view/${client._id}`)}
                    title={`View ${client.name}`}
                    aria-label={`View ${client.name}`}
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  {/* Only show Edit and Delete for employers */}
                  {user?.role === 'employer' && (
                    <>
                      <button
                        className="btn-icon btn-icon-yellow" // Edit button
                        onClick={() => navigate(`/clients/update/${client._id}`)}
                        title={`Edit ${client.name}`}
                        aria-label={`Edit ${client.name}`}
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        className="btn-icon btn-icon-red" // Delete button
                        onClick={() => handleDeleteClick(client._id, client.name)} // Trigger modal
                        title={`Delete ${client.name}`}
                        aria-label={`Delete ${client.name}`}
                        disabled={isDeleting} // Optional: Disable while deleting
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay"> {/* Re-use styles */}
            <div className="logout-confirm-dialog">
              <h4>Confirm Client Deletion</h4>
              <p>Are you sure you want to permanently delete client "<strong>{itemToDelete.name}</strong>"? This action cannot be undone.</p>
              <div className="logout-confirm-actions">
                <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeleting}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteClient} disabled={isDeleting}>
                  {isDeleting ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete Client'}
                </button>
              </div>
            </div>
          </div>
      )}

    </div>
  );
};

export default Clients;
