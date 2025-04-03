import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { useSelector, useDispatch } from "react-redux";
import { logout, resetAuth } from "../../redux/slices/authSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCog, faSignOutAlt, faUser } from "@fortawesome/free-solid-svg-icons";
import "../../styles/Navbar.scss";

const Navbar = () => {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userName = user?.name || "Guest";
  const userRole = user?.role || "Unknown";

  useEffect(() => {
    console.log(" Auth State Changed:", { isAuthenticated, user });
  }, [isAuthenticated, user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log(" User not authenticated! Redirecting to Login...");
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return; // Exit if user cancels
  
    console.log(" Logout confirmed!");
  
    try {
      await dispatch(logout()); // Dispatch logout action
      dispatch(resetAuth()); // Reset Redux state
  
      console.log(" Redux after reset:", useSelector((state) => state.auth));
  
      navigate("/login"); // Redirect to login page
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  

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
