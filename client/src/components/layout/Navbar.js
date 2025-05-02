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
  faUser, // faUser is not used, can be removed if desired
  faSpinner, // Added for loading state
  faCaretDown
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
  const { isAuthenticated, user } = useSelector((state) => state.auth || {});
  const userName = user?.name || "Guest";
  const userRole = user?.role || "Unknown";

  const handleLogoutClick = () => {
    setIsDropdownOpen(false);
    setShowLogoutConfirm(true);
  };

  const confirmLogoutAction = () => {
    setIsLoggingOut(true); // Show loading state
    console.log("Logout confirmed!");

    // Dispatch the logout action - this handles state reset and localStorage removal
    dispatch(logout());

    dispatch(setAlert('Logout successful!', 'success'));

    navigate("/login");

    setShowLogoutConfirm(false);
    setIsLoggingOut(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(false);
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
        <Alert />

        <div className="navbar-section">
          <button className="navbar-icon-button menu-button" onClick={toggleSidebar} aria-label="Toggle Sidebar">
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>

        <div className="navbar-section navbar-logo-container">
          <img src="/img/logoNav.png" alt="TimeSheet Logo" className="navbar-logo-icon" />
          <div className="navbar-title-role">
            <h4 className="navbar-logo-text">TimeSheet</h4>
            <span className="navbar-user-role-text">{userRole}</span>
          </div>
        </div>

        <div className="navbar-section navbar-user-nav" ref={dropdownRef}>
          <button className="navbar-user-button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} aria-haspopup="true" aria-expanded={isDropdownOpen}>
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
