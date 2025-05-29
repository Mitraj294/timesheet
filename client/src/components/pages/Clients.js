// /home/digilab/timesheet/client/src/components/pages/Clients.js
import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
  clearClientError,
  clearDownloadStatus
} from "../../redux/slices/clientSlice";
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus } from "../../redux/slices/employeeSlice"; // Added employee imports
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from "../layout/Alert";

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

import "../../styles/Vehicles.scss"; // Reusing vehicle styles for consistency

const Clients = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux State
  const allClientsFromStore = useSelector(selectAllClients); // Renamed for clarity
  const clientStatus = useSelector(selectClientStatus);
  const clientError = useSelector(selectClientError);
  const deleteStatus = useSelector(selectClientDeleteStatus); // For delete button loading state
  const downloadStatus = useSelector(selectClientDownloadStatus);
  const downloadError = useSelector(selectClientDownloadError);
  const { user } = useSelector((state) => state.auth || {});
  const employees = useSelector(selectAllEmployees); // Fetch employees for employee role
  const employeeStatus = useSelector(selectEmployeeStatus); // Status for employee fetch

  // Local component state
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Stores { id, name } for deletion confirmation

  // State for responsive layout
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    // Call handler right away so state is updated with initial window size
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Derived state for loading indicators
  const isLoading = useMemo(() => clientStatus === 'loading' || (user?.role === 'employee' && employeeStatus === 'loading'), [clientStatus, user, employeeStatus]);
  const isDownloading = useMemo(() => downloadStatus === 'loading', [downloadStatus]);
  const isDeleting = useMemo(() => deleteStatus === 'loading', [deleteStatus]);

  // Effects
  useEffect(() => {
    // Fetch clients on initial load if not already fetched
    if (clientStatus === 'idle') {
      dispatch(fetchClients());
    }
    // Fetch employees if user is an employee and employees aren't loaded/failed
    if (user?.role === 'employee' && (employeeStatus === 'idle' || employeeStatus === 'failed')) {
      dispatch(fetchEmployees());
    }
  }, [dispatch, clientStatus, user, employeeStatus]);

  // Effect to display general client operation errors
  useEffect(() => {
    if (clientError) {
      dispatch(setAlert(clientError, 'danger'));
      // Consider dispatch(clearClientError()) here if errors should not persist after being shown
    }
  }, [clientError, dispatch]);
  
  // Effect to display download-specific errors
  useEffect(() => {
    if (downloadStatus === 'failed' && downloadError) {
      dispatch(setAlert(downloadError, 'danger'));
      dispatch(clearDownloadStatus()); // Reset Redux download status after handling
    }
  }, [downloadStatus, downloadError, dispatch]);

  // Handlers
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
        const errorMessage = err?.message || `Failed to delete client "${clientName}".`;
        dispatch(setAlert(errorMessage, 'danger'));
      });
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  // Memoized employee record for the logged-in employee
  const loggedInEmployeeRecord = useMemo(() => {
    if (user?.role === 'employee' && Array.isArray(employees) && user?._id) {
      return employees.find(emp => emp.userId === user._id);
    }
    return null;
  }, [employees, user]);

  // Memoized list of clients scoped by user role (frontend safeguard)
  const clientsToDisplay = useMemo(() => {
    if (!user || !allClientsFromStore) return [];

    if (user.role === 'employer') {
      // For employer, filter clients by their own ID. Backend should already do this.
      return allClientsFromStore.filter(client => client.employerId === user._id);
    } else if (user.role === 'employee' && loggedInEmployeeRecord?.employerId) {
      // For employee, filter clients by their employer's ID. Backend should already do this.
      const employerIdOfEmployee = typeof loggedInEmployeeRecord.employerId === 'object'
        ? loggedInEmployeeRecord.employerId._id
        : loggedInEmployeeRecord.employerId;
      return allClientsFromStore.filter(client => client.employerId === employerIdOfEmployee);
    }
    return []; // Default to empty if role is not handled or data is missing
  }, [allClientsFromStore, user, loggedInEmployeeRecord]);

  const filteredClients = clientsToDisplay.filter((client) => // Search operates on the already scoped list
    client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleDownloadClients = async () => {
    dispatch(clearDownloadStatus()); // Clear previous Redux download status

    dispatch(downloadClients())
      .unwrap()
      .then((result) => {
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
      .catch((error) => {
        // Error is handled by the useEffect watching downloadStatus/downloadError
        console.error('Download dispatch failed:', error);
      });
  };

  // For large screens, cells flow naturally. For small screens, apply grid-area.
  // Headers are in row 1. Data for client `clientIndex` starts its 5-row block at `2 + clientIndex * 5`.
  const getCellStyle = (clientIndex, fieldType) => {
    if (!isSmallScreen) {
      return {}; // Let CSS flow handle large screens
    }

    // On small screens, headers will occupy the first 4 rows (lines 1 to 5).
    // So, the data for client `clientIndex` starts its block at grid row line `5 + clientIndex * 5`.
    const headerRowCount = 4; // Headers span 4 rows
    const clientBlockStartRowLine = (headerRowCount + 1) + (clientIndex * 5);

    switch (fieldType) {
      // Name and Actions span 5 rows vertically
      // Name: Starts at clientBlockStartRowLine, spans 5 rows (ends at line + 5), in column 1 (lines 1 to 2)
      case 'name':    return { gridArea: `${clientBlockStartRowLine} / 1 / ${clientBlockStartRowLine + 5} / 2` };
      // Actions: Starts at clientBlockStartRowLine, spans 5 rows (ends at line + 5), in column 3 (lines 3 to 4)
      case 'actions': return { gridArea: `${clientBlockStartRowLine} / 3 / ${clientBlockStartRowLine + 5} / 4` };
      
      // Email, Phone, Address, Notes are single rows in the second column (lines 2 to 3)
      // Email: Starts at clientBlockStartRowLine + 0, spans 1 row (ends at line + 1), in column 2 (lines 2 to 3)
      case 'email':   return { gridArea: `${clientBlockStartRowLine + 0} / 2 / ${clientBlockStartRowLine + 1} / 3` };
      // Phone: Starts at clientBlockStartRowLine + 1, spans 1 row (ends at line + 1), in column 2 (lines 2 to 3)
      case 'phone':   return { gridArea: `${clientBlockStartRowLine + 1} / 2 / ${clientBlockStartRowLine + 2} / 3` };
      // Address: Starts at clientBlockStartRowLine + 2, spans 1 row (ends at line + 1), in column 2 (lines 2 to 3)
      case 'address': return { gridArea: `${clientBlockStartRowLine + 2} / 2 / ${clientBlockStartRowLine + 3} / 3` };
      // Notes: Starts at clientBlockStartRowLine + 3, spans 1 row (ends at line + 1), in column 2 (lines 2 to 3)
      case 'notes':   return { gridArea: `${clientBlockStartRowLine + 3} / 2 / ${clientBlockStartRowLine + 4} / 3` };
      default: return {};
    }
  };
  
  // Render
  return (
    <div className="vehicles-page">
      <Alert />
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
          {user?.role === "employer" && (
            <>
              <button
                className="btn btn-danger"
                onClick={handleDownloadClients}
                disabled={isDownloading}
              >
                {isDownloading ? (
                    <> <FontAwesomeIcon icon={faSpinner} spin /> Downloading... </>
                ) : (
                    <> <FontAwesomeIcon icon={faDownload} /> Download Excel </>
                )}
              </button>
              <button
                className="btn btn-green"
                onClick={() => navigate('/clients/create')}
              >
                <FontAwesomeIcon icon={faPlus} /> Add New Client
              </button>
            </>
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

      {isLoading && (
        <div className='loading-indicator'>
          <FontAwesomeIcon icon={faSpinner} spin size='2x' />
          <p>Loading clients...</p>
        </div>
      )}

      {!isLoading && !clientError && (
        <div className="clients-responsive-grid">
          {/* Headers */}
          <div className="client-grid-header">Client Name</div>
          <div className="client-grid-header">Email Address</div>
          <div className="client-grid-header">Phone Number</div>
          <div className="client-grid-header">Address</div>
          <div className="client-grid-header">Notes</div>
          <div className="client-grid-header client-actions-header">Actions</div>

          {filteredClients.length === 0 ? (
            <div className="client-grid-cell no-results-message" style={{ gridColumn: '1 / -1' }}> {/* Span all columns */}
              {searchTerm ? 'No clients match your search.' : (allClientsFromStore.length === 0 && clientStatus === 'succeeded' ? 'No clients have been added yet.' : 'No clients found for your account.')}
            </div>
          ) : (
            filteredClients.map((client, clientIndex) => (
              <React.Fragment key={client._id}>
                <div className="client-grid-cell" style={getCellStyle(clientIndex, 'name')} data-label="Client Name">{client.name || '--'}</div>
                <div className="client-grid-cell" style={getCellStyle(clientIndex, 'email')} data-label="Email">{client.emailAddress || '--'}</div>
                <div className="client-grid-cell" style={getCellStyle(clientIndex, 'phone')} data-label="Phone">{client.phoneNumber || '--'}</div>
                <div className="client-grid-cell" style={getCellStyle(clientIndex, 'address')} data-label="Address">{client.address || '--'}</div>
                <div className="client-grid-cell notes-cell" style={getCellStyle(clientIndex, 'notes')} data-label="Notes">{client.notes || '--'}</div>
                <div className="client-grid-cell client-actions-cell" style={getCellStyle(clientIndex, 'actions')} data-label="Actions">
                    <button
                      className="btn-icon btn-icon-blue"
                      onClick={() => navigate(`/clients/view/${client._id}`)}
                      title={`View ${client.name}`}
                      aria-label={`View ${client.name}`}
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    {user?.role === 'employer' && (
                      <>
                        <button
                          className="btn-icon btn-icon-yellow"
                          onClick={() => navigate(`/clients/update/${client._id}`)}
                          title={`Edit ${client.name}`}
                          aria-label={`Edit ${client.name}`}
                        >
                          <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button
                          className="btn-icon btn-icon-red"
                          onClick={() => handleDeleteClick(client._id, client.name)}
                          title={`Delete ${client.name}`}
                          aria-label={`Delete ${client.name}`}
                          disabled={isDeleting}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </>
                    )}
                  </div>
              </React.Fragment>
            ))
          )}
        </div>
      )}

      {showDeleteConfirm && itemToDelete && (
          <div className="logout-confirm-overlay">
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
