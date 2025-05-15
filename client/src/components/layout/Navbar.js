// /home/digilab/timesheet/client/src/components/layout/Navbar.js
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { useSelector, useDispatch } from "react-redux";
import { logout, selectAuthUser, selectIsTabletViewUnlocked } from "../../redux/slices/authSlice";
import { setAlert } from "../../redux/slices/alertSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faCog,
  faSignOutAlt,
  // faUser, // This was in your provided code but not used, faUserCircle is used below
  faSpinner,
  faCaretDown,
  faUserCircle, // Used for the user avatar
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

  const isTabletViewUnlocked = useSelector(selectIsTabletViewUnlocked);
  const { user } = useSelector((state) => state.auth || {}); // Ensure state.auth exists
  const userName = user?.name || "Guest";
  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Unknown";

  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogoutAction = () => {
    setIsLoggingOut(true);
    dispatch(logout());
    dispatch(setAlert('Logout successful!', 'success'));
    navigate("/login");
    // No need to manually set setShowLogoutConfirm and setIsLoggingOut to false here,
    // as the component will unmount or re-render due to navigation and state change.
    // However, if navigation was conditional, you'd reset them.
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(false); // Ensure this is reset if cancel is clicked
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <>
      <div className="navbar">
        <Alert /> {/* Alert component should be self-contained */}
        {/* Hide the sidebar toggle button if tablet view is unlocked */}
        {!isTabletViewUnlocked && (
          <div className="navbar-section">
            <button className="navbar-icon-button menu-button" onClick={toggleSidebar} aria-label="Toggle Sidebar">
              <FontAwesomeIcon icon={faBars} />
            </button> {/* This button tag was correctly closed */}
          </div>
        )} {/* This closing curly brace and parenthesis correctly closes the conditional block */}

        <div className="navbar-section navbar-logo-container">
          <img src="/img/logoNav.png" alt="TimeSheet Logo" className="navbar-logo-icon" />
          <div className="navbar-title-role">
            <h4 className="navbar-logo-text">TimeSheet</h4>
            {user && user.role && !isTabletViewUnlocked && (
              <span className="navbar-user-role-text">{userRole}</span>
            )}
          </div>
        </div>

        {!isTabletViewUnlocked && user && (
          <div className="navbar-section navbar-user-nav" ref={dropdownRef}>
            <button className="navbar-user-button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} aria-haspopup="true" aria-expanded={isDropdownOpen}>
              <FontAwesomeIcon icon={faUserCircle} className="navbar-user-avatar-icon" />
              <span className="navbar-user-name">{userName}</span>
              <FontAwesomeIcon icon={faCaretDown} className="navbar-user-caret" />
            </button>
            {isDropdownOpen && (
              <div className="navbar-user-dropdown">
                <Link to="/settings" className="navbar-dropdown-link" onClick={() => setIsDropdownOpen(false)}>
                  <FontAwesomeIcon icon={faCog} className="navbar-dropdown-icon" />
                  Settings
                </Link>
                <button className="navbar-dropdown-link logout-button" onClick={handleLogoutClick}>
                  <FontAwesomeIcon icon={faSignOutAlt} className="navbar-dropdown-icon" />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
