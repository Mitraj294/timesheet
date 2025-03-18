import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./styles/App.css";  
const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef(null);
  const menuButtonRef = useRef(null);

  const toggleSidebar = (event) => {
    event.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <>
      {/* Menu Button */}
      <button
        ref={menuButtonRef}
        className="menu-button"
        onClick={toggleSidebar}
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside ref={sidebarRef} className={`sidebar ${isOpen ? "open" : ""}`}>
        <ul className="sidebar-menu">
          <li><Link to="/dashboard"><i className="fas fa-home"></i> Dashboard</Link></li>
          <li><Link to="/map"><i className="fas fa-map"></i> Map</Link></li>
          <li><Link to="/employees"><i className="fas fa-id-card"></i> Employees</Link></li>
          <li><Link to="/clients"><i className="fas fa-users"></i> Clients</Link></li>
        </ul>
      </aside>
    </>
  );
};

export default Sidebar;
