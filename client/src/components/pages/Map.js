import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch } from 'react-redux'; // Import useDispatch
import { // Import FontAwesome icons
  faMap,
  faArrowLeft,
  faArrowRight,
  faLocationCrosshairs, // Import an icon for the button
} from '@fortawesome/free-solid-svg-icons';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { ZoomControl } from 'react-leaflet'; // Import ZoomControl
import { setAlert } from '../../redux/slices/alertSlice'; // Ensure this path is correct
import MarkerClusterGroup from 'react-leaflet-cluster'; // Import MarkerClusterGroup from react-leaflet-cluster
import Alert from '../layout/Alert';
import L from 'leaflet';

import { DateTime } from 'luxon'; // Ensure DateTime is imported from luxon
import 'leaflet/dist/leaflet.css';
import '../../styles/Map.scss'; // Import your custom SCSS styles
import 'leaflet.markercluster/dist/MarkerCluster.css'; // CSS for MarkerCluster
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'; // Default theme for MarkerCluster
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix for default Leaflet icon paths when using bundlers like Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

// Helper function to create an SVG string for a map pin
const createPinSVG = (color) => `
  <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
    <path d="M12.5 0C5.596 0 0 5.596 0 12.5C0 19.404 12.5 41 12.5 41S25 19.404 25 12.5C25 5.596 19.404 0 12.5 0Z" fill="${color}"/>
    <circle cx="12.5" cy="12.5" r="4" fill="white"/>
  </svg>
`;

// Define custom SVG-based icons
const greenIcon = new L.DivIcon({
  html: createPinSVG('green'),
  className: 'custom-leaflet-div-icon', // Add a class for potential global styling
  iconSize: [25, 41],
  iconAnchor: [12, 41], // Point of the pin
  popupAnchor: [1, -34] // Popup offset from iconAnchor
});

const redIcon = new L.DivIcon({
  html: createPinSVG('red'),
  className: 'custom-leaflet-div-icon',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});


// Custom function to create cluster icons
const createClusterCustomIcon = function (cluster) {
  const childCount = cluster.getChildCount();
  let c = ' marker-cluster-'; // Base Leaflet class for styling
  if (childCount < 10) {
    c += 'small';
  } else if (childCount < 100) {
    c += 'medium';
  } else {
    c += 'large';
  }

  const markers = cluster.getAllChildMarkers();
  let clusterDateKey = null; // Will hold 'YYYY-MM-DD'
  let allMarkersSameDate = markers.length > 0;

  if (markers.length > 0) {
    clusterDateKey = markers[0].options.locData?.dateOnly; // Get from pre-calculated field
    if (!clusterDateKey) { // If first marker somehow has no dateOnly
        allMarkersSameDate = false;
    } else {
        for (let i = 1; i < markers.length; i++) {
            if (markers[i].options.locData?.dateOnly !== clusterDateKey) {
                allMarkersSameDate = false;
                clusterDateKey = null; // Reset if dates are not all the same
                break;
            }
        }
    }
  } else {
    allMarkersSameDate = false;
  }

  let htmlContent = `<div><span>${childCount}</span>`;
  let additionalClass = '';

  if (allMarkersSameDate && clusterDateKey) {
    const displayDate = DateTime.fromISO(clusterDateKey).toFormat('MMM d'); // e.g., "Oct 26"
    htmlContent += `<span class="cluster-date">${displayDate}</span>`;
    additionalClass = ' single-date'; // Add a class for single-date clusters
  }
  htmlContent += '</div>';

  return new L.DivIcon({
    html: htmlContent,
    className: 'marker-cluster' + c + additionalClass, // Append custom class
    iconSize: new L.Point(40, 40) // Default size, can be adjusted via CSS
  });
};

// Default map center, e.g., company HQ or a general area
const DEFAULT_MAP_CENTER = { lat: 37.7749, lng: -122.4194 };

// MarkerClusterGroup is imported directly.
// React can handle components that are functions or special objects (like forwardRef).
// The previous defensive check for `typeof === 'function'` was too strict for forwardRef components.

const Map = () => {
  const dispatch = useDispatch();

  // Local component state
  const [viewType, setViewType] = useState('Daily');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('All'); // Changed to store ID
  const [employees, setEmployees] = useState([]);
  const [dateRange, setDateRange] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [isLocating, setIsLocating] = useState(false); // Tracks if geolocation is active
  const [showStartLocation, setShowStartLocation] = useState(true); // Checkbox for start location markers
  const [showEndLocation, setShowEndLocation] = useState(true);   // Checkbox for end location markers
  const [locationData, setLocationData] = useState([]); // To store fetched location points for markers

  // Effects
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            dispatch(setAlert('Authentication error. Please log in.', 'danger'));
            return;
        }
        const response = await fetch(`${API_URL}/employees`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
            if (response.status === 401) {
                console.error('Unauthorized: Invalid or expired token.');
                dispatch(setAlert('Session expired. Please log in again.', 'danger'));
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setEmployees(data);
        } else {
          console.error('Expected an array of employees, but got:', data);
          setEmployees([]);
        }
      } catch (error) {
        console.error('Error fetching employees:', error);
        setEmployees([]);
        dispatch(setAlert(`Error fetching employees: ${error.message}`, 'danger'));
      }
    };

    fetchEmployees();

    const updateDateRange = () => {
        let startDateStr, endDateStr;
        const baseDt = DateTime.fromJSDate(new Date(currentDate)); // Use Luxon DateTime
        // Determine date range string based on viewType
        if (viewType === 'Daily') {
            setDateRange(baseDt.toLocaleString(DateTime.DATE_HUGE)); // e.g., "October 26, 2023"
        } else {
            let startDt, endDt;

            if (viewType === 'Weekly') {
                // Luxon's startOf('week') defaults to Monday, endOf('week') to Sunday
                startDt = baseDt.startOf('week');
                endDt = baseDt.endOf('week');
            } else if (viewType === 'Fortnightly') {
                // Assuming week starts on Monday for consistency with previous logic
                startDt = baseDt.startOf('week'); // Monday
                endDt = startDt.plus({ days: 13 }).endOf('day'); // Sunday, two weeks later
            } else if (viewType === 'Monthly') {
                startDt = baseDt.startOf('month');
                endDt = baseDt.endOf('month');
            }
            startDateStr = startDt.toLocaleString(DateTime.DATE_MED); // e.g., "Oct 26, 2023"
            endDateStr = endDt.toLocaleString(DateTime.DATE_MED);
            setDateRange(`${startDateStr} - ${endDateStr}`); // e.g., "Oct 23, 2023 - Oct 29, 2023"
        }
    };
    updateDateRange();
  }, [viewType, currentDate, dispatch]);

  // Helper function to get start and end dates for the API query
  const getQueryDateRange = useCallback((baseDateInput, viewTypeInput) => {
    let startDt = DateTime.fromJSDate(new Date(baseDateInput));
    let endDt = DateTime.fromJSDate(new Date(baseDateInput));

    if (viewTypeInput === 'Daily') {
        startDt = startDt.startOf('day');
        endDt = endDt.endOf('day');
    } else if (viewTypeInput === 'Weekly') {
        // Luxon's startOf('week') defaults to Monday, endOf('week') to Sunday
        startDt = startDt.startOf('week');
        endDt = startDt.endOf('week');
    } else if (viewTypeInput === 'Fortnightly') {
        // Assuming week starts on Monday
        startDt = startDt.startOf('week');
        endDt = startDt.plus({ days: 13 }).endOf('day'); // Two full weeks from Monday
    } else if (viewTypeInput === 'Monthly') {
        startDt = startDt.startOf('month');
        endDt = startDt.endOf('month');
    }
    return {
        startDate: startDt.toISODate(), // yyyy-MM-dd
        endDate: endDt.toISODate()     // yyyy-MM-dd
    };
  }, []); // Return YYYY-MM-DD strings

  useEffect(() => {
    const fetchLocationData = async () => {
        let employeeIdsToQuery;
        if (selectedEmployeeId === 'All') {
            employeeIdsToQuery = employees.map(emp => emp._id);
        } else {
            employeeIdsToQuery = [selectedEmployeeId];
        }

        if (!employeeIdsToQuery || employeeIdsToQuery.length === 0) {
            setLocationData([]);
            if (employees.length > 0) { // Only show "no employees selected" if there are employees to select from
              // dispatch(setAlert('Please select an employee or "All Employees".', 'info'));
            } else if (employees.length === 0 && selectedEmployeeId === 'All') {
              // dispatch(setAlert('No employees available to display.', 'info'));
            }
            return;
        }


        let employeesToFetch = [];
        if (selectedEmployeeId === 'All') {
            employeesToFetch = employees;
        } else {
            const singleEmployee = employees.find(emp => emp._id === selectedEmployeeId);
            if (singleEmployee) {
                employeesToFetch = [singleEmployee];
            }
        }

        const { startDate, endDate } = getQueryDateRange(currentDate, viewType);
        const queryParams = new URLSearchParams();
        employeeIdsToQuery.forEach(id => queryParams.append('employeeIds', id));
        queryParams.append('startDate', startDate); // Already YYYY-MM-DD
        queryParams.append('endDate', endDate);     // Already YYYY-MM-DD

        try {
            const token = localStorage.getItem('token');
            const response = await fetch( // Use relative path for proxy
                `/api/timesheets?${queryParams.toString()}`,
                {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                }
            );
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                dispatch(setAlert(`Failed to fetch timesheets. Status: ${response.status}.`, 'danger'));
                setLocationData([]); // Clear existing data on error
                return; // Exit the function
            }
            const responseData = await response.json();
            console.log('[Map.js] API Response Data for Timesheets (raw):', JSON.stringify(responseData, null, 2));

            let timesheetsArray = []; // Initialize as empty array
            // The API for /timesheets returns an object { timesheets: [], totalHours: 0, avgHours: 0 }
            if (responseData && Array.isArray(responseData.timesheets)) {
                timesheetsArray = responseData.timesheets;
            } else {
                 console.warn("[Map.js] API response for timesheets did not contain a 'timesheets' array. Raw response:", responseData);
                 setLocationData([]); // Clear data if format is unexpected
                 timesheetsArray = []; // Ensure it's an array for subsequent processing
            }

            const individualLocationEvents = [];
            console.log(`[Map.js] Processing ${timesheetsArray.length} timesheets into individual events.`);

            for (const ts of timesheetsArray) {
                // ts.employeeId should be populated by the backend with at least _id and name
                const employeeName = ts.employeeId?.name || 'Unknown Employee';

                const hasStart = ts && ts.startLocation && ts.startLocation.coordinates && Array.isArray(ts.startLocation.coordinates) && ts.startLocation.coordinates.length >= 2;
                const hasEnd = ts && ts.endLocation && ts.endLocation.coordinates && Array.isArray(ts.endLocation.coordinates) && ts.endLocation.coordinates.length >= 2;

                if (hasStart) {
                    const lat = ts.startLocation.coordinates[1];
                    const lng = ts.startLocation.coordinates[0];
                    const startTimeFormatted = DateTime.fromISO(ts.startTime).setZone('local').toLocaleString(DateTime.DATETIME_SHORT);
                    individualLocationEvents.push({
                        id: `${ts._id}_start`, // Unique ID for the marker event
                        lat: lat,
                        lng: lng,
                        type: 'Start Location',
                        employeeName: employeeName,
                        popupNote: `Start: ${startTimeFormatted} (${employeeName})`,
                        timestamp: ts.startTime || ts.date, // For sorting
                        address: ts.startLocation.address || 'N/A',
                        dateOnly: DateTime.fromISO(ts.startTime || ts.date).toISODate(), // YYYY-MM-DD
                    });
                }

                if (hasEnd) {
                    const lat = ts.endLocation.coordinates[1];
                    const lng = ts.endLocation.coordinates[0];
                    const endTimeFormatted = ts.endTime ? DateTime.fromISO(ts.endTime).setZone('local').toLocaleString(DateTime.DATETIME_SHORT) : 'Ongoing';
                    individualLocationEvents.push({
                        id: `${ts._id}_end`, // Unique ID for the marker event
                        lat: lat,
                        lng: lng,
                        type: 'End Location',
                        employeeName: employeeName,
                        popupNote: `End: ${endTimeFormatted} (${employeeName})`,
                        timestamp: ts.endTime || ts.date, // For sorting
                        address: ts.endLocation.address || 'N/A',
                        dateOnly: DateTime.fromISO(ts.endTime || ts.date).toISODate(), // YYYY-MM-DD
                    });
                }
                if (!hasStart && !hasEnd) {
                    console.log(`[Map.js] Timesheet ${ts._id} for ${employeeName} has no start or end location data.`);
                }
            }

            // Sort by timestamp, most recent first, to ensure consistent map centering if needed
            const newLocationData = individualLocationEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            console.log('[Map.js] Processed newLocationData (individual events):', newLocationData);
            setLocationData(newLocationData);

            if (newLocationData.length > 0) {
                // Center map on the most recent event's location
                const latestEvent = newLocationData[0]; // Array is sorted, latest is first
                setMapCenter({ lat: latestEvent.lat, lng: latestEvent.lng });
                dispatch(setAlert(`Showing ${newLocationData.length} location event(s) for selected period.`, 'info'));
            } else {
                dispatch(setAlert(`No location data found for selected criteria.`, 'warning'));
            }
        } catch (error) {
            console.error('[Map.js] Error fetching or processing location data:', error);
            dispatch(setAlert(`Error fetching location data: ${error.message}`, 'danger'));
            setLocationData([]);
        }
    };

    fetchLocationData();
  }, [selectedEmployeeId, currentDate, viewType, employees, dispatch, getQueryDateRange]);
  // Handlers
  const handleLocateMe = useCallback(() => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter({ lat: latitude, lng: longitude });
          setIsLocating(false);
          dispatch(setAlert('Location found!', 'success'));
          console.log("Geolocation successful:", { latitude, longitude });
        },
        (error) => {
          console.error('Error fetching user location:', error);
          dispatch(setAlert(`Error getting location: ${error.message}`, 'danger'));
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.error('Geolocation not supported by this browser.');
      dispatch(setAlert('Geolocation is not supported by your browser.', 'warning'));
    }
  }, [dispatch]);

  const adjustDate = useCallback((amount, unit) => {
    const newDate = new Date(currentDate);
    switch (unit) {
        case 'day': newDate.setDate(newDate.getDate() + amount); break;
        case 'week': newDate.setDate(newDate.getDate() + amount * 7); break;
        case 'fortnight': newDate.setDate(newDate.getDate() + amount * 14); break;
        case 'month': newDate.setMonth(newDate.getMonth() + amount, 1); break; // Set day to 1 to avoid month-end issues
        default: break;
    }
    setCurrentDate(newDate);
  }, [currentDate]);

  const handlePrevClick = useCallback(() => {
    const unitMap = { Daily: 'day', Weekly: 'week', Fortnightly: 'fortnight', Monthly: 'month' };
    adjustDate(-1, unitMap[viewType]);
  }, [adjustDate, viewType]);

  const handleNextClick = useCallback(() => {
    const unitMap = { Daily: 'day', Weekly: 'week', Fortnightly: 'fortnight', Monthly: 'month' };
    adjustDate(1, unitMap[viewType]);
  }, [adjustDate, viewType]);

  // Component to change map center smoothly
  const ChangeMapCenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
         // Fly to the new center, keeping the current zoom level
         map.flyTo([center.lat, center.lng], map.getZoom()); // map.getZoom() ensures zoom level is maintained
      }
    }, [center, map]);
    return null;
  };

  // Render
  return (
    <div className="map-container">
      <Alert />
      <div className="map-page-header">
        <div className="title-breadcrumbs">
          <h1>
            <FontAwesomeIcon icon={faMap} /> Map
          </h1>
          <div className="breadcrumb">
            <Link to="/dashboard" className="breadcrumb-link">
              Dashboard
            </Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">Map</span>
          </div>
        </div>
      </div>

      <div className="date-range">
        <h3>{dateRange}</h3>
      </div>
      <div className="map-navigation">
        <button
          className="nav-button"
          onClick={handlePrevClick}
          aria-label={`Previous ${viewType}`}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Prev
        </button>
        <div className="select-container">
          <label htmlFor="viewType" className="visually-hidden">
            View Type
          </label>
          <select
            id="viewType"
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            aria-label="Select time period view type"
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Fortnightly">Fortnightly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>
        <button
          className="nav-button"
          onClick={handleNextClick}
          aria-label={`Next ${viewType}`}
        >
          Next <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

      <div className='map-filters-toolbar'>
        <div className='marker-filters'>
          <h3>Marker Filters:</h3>
          <div className="check-box">
            <label>
              <input
                type="checkbox"
                name="showStartLocation"
                checked={showStartLocation}
                onChange={(e) => setShowStartLocation(e.target.checked)}
              />{" "}
              Show Start
            </label>
            <label>
              <input
                type="checkbox"
                name="showEndLocation"
                checked={showEndLocation}
                onChange={(e) => setShowEndLocation(e.target.checked)}
              />{" "}
              Show End
            </label>
          </div>
        </div>
        <div className="employee-filter">
          <h4>Select Employee:</h4>
          <div className="select-container">
            <label htmlFor="employee" className="visually-hidden">
              Employee
            </label>
            <select
              id="employee"
              value={selectedEmployeeId} // Use selectedEmployeeId
              onChange={(e) => setSelectedEmployeeId(e.target.value)} // Update selectedEmployeeId
              aria-label="Select employee to view"
            >
              <option value="All">All Employees</option>
              {Array.isArray(employees) &&
                employees.map((employee) => (
                  <option
                    key={employee._id || employee.id}
                    value={employee._id}
                  >
                    {" "}
                    {/* Value is now employee._id */}
                    {employee.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="locate-me-container">
          <button
            className="nav-button locate-button"
            onClick={handleLocateMe}
            disabled={isLocating}
            aria-label="Center map on my current location"
          >
            <FontAwesomeIcon icon={faLocationCrosshairs} />{" "}
            {isLocating ? "Locating..." : "Center on Me"}
          </button>
        </div>
      </div>

      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={12}
        style={{ height: '400px', width: '100%' }}
        zoomControl={false} // Disable the default zoom control
        className="leaflet-map-container"
      >
        <ZoomControl position="topright" />
        <TileLayer // NOSONAR
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {MarkerClusterGroup ? ( // Check if MarkerClusterGroup is defined (it should be if import worked)
          <MarkerClusterGroup>
            {locationData
              .filter(loc => { // Pre-filter based on checkboxes for clarity
                if (loc.type === "Start Location" && showStartLocation) return true;
                if (loc.type === "End Location" && showEndLocation) return true;
                return false;
              })
              .map((loc) => {
                let iconToUse = null;
                // Determine icon based on filtered loc.type
                if (loc.type === "Start Location") {
                  iconToUse = greenIcon; // Use greenIcon for Start Location
                } else if (loc.type === "End Location") {
                  iconToUse = redIcon;
                }

                // This should not happen if filter works, but as a safeguard:
                if (!iconToUse) return null; 

                return (
                  <Marker
                    key={loc.id} // loc.id is now unique: e.g., timesheetId_start or timesheetId_end
                    position={[loc.lat, loc.lng]}
                    icon={iconToUse}
                    options={{ locData: loc }} // Pass loc data to marker options
                  >
                    <Popup>
                      <strong>{loc.employeeName}</strong> <br />
                      {loc.type}{" "}
                      {loc.address && loc.address !== "N/A"
                        ? `at ${loc.address}`
                        : ""}
                      <hr style={{ margin: "5px 0" }} />
                      {/* loc.popupNote already contains the formatted "Start: ..." or "End: ..." string */}
                      <div style={{ fontSize: "0.9em", marginBottom: "3px" }} > 
                        {loc.popupNote} 
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MarkerClusterGroup> // NOSONAR
        ) : (
          <p>Map clustering is unavailable. Please check console for errors.</p>
        )}

        <ChangeMapCenter center={mapCenter} />
      </MapContainer>
    </div>
  );
};

export default Map;