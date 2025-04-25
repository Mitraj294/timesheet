import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
// Correct: Hooks called at the top level
import { useSelector, useDispatch } from "react-redux";
import { logout, resetAuth } from "../../redux/slices/authSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCog, faSignOutAlt, faUser } from "@fortawesome/free-solid-svg-icons";
import "../../styles/Navbar.scss";

const Navbar = () => {
  // Correct: Hooks called at the top level
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
      // navigate("/login"); // Commented out for review, assuming this is intentional for now
    }
  }, [isAuthenticated, navigate]); // Correct dependencies

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (!confirmLogout) return;

    console.log(" Logout confirmed!");

    try {
      // Correct: Using the 'dispatch' variable obtained from the top-level hook call
      await dispatch(logout());
      dispatch(resetAuth());

      // Minor Issue: Calling useSelector inside a handler is still a hook violation.
      // It might not crash here, but it's best practice to avoid it.
      // Consider logging state *before* reset if needed, or removing this log.
      // console.log(" Redux after reset:", useSelector((state) => state.auth));

      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };


  return (
    <nav className="navbar">
      {/* ... rest of the JSX ... */}
      <button className="navbar-icon logout-btn" onClick={handleLogout}>
        <FontAwesomeIcon icon={faSignOutAlt} />
      </button>
      {/* ... rest of the JSX ... */}
    </nav>
  );
};

export default Navbar;
