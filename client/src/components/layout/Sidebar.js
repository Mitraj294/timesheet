import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { faHome, faMap, faIdCard, faUsers, faPen, faCalendar, faCar, faTabletAlt } from "@fortawesome/free-solid-svg-icons";
import "../../styles/Sidebar.scss";

const Sidebar = () => {
  // Get sidebar state and toggle function from context
  const { isOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        // Close sidebar if click is outside and sidebar is open
        toggleSidebar();
      }
    };

    if (isOpen) {
      // Add listener only when sidebar is open
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup listener on component unmount or when sidebar closes
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, toggleSidebar]);

  const handleMenuItemClick = () => {
    toggleSidebar();
  // Close sidebar when a menu item is clicked
  };

  const menuItems = [
    // Define sidebar menu items
    { path: "/dashboard", icon: faHome, label: "Dashboard" },
    { path: "/map", icon: faMap, label: "Map" },
    { path: "/timesheet", icon: faPen, label: "Timesheets" },
    { path: "/rosterpage", icon: faCalendar, label: "Rosters" },
    { path: "/clients", icon: faUsers, label: "Clients" },
    { path: "/employees", icon: faIdCard, label: "Employees" },
   // { path: "/tabletview", icon: faTabletAlt, label: "Tablet View" },
  ];

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
