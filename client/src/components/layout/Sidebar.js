import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { faHome, faMap, faIdCard, faUsers, faPen, faCalendar, faCar, faTabletAlt } from "@fortawesome/free-solid-svg-icons";
import "../../styles/Sidebar.scss";

const Sidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const sidebarRef = useRef(null);

  // Effect for closing sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        toggleSidebar();
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
    toggleSidebar(); // Close sidebar when a menu item is clicked
  };

  const menuItems = [
    { path: "/dashboard", icon: faHome, label: "Dashboard" },
    { path: "/map", icon: faMap, label: "Map" },
    { path: "/timesheet", icon: faPen, label: "Timesheets" },
    { path: "/rosterpage", icon: faCalendar, label: "Rosters" },
    { path: "/clients", icon: faUsers, label: "Clients" },
    { path: "/employees", icon: faIdCard, label: "Employees" },
    { path: "/vehicles", icon: faCar, label: "Vehicles" },
   // { path: "/tabletview", icon: faTabletAlt, label: "Tablet View" },
  ];

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
