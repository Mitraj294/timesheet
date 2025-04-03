import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faArrowLeft, faArrowRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import axios from "axios"; // Import Axios for API calls
import "../../styles/Timesheet.scss";

const Timesheet = () => {
  const [viewType, setViewType] = useState("Daily");
  const [timesheets, setTimesheets] = useState([]); // Store timesheets
  const navigate = useNavigate();

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const fetchTimesheets = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/timesheets");
      setTimesheets(response.data); // Store the data in state
      console.log(" Fetched Timesheets:", response.data);
    } catch (error) {
      console.error(" Error fetching timesheets:", error.response?.data || error.message);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    let startDate, endDate;

    switch (viewType) {
      case "Daily":
        return today.toDateString();
      case "Weekly":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case "Fortnightly":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - (today.getDay() + 7));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 13);
        break;
      case "Monthly":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
        return "";
    }

    return `${startDate.toDateString()} - ${endDate.toDateString()}`;
  };

  return (
    <div className="Timesheet-container">
      <div className="timesheet-header">
        <h1>
          <FontAwesomeIcon icon={faPen} /> Timesheet
        </h1>
      </div>

      <div className="breadcrumb">
        <Link to="/dashboard" className="breadcrumb-link">Dashboard</Link>
        <span> / </span>
        <span>Timesheet</span>
      </div>

      <div className="timesheet-top-bar">
        <div className="timesheet-period">{getDateRange()}</div>

        <div className="timesheet-navigation">
          <button className="nav-button"><FontAwesomeIcon icon={faArrowLeft} /> Prev</button>
          <select id="viewType" value={viewType} onChange={(e) => setViewType(e.target.value)} className="view-type-dropdown">
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Fortnightly">Fortnightly</option>
            <option value="Monthly">Monthly</option>
          </select>
          <button className="nav-button">Next <FontAwesomeIcon icon={faArrowRight} /></button>
        </div>

        <button className="create-timesheet-btn" onClick={() => navigate("/timesheet/create")}>
          <FontAwesomeIcon icon={faPlus} /> Create Timesheet
        </button>
      </div>

      {/* Timesheet Table */}
      <table className="timesheet-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Date</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Total Hours</th>
            <th>Leave Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {timesheets.length > 0 ? (
            timesheets.map((timesheet) => (
              <tr key={timesheet._id}>
                <td>{timesheet.employeeId?.name || "Unknown"}</td>
                <td>{new Date(timesheet.date).toDateString()}</td>
                <td>{timesheet.startTime}</td>
                <td>{timesheet.endTime}</td>
                <td>{timesheet.totalHours} hrs</td>
                <td>{timesheet.leaveType}</td>
                <td>{timesheet.description || "N/A"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7">No timesheets found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Timesheet;
