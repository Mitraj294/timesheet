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
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus } from "../../redux/slices/employeeSlice";
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
import "../../styles/Vehicles.scss";

const Clients = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Redux state
  const allClients = useSelector(selectAllClients);
  const clientStatus = useSelector(selectClientStatus);
  const clientError = useSelector(selectClientError);
  const deleteStatus = useSelector(selectClientDeleteStatus);
  const downloadStatus = useSelector(selectClientDownloadStatus);
  const downloadError = useSelector(selectClientDownloadError);
  const { user } = useSelector((state) => state.auth || {});
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerWidth < 768);

  // Update layout on window resize
  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    handleResize();
    console.log("[Clients] Component mounted");
    return () => {
      window.removeEventListener('resize', handleResize);
      console.log("[Clients] Component unmounted");
    };
  }, []);

  // Loading states
  const isLoading = useMemo(() => clientStatus === 'loading' || (user?.role === 'employee' && employeeStatus === 'loading'), [clientStatus, user, employeeStatus]);
  const isDownloading = downloadStatus === 'loading';
  const isDeleting = deleteStatus === 'loading';

  // Fetch clients and employees on load
  useEffect(() => {
    console.log("[Clients] useEffect: clientStatus =", clientStatus, "employeeStatus =", employeeStatus, "user =", user);
    if (clientStatus === 'idle') {
      console.log("[Clients] Fetching clients...");
      dispatch(fetchClients());
    }
    if (user?.role === 'employee' && (employeeStatus === 'idle' || employeeStatus === 'failed')) {
      console.log("[Clients] Fetching employees for employee role...");
      dispatch(fetchEmployees());
    }
  }, [dispatch, clientStatus, user, employeeStatus]);

  // Show errors as alerts
  useEffect(() => {
    if (clientError) {
      console.error("[Clients] Client error:", clientError);
      dispatch(setAlert(clientError, 'danger'));
    }
  }, [clientError, dispatch]);
  useEffect(() => {
    if (downloadStatus === 'failed' && downloadError) {
      console.error("[Clients] Download error:", downloadError);
      dispatch(setAlert(downloadError, 'danger'));
      dispatch(clearDownloadStatus());
    }
  }, [downloadStatus, downloadError, dispatch]);

  // Delete client handlers
  const handleDeleteClick = (clientId, clientName) => {
    console.log(`[Clients] Request to delete client: ${clientName} (${clientId})`);
    setItemToDelete({ id: clientId, name: clientName });
    setShowDeleteConfirm(true);
  };
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    console.log("[Clients] Cancelled client deletion");
  };
  const confirmDeleteClient = () => {
    if (!itemToDelete) return;
    const { id, name } = itemToDelete;
    console.log(`[Clients] Confirming delete for client: ${name} (${id})`);
    dispatch(deleteClient(id))
      .unwrap()
      .then(() => {
        console.log(`[Clients] Client "${name}" deleted successfully.`);
        dispatch(setAlert(`Client "${name}" deleted successfully.`, 'success'));
      })
      .catch((err) => {
        const errorMessage = err?.message || `Failed to delete client "${name}".`;
        console.error("[Clients] Delete error:", errorMessage);
        dispatch(setAlert(errorMessage, 'danger'));
      });
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  // Get logged-in employee record
  const loggedInEmployeeRecord = useMemo(() => {
    if (user?.role === 'employee' && Array.isArray(employees) && user?._id) {
      const found = employees.find(emp => emp.userId === user._id);
      console.log("[Clients] loggedInEmployeeRecord:", found);
      return found;
    }
    return null;
  }, [employees, user]);

  // Filter clients by user role
  const clientsToDisplay = useMemo(() => {
    if (!user || !allClients) return [];
    if (user.role === 'employer') {
      const filtered = allClients.filter(client => client.employerId === user._id);
      console.log("[Clients] Filtering clients for employer:", filtered);
      return filtered;
    } else if (user.role === 'employee' && loggedInEmployeeRecord?.employerId) {
      const employerId = typeof loggedInEmployeeRecord.employerId === 'object'
        ? loggedInEmployeeRecord.employerId._id
        : loggedInEmployeeRecord.employerId;
      const filtered = allClients.filter(client => client.employerId === employerId);
      console.log("[Clients] Filtering clients for employee's employer:", filtered);
      return filtered;
    }
    return [];
  }, [allClients, user, loggedInEmployeeRecord]);

  // Search filter
  const filteredClients = clientsToDisplay.filter((client) =>
    client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client?.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  useEffect(() => {
    console.log("[Clients] Filtered clients after search:", filteredClients);
  }, [filteredClients]);

  // Download clients as Excel
  const handleDownloadClients = async () => {
    console.log("[Clients] Downloading clients as Excel...");
    dispatch(clearDownloadStatus());
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
        console.log("[Clients] Client report downloaded.");
        dispatch(setAlert('Client report downloaded.', 'success'));
      })
      .catch(() => {}); // Error handled by useEffect
  };

  // Responsive grid cell style for small screens
  const getCellStyle = (clientIndex, fieldType) => {
    if (!isSmallScreen) return {};
    const headerRowCount = 4;
    const clientBlockStart = (headerRowCount + 1) + (clientIndex * 5);
    switch (fieldType) {
      case 'name':    return { gridArea: `${clientBlockStart} / 1 / ${clientBlockStart + 5} / 2` };
      case 'actions': return { gridArea: `${clientBlockStart} / 3 / ${clientBlockStart + 5} / 4` };
      case 'email':   return { gridArea: `${clientBlockStart + 0} / 2 / ${clientBlockStart + 1} / 3` };
      case 'phone':   return { gridArea: `${clientBlockStart + 1} / 2 / ${clientBlockStart + 2} / 3` };
      case 'address': return { gridArea: `${clientBlockStart + 2} / 2 / ${clientBlockStart + 3} / 3` };
      case 'notes':   return { gridArea: `${clientBlockStart + 3} / 2 / ${clientBlockStart + 4} / 3` };
      default: return {};
    }
  };

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
                  <><FontAwesomeIcon icon={faSpinner} spin /> Downloading...</>
                ) : (
                  <><FontAwesomeIcon icon={faDownload} /> Download Excel</>
                )}
              </button>
              <button
                className="btn btn-green"
                onClick={() => {
                  console.log("[Clients] Navigating to create client page");
                  navigate('/clients/create');
                }}
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
          onChange={(e) => {
            setSearchTerm(e.target.value);
            console.log("[Clients] Search changed:", e.target.value);
          }}
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
          <div className="client-grid-header">Client Name</div>
          <div className="client-grid-header">Email Address</div>
          <div className="client-grid-header">Phone Number</div>
          <div className="client-grid-header">Address</div>
          <div className="client-grid-header">Notes</div>
          <div className="client-grid-header client-actions-header">Actions</div>
          {filteredClients.length === 0 ? (
            <div className="client-grid-cell no-results-message" style={{ gridColumn: '1 / -1' }}>
              {searchTerm ? 'No clients match your search.' : (allClients.length === 0 && clientStatus === 'succeeded' ? 'No clients have been added yet.' : 'No clients found for your account.')}
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
                    onClick={() => {
                      console.log(`[Clients] Navigating to view client: ${client._id}`);
                      navigate(`/clients/view/${client._id}`);
                    }}
                    title={`View ${client.name}`}
                    aria-label={`View ${client.name}`}
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  {user?.role === 'employer' && (
                    <>
                      <button
                        className="btn-icon btn-icon-yellow"
                        onClick={() => {
                          console.log(`[Clients] Navigating to edit client: ${client._id}`);
                          navigate(`/clients/update/${client._id}`);
                        }}
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
                {isDeleting ? <><FontAwesomeIcon icon={faSpinner} spin /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
