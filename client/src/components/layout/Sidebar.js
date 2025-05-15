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

const Sidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const user = useSelector(selectAuthUser);
  const showVehiclesTabSetting = useSelector(selectShowVehiclesTabInSidebar); // Get the setting state

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
    { path: "/tabletview", icon: faTabletAlt, label: "Tablet View" }, // Keep if potentially used
  ], []);

  // Filter and conditionally add/remove menu items based on user role and settings.
  const menuItems = useMemo(() => {
    let itemsToDisplay = [];

    // If no user is logged in, show no menu items
    if (!user) {
        return [];
    }

    // Define which paths are generally allowed for each role
    const employeeAllowedPaths = new Set(["/dashboard", "/timesheet", "/rosterpage", "/clients"]);
    const employerAllowedPaths = new Set(["/dashboard", "/map", "/timesheet", "/rosterpage", "/clients", "/employees", "/vehicles", "/tabletview"]); // Include all employer-specific paths here

    // Filter base items based on the user's role
    if (user.role === 'employee') {
        itemsToDisplay = baseMenuItems.filter(item => employeeAllowedPaths.has(item.path));

        // --- NEW LOGIC FOR EMPLOYEES AND VEHICLES SETTING ---
        // If the 'showVehiclesTabSetting' is true, add the Vehicles item for employees
        if (showVehiclesTabSetting) {
             const vehiclesItem = baseMenuItems.find(item => item.path === "/vehicles");
             // Add it only if it exists in baseMenuItems and isn't already in the list
             if (vehiclesItem && !itemsToDisplay.find(item => item.path === "/vehicles")) {
                 itemsToDisplay.push(vehiclesItem);
             }
        }
        // --- END NEW LOGIC ---

    } else if (user.role === 'employer') {
        // Employers see items allowed for them
        itemsToDisplay = baseMenuItems.filter(item => employerAllowedPaths.has(item.path));

        // --- LOGIC FOR EMPLOYERS AND VEHICLES SETTING ---
        // If the 'showVehiclesTabSetting' is false, remove the Vehicles item for employers
        if (!showVehiclesTabSetting) {
            itemsToDisplay = itemsToDisplay.filter(item => item.path !== '/vehicles');
        }
        // Note: If showVehiclesTabSetting is true, the Vehicles item is already included
        // because "/vehicles" is in the employerAllowedPaths set.
        // --- END LOGIC ---

    } else {
        // Handle other roles (e.g., admin) if necessary, or return empty array
        return [];
    }

    // Optional: Define a specific order for menu items and sort the `itemsToDisplay` array.
    // This ensures consistent order regardless of how items were added/filtered.
    const desiredOrder = ["/dashboard", "/map", "/timesheet", "/rosterpage", "/clients", "/employees", "/vehicles", "/tabletview"]; // Example desired order
    itemsToDisplay.sort((a, b) => desiredOrder.indexOf(a.path) - desiredOrder.indexOf(b.path));


    return itemsToDisplay;
  }, [user, baseMenuItems, showVehiclesTabSetting]); // Dependencies include user, base items, and the setting

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
