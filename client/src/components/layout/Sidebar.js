// /home/digilab/timesheet/client/src/components/layout/Sidebar.js
import React, { useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSelector } from "react-redux";
import { selectAuthUser } from "../../redux/slices/authSlice";
import { selectShowVehiclesTabInSidebar } from "../../redux/slices/settingsSlice"; // Import the selector

import {
    faHome,
    faMap,
    faIdCard,
    faUsers,
    faPen,
    faCalendar,
    faCar,
    faTabletAlt // Assuming this might be used later
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/Sidebar.scss";

import { selectIsTabletViewUnlocked } from "../../redux/slices/authSlice"; // Import the new selector

const Sidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const user = useSelector(selectAuthUser);
  const showVehiclesTabSetting = useSelector(selectShowVehiclesTabInSidebar); // Get the setting state

  const isTabletViewUnlocked = useSelector(selectIsTabletViewUnlocked); // Read the new state

  // Effect to close sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        if (isOpen) {
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

  // Handler to close sidebar when a menu item is clicked (useful on mobile)
  const handleMenuItemClick = () => {
    if (isOpen) {
      toggleSidebar();
    }
  };

  // Define base menu items that are potentially available to *any* user role.
  // Role restrictions and settings visibility are handled in the menuItems useMemo below.
  const baseMenuItems = useMemo(() => [
    { path: "/dashboard", icon: faHome, label: "Dashboard" },
    { path: "/map", icon: faMap, label: "Map" },
    { path: "/timesheet", icon: faPen, label: "Timesheets" },
    { path: "/rosterpage", icon: faCalendar, label: "Rosters" },
    { path: "/clients", icon: faUsers, label: "Clients" },
    { path: "/employees", icon: faIdCard, label: "Employees" },
    { path: "/vehicles", icon: faCar, label: "Vehicles" },
    { path: "/tablet-view", icon: faTabletAlt, label: "Tablet View" }, // Updated path for Tablet View
  ], []);

  // Filter and conditionally add/remove menu items based on user role and settings.
  const menuItems = useMemo(() => {
    let itemsToDisplay = [];

    // If no user is logged in or user object is incomplete, show no menu items
    if (!user) {
        return [];
    }

    // Define which paths are generally allowed for each role
    // Remove "/vehicles" from default role paths. It will be added based on the setting.
    // Add "/tablet-view" to employee allowed paths
    const employeeAllowedPaths = new Set(["/dashboard", "/timesheet", "/rosterpage", "/clients", "/tablet-view"]);
    const employerAllowedPaths = new Set(["/dashboard", "/map", "/timesheet", "/rosterpage", "/clients", "/employees", "/tablet-view"]);

    // Filter base items based on the user's role
    if (user.role === 'employee') {
        itemsToDisplay = baseMenuItems.filter(item => employeeAllowedPaths.has(item.path));
    } else if (user.role === 'employer') {
        itemsToDisplay = baseMenuItems.filter(item => employerAllowedPaths.has(item.path));
    } else {
        return [];
    }

    // Add "Vehicles" tab if the setting is true AND it's a valid base menu item.
    // This applies to both roles, as the role-specific filtering above no longer includes/excludes vehicles by default.
    if (showVehiclesTabSetting) {
        const vehiclesItem = baseMenuItems.find(item => item.path === "/vehicles");
        // Ensure it's a valid base item and not somehow already added (though it shouldn't be with current logic)
        if (vehiclesItem && !itemsToDisplay.some(item => item.path === "/vehicles")) {
            itemsToDisplay.push(vehiclesItem);
        }
    }

    // Optional: Define a specific order for menu items and sort the `itemsToDisplay` array.
    // This ensures consistent order regardless of how items were added/filtered.
    const desiredOrder = ["/dashboard", "/map", "/timesheet", "/rosterpage", "/clients", "/employees", "/vehicles", "/tablet-view"]; // Updated desired order
    itemsToDisplay.sort((a, b) => desiredOrder.indexOf(a.path) - desiredOrder.indexOf(b.path));


    return itemsToDisplay;
  }, [user, baseMenuItems, showVehiclesTabSetting]); // Dependencies include user, base items, and the setting

  // If tablet view is unlocked, hide the sidebar completely
  if (isTabletViewUnlocked) {
    return null;
  }

  // Render the sidebar only if tablet view is NOT unlocked
  return (
    <aside ref={sidebarRef} className={`sidebar ${isOpen ? "open" : ""}`}>
      <ul className="sidebar-menu">
        {/* Map over the filtered menuItems to render the links */}
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
