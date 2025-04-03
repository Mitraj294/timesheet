import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMap, faHome, faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import "/home/digilab/timesheet/timesheet-mern/client/src/styles/Map.scss"; 
const Map = () => {
  const [viewType, setViewType] = useState("Daily");
  const [selectedEmployee, setSelectedEmployee] = useState("All");

  return (
    <div className="map-container">

       {/* Header Section */}
             <div className="employees-header">
              <h1><FontAwesomeIcon icon={faMap} /> Map</h1>
            </div>
      
      
            {/* Breadcrumb Navigation */}
            <div className="breadcrumb">
              <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link> 
              <span> / </span>
               <span>Map</span>
            </div>

      {/* Navigation Controls */}
      <div className="map-navigation">
        <button className="nav-button">
          <FontAwesomeIcon icon={faArrowLeft} /> Prev Week
        </button>

        <div className="select-container">
          <label htmlFor="viewType">ViewType</label>
          <select id="viewType" value={viewType} onChange={(e) => setViewType(e.target.value)}>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Fortnightly">Fortnightly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>

        <button className="nav-button">
          Next Week <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

      {/* Marker Filters & Employee Selection */}
      <div className="styles_Map_thirdRow">
        <div className="Map">
          <h3>Marker Filters:</h3>
          <div className="check-box">
            {/* Add checkboxes for filtering markers */}
          </div>
        </div>
        <div className="Map">
          <h4>Select Employee:</h4>
          <div className="select-container">
            <label htmlFor="employee">Employee</label>
            <select id="employee" value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
              <option value="All">All Employees</option>
              <option value="meet">Meet</option>
              <option value="raj">Raj</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
