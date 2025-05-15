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
import EmployerDetailsSection from '../pages/EmployerDetailsSection.js';
import VehicleSettingsSection from './VehicleSettingsSection.js';
import TabletViewSettingsSection from './TabletViewSettingsSection.js'; // This is the one we just created/verified

import { selectAuthUser } from '../../redux/slices/authSlice.js';
import { fetchEmployerSettings, selectSettingsStatus } from '../../redux/slices/settingsSlice.js'; // Import fetchEmployerSettings
import { setAlert } from '../../redux/slices/alertSlice.js';
import '../../styles/SettingsPage.scss';
import Alert from '../layout/Alert.js'; // Assuming Alert component exists

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

  const initialActiveSection = useMemo(() => {
    if (user?.role === 'employee') return 'account';
    if (user?.role === 'employer') return 'account';
    return null;
  }, [user]);

  const [activeSection, setActiveSection] = useState(initialActiveSection);

  useEffect(() => {
    if (user?.role === 'employer' && settingsStatus === 'idle') {
      dispatch(fetchEmployerSettings());
    }
  }, [user, settingsStatus, dispatch]);

  const menuItems = useMemo(() => {
    if (user?.role === 'employee') {
      return [
        { key: 'account', label: 'Account Information', icon: faUserCog, component: <UserSettingsSection /> },
        { key: 'employerDetails', label: 'Employer Details', icon: faBuilding, component: <EmployerDetailsSection /> },
      ];
    } else if (user?.role === 'employer') {
      return [
        { key: 'account', label: 'Account Information', icon: faUserCog, component: <UserSettingsSection /> },
        { key: 'invitations', label: 'Manage Invitations', icon: faEnvelopeOpenText, component: <ManageInvitations /> },
        { key: 'timesheets', label: 'Timesheets', icon: faFileInvoiceDollar, component: <PlaceholderSection title="Timesheet Settings" /> },
        { key: 'tabletView', label: 'Tablet View', icon: faTabletAlt, component: <TabletViewSettingsSection /> },
        { 
          key: 'vehicles', 
          label: 'Vehicles', 
          icon: faCar, 
          component: <VehicleSettingsSection /> 
        },
        { key: 'notifications', label: 'Notifications', icon: faBell, component: <PlaceholderSection title="Notification Settings" /> },
        { key: 'subscription', label: 'Subscription', icon: faCreditCard, component: <PlaceholderSection title="Subscription Management" /> },
      ];
    }
    return [];
  }, [user]); 

  useEffect(() => {
    if (menuItems.length > 0 && !menuItems.find(item => item.key === activeSection)) {
      setActiveSection(menuItems[0].key);
    } else if (menuItems.length === 0 && activeSection !== null) {
        setActiveSection(null);
    }
  }, [menuItems, activeSection]);

  const renderSection = () => {
    if (!activeSection) return <PlaceholderSection title="Settings" />;
    const selectedItem = menuItems.find(item => item.key === activeSection);
    
    // This is where the error happens if selectedItem.component is an object
    if (selectedItem && typeof selectedItem.component === 'function') {
        // This is not how React components are typically rendered from an object.
        // They should be JSX elements: <MyComponent />
        // The 'component' property in menuItems already holds the JSX element.
        return selectedItem.component;
    } else if (selectedItem && React.isValidElement(selectedItem.component)) {
        return selectedItem.component;
    }
    
    // Fallback or error handling if component is not valid
    console.error("Invalid component for section:", activeSection, selectedItem);
    return <PlaceholderSection title="Error: Component not found" />;
  };


  if (!user || (user.role === 'employer' && settingsStatus === 'loading' && !activeSection)) {
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
                  if (item.action) item.action(); // For items that might have direct actions
                  else setActiveSection(item.key);
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
