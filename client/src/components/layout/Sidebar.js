import React, { useEffect, useRef, useMemo } from "react"; // Import useMemo
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSelector } from "react-redux"; // Import useSelector
import { selectAuthUser } from "../../redux/slices/authSlice"; // Import your user selector

import { faHome, faMap, faIdCard, faUsers, faPen, faCalendar, faCar, faTabletAlt } from "@fortawesome/free-solid-svg-icons"; // Keep all icons
import "../../styles/Sidebar.scss";

const Sidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const user = useSelector(selectAuthUser); // Get the logged-in user

  // Effect for closing sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        if (isOpen) { // Only toggle if it's open
          toggleSidebar();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, toggleSidebar]);

  // Handler for menu item click
  const handleMenuItemClick = () => {
    if (isOpen) { // Close sidebar if it's open
      toggleSidebar();
    }
  };

  // Define all possible menu items.
  // The 'roles' array indicates which roles can see this item.
  // If 'roles' is undefined, it's visible to all authenticated users by default (or adjust logic as needed).
  const allMenuItems = useMemo(() => [
    { path: "/dashboard", icon: faHome, label: "Dashboard" },
    { path: "/map", icon: faMap, label: "Map", roles: ['employer'] }, // Employer only
    { path: "/timesheet", icon: faPen, label: "Timesheets" },
    { path: "/rosterpage", icon: faCalendar, label: "Rosters" },
    { path: "/clients", icon: faUsers, label: "Clients" },
    { path: "/employees", icon: faIdCard, label: "Employees", roles: ['employer'] }, // Employer only
    { path: "/vehicles", icon: faCar, label: "Vehicles", roles: ['employer'] }, // Employer only
    // { path: "/tabletview", icon: faTabletAlt, label: "Tablet View", roles: ['employer'] }, // Example commented out
  ], []);

  // Filter menu items based on user role
  const menuItems = useMemo(() => {
    if (user?.role === 'employee') {
      const employeeAllowedLabels = ["Dashboard", "Timesheets", "Rosters", "Clients"];
      return allMenuItems.filter(item => employeeAllowedLabels.includes(item.label));
    }
    // For employers or other roles, show all items that don't have a specific 'roles' restriction or include their role.
    // In this case, if not 'employee', we assume 'employer' and show items meant for them or for all.
    return allMenuItems.filter(item => !item.roles || item.roles.includes('employer'));
  }, [user, allMenuItems]);

  // Render
  return (
    <aside ref={sidebarRef} className={`sidebar ${isOpen ? "open" : ""}`}>
      <ul className="sidebar-menu">
        {menuItems.map(({ path, icon, label }) => (
          <li key={path} className={location.pathname === path ? "active" : ""}>
            <Link to={path} onClick={handleMenuItemClick}>
              <FontAwesomeIcon icon={icon} className="sidebar-icon" />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
