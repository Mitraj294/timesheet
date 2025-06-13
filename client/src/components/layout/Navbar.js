import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../redux/slices/authSlice";
import { setAlert } from "../../redux/slices/alertSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faCog,
  faSignOutAlt,
  faSpinner,
  faCaretDown,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import Alert from "./Alert";
import "../../styles/Navbar.scss";

const Navbar = () => {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef(null);

  // Get user and tablet view state from Redux
  const isTabletViewUnlocked = useSelector(state => state.auth?.isTabletViewUnlocked);
  const user = useSelector(state => state.auth?.user);
  const userName = user?.name || "Guest";
  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Unknown";

  // Show logout confirmation dialog
  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setShowLogoutConfirm(true);
    console.log("[Navbar] Logout button clicked, showing confirmation dialog");
  };

  // Confirm logout
  const confirmLogoutAction = () => {
    setIsLoggingOut(true);
    console.log("[Navbar] Confirming logout");
    dispatch(logout());
    dispatch(setAlert('Logout successful!', 'success'));
    navigate("/login");
    // No need to reset state, navigation will re-render
  };

  // Cancel logout
  const cancelLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(false);
    console.log("[Navbar] Logout cancelled");
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    console.log("[Navbar] Component mounted");
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="navbar">
        <Alert />
        {/* Sidebar toggle button, hidden if tablet view is unlocked */}
        {!isTabletViewUnlocked && (
          <div className="navbar-section">
            <button
              className="navbar-icon-button menu-button"
              onClick={() => {
                toggleSidebar();
                console.log("[Navbar] Sidebar toggle button clicked");
              }}
              aria-label="Toggle Sidebar"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>
        )}

        <div className="navbar-section navbar-logo-container">
          <img src="/img/logoNav.png" alt="TimeSheet Logo" className="navbar-logo-icon" />
          <div className="navbar-title-role">
            <h4 className="navbar-logo-text">TimeSheet</h4>
            {user && user.role && !isTabletViewUnlocked && (
              <span className="navbar-user-role-text">{userRole}</span>
            )}
          </div>
        </div>

        {/* User dropdown menu */}
        {!isTabletViewUnlocked && user && (
          <div className="navbar-section navbar-user-nav" ref={dropdownRef}>
            <button
              className="navbar-user-button"
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen);
                console.log("[Navbar] User dropdown toggled:", !isDropdownOpen);
              }}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
            >
              <FontAwesomeIcon icon={faUserCircle} className="navbar-user-avatar-icon" />
              <span className="navbar-user-name">{userName}</span>
              <FontAwesomeIcon icon={faCaretDown} className="navbar-user-caret" />
            </button>
            {isDropdownOpen && (
              <div className="navbar-user-dropdown">
                <Link
                  to="/settings"
                  className="navbar-dropdown-link"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    console.log("[Navbar] Navigating to settings from dropdown");
                  }}
                >
                  <FontAwesomeIcon icon={faCog} className="navbar-dropdown-icon" />
                  Settings
                </Link>
                <button
                  className="navbar-dropdown-link logout-button"
                  onClick={handleLogoutClick}
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="navbar-dropdown-icon" />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logout confirmation dialog */}
      {showLogoutConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-dialog">
            <h4>Confirm Logout</h4>
            <p>Are you sure you want to log out?</p>
            <div className="logout-confirm-actions">
              <button className="btn btn-secondary" onClick={cancelLogout} disabled={isLoggingOut}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmLogoutAction} disabled={isLoggingOut}>
                {isLoggingOut ? <><FontAwesomeIcon icon={faSpinner} spin /> Logging Out...</> : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;