// /home/digilab/timesheet/client/src/components/pages/SettingsPage.js
import React, { useState, useMemo, useEffect } from 'react'; // Added useMemo and useEffect
import { useSelector } from 'react-redux'; // Import useSelector
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCog,
  faEnvelopeOpenText,
  faBuilding, // Icon for Employer Details
  // faListAlt, // No longer needed for sidebar header if we change layout
  faFileInvoiceDollar,
  faTabletAlt,
  faCar,
  faBell,
  faCreditCard,
  faTools
} from '@fortawesome/free-solid-svg-icons';
import ManageInvitations from './ManageInvitations';
import UserSettingsSection from './UserSettingsSection';
import EmployerDetailsSection from './EmployerDetailsSection'; // Import the new component
import { selectAuthUser } from '../../redux/slices/authSlice'; // Import user selector
import '../../styles/SettingsPage.scss'; // Styles for the new settings page layout

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
  const user = useSelector(selectAuthUser); // Get the logged-in user from Redux
  const [activeSection, setActiveSection] = useState(() => 'account');

  // Dynamically build menuItems based on user role
  const menuItems = useMemo(() => {
    if (user?.role === 'employee') {
      return [
        { key: 'account', label: 'Account Information', icon: faUserCog, component: <UserSettingsSection /> },
        { key: 'employerDetails', label: 'Employer Details', icon: faBuilding, component: <EmployerDetailsSection /> }, // Render the new component
      ];
    } else if (user?.role === 'employer') {
      return [
        { key: 'account', label: 'Account Information', icon: faUserCog, component: <UserSettingsSection /> },
        { key: 'invitations', label: 'Manage Invitations', icon: faEnvelopeOpenText, component: <ManageInvitations /> },
        { key: 'timesheets', label: 'Timesheets', icon: faFileInvoiceDollar, component: <PlaceholderSection title="Timesheet Settings" /> },
        { key: 'tabletView', label: 'Tablet View', icon: faTabletAlt, component: <PlaceholderSection title="Tablet View Settings" /> },
        { key: 'vehicles', label: 'Vehicles', icon: faCar, component: <PlaceholderSection title="Vehicle Settings" /> },
        { key: 'notifications', label: 'Notifications', icon: faBell, component: <PlaceholderSection title="Notification Settings" /> },
        { key: 'subscription', label: 'Subscription', icon: faCreditCard, component: <PlaceholderSection title="Subscription Management" /> },
      ];
    }
    // Fallback for other roles or if user is not yet loaded (though ideally, this page is protected)
    return [];
  }, [user]); // Recalculate menuItems if the user object changes

  // Adjust default active section if the current one isn't in the menuItems
  useEffect(() => {
    if (menuItems.length > 0 && !menuItems.find(item => item.key === activeSection)) {
      setActiveSection(menuItems[0].key); // Default to the first available item
    } else if (menuItems.length === 0 && activeSection !== null) {
        setActiveSection(null); // No items, no active section
    }
  }, [menuItems, activeSection]);


  const renderSection = () => {
    if (!activeSection) return <PlaceholderSection title="Settings" />; // Handle case with no active section
    const selectedItem = menuItems.find(item => item.key === activeSection);
    return selectedItem ? selectedItem.component : <PlaceholderSection title="Settings" />;
  };

  if (!user) {
    // Optional: Show a loading state or a message if the user object isn't available yet
    // This might be covered by a route guard or a global loading state
    return (
        <div className="settings-page-container">
            <div className="settings-content-panel">
                 <PlaceholderSection title="Loading Settings..." />
            </div>
        </div>
    );
  }

  return (
    <div className="settings-page-container">
      <div className="settings-navigation-panel">
        <h4 className="settings-panel-title">Settings</h4>
        {menuItems.length > 0 ? (
            <ul className="settings-menu-list">
            {menuItems.map(item => (
                <li
                key={item.key}
                className={`settings-menu-item ${activeSection === item.key ? 'active' : ''}`}
                onClick={() => setActiveSection(item.key)}
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
