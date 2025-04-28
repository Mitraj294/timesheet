// /home/digilab/timesheet/client/src/components/layout/Navbar.js
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { useSelector, useDispatch } from "react-redux";
// Remove resetAuth from import if it doesn't exist
import { logout } from "../../redux/slices/authSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCog, faSignOutAlt, faUser } from "@fortawesome/free-solid-svg-icons";
import "../../styles/Navbar.scss";

const Navbar = () => {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

    // No need for resetAuth() if logout reducer does the job
    // dispatch(resetAuth()); // <-- REMOVE THIS LINE

    // Navigate to login after state is updated
    navigate("/login");

    // No try/catch needed for synchronous dispatch unless logout itself was an async thunk (which it usually isn't)
  };


  // Render null or a placeholder if not authenticated to avoid errors before redirect
  // if (!isAuthenticated) {
  //    return null; // Or a loading indicator while redirecting
  // }

  return (
    <nav className="navbar">
      {/* Sidebar Toggle Button */}
      <button className="menu-button" onClick={toggleSidebar}>
        <FontAwesomeIcon icon={faBars} />
      </button>

      {/* Logo & App Name */}
      <div className="navbar-center">
        <img src="/img/logoNav.png" alt="TimeSheet Logo" className="navbar-logo" />
        <h4 className="logo">TimeSheet</h4>
        <span className="user-role">{userRole}</span>
      </div>

      {/* User Info & Actions */}
      <div className="navbar-user">
        <FontAwesomeIcon icon={faUser} className="user-icon" />
        <span className="username">{userName}</span>

        {/* Settings Button */}
        <Link to="/settings" className="navbar-icon">
          <FontAwesomeIcon icon={faCog} />
        </Link>

        {/* Logout Button */}
        <button className="navbar-icon logout-btn" onClick={handleLogout}>
          <FontAwesomeIcon icon={faSignOutAlt} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
