// /home/digilab/timesheet/client/src/components/layout/Sidebar.js
// Simple, clear, and minimal Sidebar component
import React, { useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../../context/SidebarContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSelector } from "react-redux";
import { selectAuthUser  ,selectIsTabletViewUnlocked} from "../../redux/slices/authSlice";
import { selectShowVehiclesTabInSidebar } from "../../redux/slices/settingsSlice";
import {
    faHome,
    faMap,
    faIdCard,
    faUsers,
    faPen,
    faCalendar,
    faCar,
    faTabletAlt
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/Sidebar.scss";

const Sidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const user = useSelector(selectAuthUser);
  const showVehiclesTabSetting = useSelector(selectShowVehiclesTabInSidebar);
  const isTabletViewUnlocked = useSelector(selectIsTabletViewUnlocked);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside sidebar AND not on the toggle button
      const isToggleButton = event.target.closest('.menu-button');
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && !isToggleButton) {
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

  const handleMenuItemClick = () => {
    if (isOpen) {
      toggleSidebar();
    }
  };

  const baseMenuItems = useMemo(() => [
    { path: "/dashboard", icon: faHome, label: "Dashboard" },
    { path: "/map", icon: faMap, label: "Map" },
    { path: "/timesheet", icon: faPen, label: "Timesheets" },
    { path: "/rosterpage", icon: faCalendar, label: "Rosters" },
    { path: "/clients", icon: faUsers, label: "Clients" },
    { path: "/employees", icon: faIdCard, label: "Employees" },
    { path: "/vehicles", icon: faCar, label: "Vehicles" },
    { path: "/tablet-view", icon: faTabletAlt, label: "Tablet View" },
  ], []);

  const menuItems = useMemo(() => {
    if (!user) return [];
    const employeePaths = ["/dashboard", "/timesheet", "/rosterpage", "/clients", "/tablet-view"];
    const employerPaths = ["/dashboard", "/map", "/timesheet", "/rosterpage", "/clients", "/employees", "/tablet-view"];
    
    // Determine allowed paths based on user role
    let allowedPaths = [];
    if (user.role === "employee") {
      allowedPaths = employeePaths;
    } else if (user.role === "employer") {
      allowedPaths = employerPaths;
    }
    
    let items = baseMenuItems.filter(item => allowedPaths.includes(item.path));
    if (showVehiclesTabSetting) {
      const vehiclesItem = baseMenuItems.find(item => item.path === "/vehicles");
      if (vehiclesItem && !items.some(i => i.path === "/vehicles")) {
        items.push(vehiclesItem);
      }
    }
    const order = ["/dashboard", "/map", "/timesheet", "/rosterpage", "/clients", "/employees", "/vehicles", "/tablet-view"];
    items.sort((a, b) => order.indexOf(a.path) - order.indexOf(b.path));
    return items;
  }, [user, baseMenuItems, showVehiclesTabSetting]);

  if (isTabletViewUnlocked) {
    return null;
  }

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
