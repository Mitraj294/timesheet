// /home/digilab/timesheet/client/src/components/layout/Navbar.js
import React, { useState, useEffect, useRef } from "react"; // Added useState, useRef
import { Link, useNavigate } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { useSelector, useDispatch } from "react-redux";
// Remove resetAuth from import if it doesn't exist
import { logout } from "../../redux/slices/authSlice"; // Assuming logout action exists
import { setAlert } from "../../redux/slices/alertSlice"; // Import setAlert
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faCog,
  faSignOutAlt,
  faUser,
  faCaretDown // Added for dropdown
} from "@fortawesome/free-solid-svg-icons";
import Alert from "./Alert"; // Import the Alert component
import "../../styles/Navbar.scss";

const Navbar = () => {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for dropdown
  const dropdownRef = useRef(null); // Ref for dropdown click outside
  // Select isAuthenticated and user safely
  const { isAuthenticated, user } = useSelector((state) => state.auth || {}); // Default to empty object if auth state is undefined initially
  const userName = user?.name || "Guest";
  const userRole = user?.role || "Unknown";

  // This effect might run too early if auth state isn't ready, consider adding a loading check
  // useEffect(() => {
  //   console.log(" Auth State Changed:", { isAuthenticated, user });
  // }, [isAuthenticated, user]);

  // Redirect to login if not authenticated (consider adding a check for initial loading state)
  // useEffect(() => {
  //   // Add a check like: if (!isLoadingAuth && !isAuthenticated)
  //   if (!isAuthenticated) {
  //     console.log(" User not authenticated! Redirecting to Login...");
  //     navigate("/login");
  //   }
  // }, [isAuthenticated, navigate /*, isLoadingAuth */]);

  const handleLogout = () => { // Removed async as dispatch is synchronous here
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return; // Exit if user cancels

    console.log(" Logout confirmed!");

    // Dispatch the logout action - this handles state reset and localStorage removal
    dispatch(logout());

    // Show success alert
    dispatch(setAlert('Logout successful!', 'success'));

    // No need for resetAuth() if logout reducer does the job
    // dispatch(resetAuth()); // <-- REMOVE THIS LINE

    // Navigate to login after state is updated
    navigate("/login");

    // No try/catch needed for synchronous dispatch unless logout itself was an async thunk (which it usually isn't)
  };

  // Close dropdown if clicked outside
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
    <div className="navbar"> {/* Changed nav to div to match example, class is key */}
      <Alert /> {/* Render Alert component, often positioned globally or in App.js, but can be here too */}

      {/* Left Section: Sidebar Toggle */}
      <div className="navbar-section">
        <button className="navbar-icon-button menu-button" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>

      {/* Center Section: Logo, Title, Role */}
      <div className="navbar-section navbar-logo-container">
        <img src="/img/logoNav.png" alt="TimeSheet Logo" className="navbar-logo-icon" /> {/* Logo First */}
        <div className="navbar-title-role"> {/* Group Title and Role */}
          <h4 className="navbar-logo-text">TimeSheet</h4>
          <span className="navbar-user-role-text">{userRole}</span> {/* Role in parentheses */}
        </div>
      </div>

      {/* Right Section: User Dropdown */}
      <div className="navbar-section navbar-user-nav" ref={dropdownRef}>
        <button className="navbar-user-button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} aria-haspopup="true" aria-expanded={isDropdownOpen}>
          <span className="navbar-user-name">{userName}</span>
          <FontAwesomeIcon icon={faCaretDown} className="navbar-user-caret" />
        </button>
        {isDropdownOpen && (
          <div className="navbar-user-dropdown">
            {/* Links are already block elements by default, will stack vertically */}
            <Link to="/settings" className="navbar-dropdown-link" onClick={() => setIsDropdownOpen(false)}>
              <FontAwesomeIcon icon={faCog} className="navbar-dropdown-icon" />
              Settings
            </Link>
            {/* Use button for logout action */}
            <button className="navbar-dropdown-link logout-button" onClick={handleLogout}>
              <FontAwesomeIcon icon={faSignOutAlt} className="navbar-dropdown-icon" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
