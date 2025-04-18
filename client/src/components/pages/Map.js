import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMap, faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import "/home/digilab/timesheet/client/src/styles/Map.scss"; 

const Map = () => {
  const [viewType, setViewType] = useState("Daily");
  const [selectedEmployee, setSelectedEmployee] = useState("All");
  const [employees, setEmployees] = useState([]);
  const [dateRange, setDateRange] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });

  useEffect(() => {
    // Fetch employees from the database
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/employees", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setEmployees(data);
        } else {
          console.error("Expected an array of employees, but got:", data);
          setEmployees([]);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        setEmployees([]);
      }
    };

    fetchEmployees();

    // Update date range based on the view type
    const updateDateRange = () => {
      let startDate, endDate;
      if (viewType === "Daily") {
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
        setDateRange(`${startDate.toLocaleDateString("en-US")}`);
      } else if (viewType === "Weekly") {
        const weekStart = currentDate.getDate() - currentDate.getDay();
        const weekEnd = weekStart + 6;
        startDate = new Date(currentDate.setDate(weekStart));
        endDate = new Date(currentDate.setDate(weekEnd));
        setDateRange(`${startDate.toLocaleDateString("en-US")} - ${endDate.toLocaleDateString("en-US")}`);
      } else if (viewType === "Fortnightly") {
        const fortnightStart = currentDate.getDate() - currentDate.getDay();
        const fortnightEnd = fortnightStart + 13;
        startDate = new Date(currentDate.setDate(fortnightStart));
        endDate = new Date(currentDate.setDate(fortnightEnd));
        setDateRange(`${startDate.toLocaleDateString("en-US")} - ${endDate.toLocaleDateString("en-US")}`);
      } else if (viewType === "Monthly") {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        startDate = monthStart;
        endDate = monthEnd;
        setDateRange(`${startDate.toLocaleDateString("en-US")} - ${endDate.toLocaleDateString("en-US")}`);
      }
    };

    updateDateRange();
  }, [viewType, currentDate]);

  const handlePrevClick = () => {
    const newDate = new Date(currentDate);
    if (viewType === "Daily") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewType === "Weekly") {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewType === "Fortnightly") {
      newDate.setDate(newDate.getDate() - 14);
    } else if (viewType === "Monthly") {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextClick = () => {
    const newDate = new Date(currentDate);
    if (viewType === "Daily") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewType === "Weekly") {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewType === "Fortnightly") {
      newDate.setDate(newDate.getDate() + 14);
    } else if (viewType === "Monthly") {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

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

      {/* Date Range Display */}
      <div className="date-range">
        <h3>{dateRange}</h3>
      </div>

      {/* Navigation Controls */}
      <div className="map-navigation">
        <button className="nav-button" onClick={handlePrevClick}>
          <FontAwesomeIcon icon={faArrowLeft} /> Prev
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
        <button className="nav-button" onClick={handleNextClick}>
          Next <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

      {/* Marker Filters & Employee Selection */}
      <div className="styles_Map_thirdRow">
        <div className="Map">
          <h3>Marker Filters:</h3>
          <div className="check-box">
            <label>
              <input type="checkbox" /> Show Start Location
            </label>
            <label>
              <input type="checkbox" /> Show End Location
            </label>
          </div>
        </div>
        <div className="Map">
          <h4>Select Employee:</h4>
          <div className="select-container">
            <label htmlFor="employee">Employee</label>
            <select
              id="employee"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="All">All Employees</option>
              {Array.isArray(employees) &&
                employees.map((employee, index) => (
                  // Use employee.id if available, otherwise fallback on employee._id, or employee.name and index
                  <option
                    key={employee.id || employee._id || `${employee.name}-${index}`}
                    value={employee.name}
                  >
                    {employee.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Google Map Section */}
      <LoadScript googleMapsApiKey="YOUR_ACTUAL_GOOGLE_MAPS_API_KEY">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "400px" }}
          center={mapCenter}
          zoom={12}
        >
          {/* Add markers for employees or other locations here */}
          <Marker position={mapCenter} />
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default Map;
