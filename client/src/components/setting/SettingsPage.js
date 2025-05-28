// /home/digilab/timesheet/client/src/components/setting/SettingsPage.js
import React, { useState, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCog,
  faEnvelopeOpenText,
  faBuilding,
  faFileInvoiceDollar,
  faTabletAlt,
  faCar,
  faBell,
  faCreditCard,
  faTools,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

// Ensure these components are correctly exported as default from their files
import ManageInvitations from './ManageInvitations.js';
import UserSettingsSection from './UserSettingsSection.js';
import EmployerDetailsSection from '../pages/EmployerDetailsSection.js'; // Assuming this path is correct
import VehicleSettingsSection from './VehicleSettingsSection.js';
import TabletViewSettingsSection from './TabletViewSettingsSection.js';
import TimesheetSettingsSection from './TimesheetSettingsSection.js';
import NotificationSettingsSection from './NotificationSettingsSection.js'; // Import the new Notification settings component
import SubscriptionSection from './SubscriptionSection.js'; // Import the new Subscription section component

import { selectAuthUser } from '../../redux/slices/authSlice.js';
import { fetchEmployerSettings, selectSettingsStatus } from '../../redux/slices/settingsSlice.js';
// import { setAlert } from '../../redux/slices/alertSlice.js'; // Not directly used here, but Alert component is
import axios from 'axios'; // Import axios for API calls
import '../../styles/SettingsPage.scss';
import Alert from '../layout/Alert.js';

// Define the Placeholder component inline
const PlaceholderSection = ({ title }) => {
  return (
    <div className="settings-placeholder-content">
      <FontAwesomeIcon icon={faTools} size="3x" className="placeholder-icon" />
      <h2 className="placeholder-title">{title || 'Settings Section'}</h2>
      <p>This section is currently under construction.</p>
      <p>We're working hard to bring you this feature. Please check back later!</p>
    </div>
  );
};

const SettingsPage = () => {
  const user = useSelector(selectAuthUser);
  const settingsStatus = useSelector(selectSettingsStatus);
  const dispatch = useDispatch();

  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  // Use environment variable for API base URL, with a fallback, similar to ManageInvitations.js
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com';

  const initialActiveSection = useMemo(() => {
    if (user?.role === 'employee') return 'account';
    if (user?.role === 'employer') return 'account'; // Default to account for employer too
    return null;
  }, [user]);

  const [activeSection, setActiveSection] = useState(initialActiveSection);

  useEffect(() => {
    if (user?.role === 'employer' && settingsStatus === 'idle') {
      dispatch(fetchEmployerSettings());
    }
  }, [user, settingsStatus, dispatch]);

  useEffect(() => {
    const fetchPendingInvitationsCount = async () => {
      if (user?.role === 'employer') {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            console.warn("No token found, cannot fetch invitation count.");
            return;
          }
          const config = {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          };
          const res = await axios.get(`${API_BASE_URL}/auth/invitations/pending`, config);
          setPendingInvitationsCount(res.data.length);
        } catch (error) {
          console.error("Error fetching pending invitations count for badge:", error);
          // Optionally, dispatch an alert if this failure is critical to notify
          // dispatch(setAlert('Could not load invitation count for badge.', 'warning'));
          setPendingInvitationsCount(0); // Default to 0 on error
        }
      } else {
        setPendingInvitationsCount(0); // Reset if user is not employer or no user
      }
    };

    fetchPendingInvitationsCount();
  }, [user, dispatch, API_BASE_URL]); // dispatch is included in case you add setAlert

  const menuItems = useMemo(() => {
    if (user?.role === 'employee') {
      return [
        { key: 'account', label: 'Account Information', icon: faUserCog, component: <UserSettingsSection /> },
        { key: 'employerDetails', label: 'Employer Details', icon: faBuilding, component: <EmployerDetailsSection /> },
      ];
    } else if (user?.role === 'employer') {
      const employerItems = [
        { key: 'account', label: 'Account Information', icon: faUserCog, component: <UserSettingsSection /> },
        {
          key: 'vehicles',
          label: 'Vehicles',
          icon: faCar,
          component: <VehicleSettingsSection />
        },
        { key: 'notifications', label: 'Notification Settings', icon: faBell, component: <NotificationSettingsSection /> }, // Keep existing notifications
        { key: 'subscription', label: 'Subscription', icon: faCreditCard, component: <SubscriptionSection /> }, // Use the new component
      ];
      // Dynamically insert/update invitation and timesheet related items
      employerItems.splice(1, 0, { // Insert at index 1
        key: 'invitations',
        label: (
          <>
            Manage Invitations
            {pendingInvitationsCount > 0 && (
              <span className="notification-badge">{pendingInvitationsCount}</span>
            )}
          </>
        ),
        icon: faEnvelopeOpenText,
        component: <ManageInvitations />
      });
      employerItems.splice(2, 0, { key: 'timesheets', label: 'Timesheets', icon: faFileInvoiceDollar, component: <TimesheetSettingsSection /> });
      employerItems.splice(3, 0, { key: 'tabletView', label: 'Tablet View', icon: faTabletAlt, component: <TabletViewSettingsSection /> });
      return employerItems;
    }
    return [];
  }, [user, pendingInvitationsCount]); // Add pendingInvitationsCount as a dependency

  useEffect(() => {
    // If activeSection is not valid for current menuItems, reset to the first item or null
    if (menuItems.length > 0 && !menuItems.find(item => item.key === activeSection)) {
      setActiveSection(menuItems[0].key);
    } else if (menuItems.length === 0 && activeSection !== null) {
        setActiveSection(null);
    }
  }, [menuItems, activeSection]);

  const renderSection = () => {
    if (!activeSection && menuItems.length > 0) {
        // If no active section but menu items exist, default to the first one's component
        // This can happen if initialActiveSection was null but user role loaded later
        const firstItem = menuItems[0];
        if (firstItem && React.isValidElement(firstItem.component)) {
            return firstItem.component;
        }
        return <PlaceholderSection title="Select a setting" />;
    }
    if (!activeSection) return <PlaceholderSection title="Settings" />;

    const selectedItem = menuItems.find(item => item.key === activeSection);

    if (selectedItem && React.isValidElement(selectedItem.component)) {
        return selectedItem.component;
    }

    console.error("Invalid component for section:", activeSection, selectedItem);
    return <PlaceholderSection title="Error: Component not found" />;
  };


  if (!user || (user?.role === 'employer' && settingsStatus === 'loading' && !activeSection && menuItems.length === 0)) {
    // Show loading only if user exists, is employer, settings are loading, AND there's no active section yet (initial load)
    // and menuItems haven't been populated (which depends on user role)
    return (
        <div className="settings-page-container">
            <div className="settings-content-panel" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)'}}>
                 <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                 <p style={{marginLeft: '1rem', fontSize: '1.2rem'}}>Loading settings...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="settings-page-container">
      <Alert /> {/* Global Alert Display */}
      <div className="settings-navigation-panel">
        <h4 className="settings-panel-title">Settings</h4>
        {menuItems.length > 0 ? (
            <ul className="settings-menu-list">
            {menuItems.map(item => (
                <li
                key={item.key}
                className={`settings-menu-item ${activeSection === item.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveSection(item.key);
                }}
                >
                <FontAwesomeIcon icon={item.icon} className="menu-item-icon" />
                <span>{item.label}</span>
                </li>
            ))}
            </ul>
        ) : (
            <p className="no-settings-available">No settings available for your role.</p>
        )}
      </div>
      <div className="settings-content-panel">
        {renderSection()}
      </div>
    </div>
  );
};

export default SettingsPage;
