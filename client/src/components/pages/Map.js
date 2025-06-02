// /home/digilab/timesheet/client/src/components/pages/Map.js
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
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import L from 'leaflet';

import MarkerClusterGroup from 'react-leaflet-cluster'; // Import MarkerClusterGroup from the alternative package

import 'leaflet/dist/leaflet.css';
import '../../styles/Map.scss'; // Import your custom SCSS styles
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import 'leaflet.markercluster/dist/MarkerCluster.css'; // CSS for the clustering engine
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'; // Default styling for the clusters
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix for default Leaflet icon paths when using bundlers like Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

// Define custom icons for different location types
const blueIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: iconUrl,
  iconRetinaUrl: iconRetinaUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Default map center, e.g., company HQ or a general area
const DEFAULT_MAP_CENTER = { lat: 37.7749, lng: -122.4194 };

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
        const baseDate = new Date(currentDate); // Use a copy
        // Determine date range string based on viewType
        if (viewType === 'Daily') {
            startDateStr = baseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            setDateRange(startDateStr);
        } else {
            let startDate = new Date(baseDate);
            let endDate = new Date(baseDate);
            const options = { year: 'numeric', month: 'short', day: 'numeric' };

            if (viewType === 'Weekly') {
                const dayOfWeek = startDate.getDay(); // 0 (Sun) - 6 (Sat)
                const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
                startDate.setDate(diff);
                endDate.setDate(startDate.getDate() + 6);
            } else if (viewType === 'Fortnightly') {
                const dayOfWeek = startDate.getDay();
                const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
                startDate.setDate(diff);
                endDate.setDate(startDate.getDate() + 13);
            } else if (viewType === 'Monthly') {
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
                endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
            }

            startDateStr = startDate.toLocaleDateString('en-US', options);
            endDateStr = endDate.toLocaleDateString('en-US', options);
            setDateRange(`${startDateStr} - ${endDateStr}`);
        }
    };
    updateDateRange();
  }, [viewType, currentDate, dispatch]);

  // Helper function to get start and end dates for the API query
  const getQueryDateRange = useCallback((baseDateInput, viewTypeInput) => {
    let startDate, endDate;

    if (viewTypeInput === 'Daily') {
        // For Daily view, ensure the query range is for the selected local date in UTC.
        const year = baseDateInput.getFullYear();
        const month = baseDateInput.getMonth(); // 0-indexed
        const day = baseDateInput.getDate();
        startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    } else { // Original logic for Weekly, Fortnightly, Monthly
        startDate = new Date(baseDateInput);
        endDate = new Date(baseDateInput);

        if (viewTypeInput === 'Weekly') {
            const dayOfWeek = startDate.getDay(); // 0 (Sun) - 6 (Sat)
            const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
            startDate.setDate(diff);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate); // Start from the calculated Monday
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (viewTypeInput === 'Fortnightly') {
            const dayOfWeek = startDate.getDay();
            const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday start
            startDate.setDate(diff);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 13);
            endDate.setHours(23, 59, 59, 999);
        } else if (viewTypeInput === 'Monthly') {
            startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); // Last day of the month
            endDate.setHours(23, 59, 59, 999);
        }
    }
    return { startDate, endDate };
  }, []);

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
            if (employees.length > 0) {
              // dispatch(setAlert('Please select an employee or "All Employees".', 'info'));
            } else if (employees.length === 0 && selectedEmployeeId === 'All') {
              // dispatch(setAlert('No employees available to display.', 'info'));
            }
            return;
        }

        const { startDate, endDate } = getQueryDateRange(currentDate, viewType);
        const queryParams = new URLSearchParams();
        employeeIdsToQuery.forEach(id => queryParams.append('employeeIds', id));
        queryParams.append('startDate', startDate.toISOString());
        queryParams.append('endDate', endDate.toISOString());

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_URL}/timesheets?${queryParams.toString()}`,
                {
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                }
            );
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                dispatch(setAlert(`Failed to fetch timesheets. Status: ${response.status}.`, 'danger'));
                setLocationData([]);
                return;
            }
            const responseData = await response.json();
            console.log('[Map.js] API Response Data for Timesheets (raw):', JSON.stringify(responseData, null, 2));

            let timesheetsArray = [];
            if (responseData && Array.isArray(responseData.timesheets)) {
                timesheetsArray = responseData.timesheets;
            } else {
                console.warn("[Map.js] API response for timesheets did not contain a 'timesheets' array. Raw response:", responseData);
            }

            const { startDate: queryStartDate, endDate: queryEndDate } = getQueryDateRange(currentDate, viewType);
            const clientSideFilteredTimesheets = timesheetsArray.filter(ts => {
                if (!ts.date || typeof ts.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ts.date)) {
                    console.warn(`[Map.js] Invalid or missing date string for timesheet ID ${ts._id}:`, ts.date);
                    return false;
                }
                const queryStartStr = queryStartDate.getFullYear() + '-' + String(queryStartDate.getMonth() + 1).padStart(2, '0') + '-' + String(queryStartDate.getDate()).padStart(2, '0');
                const queryEndStr = queryEndDate.getFullYear() + '-' + String(queryEndDate.getMonth() + 1).padStart(2, '0') + '-' + String(queryEndDate.getDate()).padStart(2, '0');
                return ts.date >= queryStartStr && ts.date <= queryEndStr;
            });

            const groupedLocations = {};

            console.log(`[Map.js] Processing ${clientSideFilteredTimesheets.length} timesheets (after client-side filter) for selected criteria.`);

            for (const ts of clientSideFilteredTimesheets) {
                const employeeName = ts.employeeId?.name || 'Unknown Employee';
                const hasStart = ts.startLocation?.coordinates?.length >= 2;
                const hasEnd = ts.endLocation?.coordinates?.length >= 2;

                if (hasStart && hasEnd &&
                    ts.startLocation.coordinates[0] === ts.endLocation.coordinates[0] &&
                    ts.startLocation.coordinates[1] === ts.endLocation.coordinates[1]) {
                    const lat = ts.startLocation.coordinates[1];
                    const lng = ts.startLocation.coordinates[0];
                    const key = `${lat}_${lng}_combined`;
                    if (!groupedLocations[key]) {
                        groupedLocations[key] = {
                            lat, lng, type: 'Combined Location',
                            employeeNames: new Set(), popupNotes: [], timestamps: [],
                            address: ts.startLocation.address || 'N/A',
                        };
                    }
                    groupedLocations[key].employeeNames.add(employeeName);
                    groupedLocations[key].popupNotes.push(`Start & End: ${new Date(ts.startTime).toLocaleTimeString()} - ${ts.endTime ? new Date(ts.endTime).toLocaleTimeString() : 'Ongoing'} (${employeeName})`);
                    groupedLocations[key].timestamps.push(ts.startTime || ts.date);
                } else {
                    if (hasStart) {
                        const lat = ts.startLocation.coordinates[1];
                        const lng = ts.startLocation.coordinates[0];
                        const key = `${lat}_${lng}_start`;
                        if (!groupedLocations[key]) {
                            groupedLocations[key] = {
                                lat, lng, type: 'Start Location',
                                employeeNames: new Set(), popupNotes: [], timestamps: [],
                                address: ts.startLocation.address || 'N/A',
                            };
                        }
                        groupedLocations[key].employeeNames.add(employeeName);
                        groupedLocations[key].popupNotes.push(`Start: ${new Date(ts.startTime).toLocaleTimeString()} (${employeeName})`);
                        groupedLocations[key].timestamps.push(ts.startTime || ts.date);
                    }
                    if (hasEnd) {
                        const lat = ts.endLocation.coordinates[1];
                        const lng = ts.endLocation.coordinates[0];
                        const key = `${lat}_${lng}_end`;
                        if (!groupedLocations[key]) {
                            groupedLocations[key] = {
                                lat, lng, type: 'End Location',
                                employeeNames: new Set(), popupNotes: [], timestamps: [],
                                address: ts.endLocation.address || 'N/A',
                            };
                        }
                        groupedLocations[key].employeeNames.add(employeeName);
                        groupedLocations[key].popupNotes.push(`End: ${ts.endTime ? new Date(ts.endTime).toLocaleTimeString() : 'N/A'} (${employeeName})`);
                        groupedLocations[key].timestamps.push(ts.endTime || ts.date);
                    }
                }
                if (!hasStart && !hasEnd) {
                    console.log(`[Map.js] Timesheet ${ts._id} for ${employeeName} has no start or end location data.`);
                }
            }

            const newLocationData = Object.entries(groupedLocations).map(([key, data]) => ({
                id: key,
                ...data,
                employeeNames: Array.from(data.employeeNames),
                timestamp: data.timestamps.length > 0 ? data.timestamps.sort((a,b) => new Date(a) - new Date(b))[0] : new Date().toISOString(),
            })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            console.log('[Map.js] Processed newLocationData:', newLocationData);
            setLocationData(newLocationData);

            if (newLocationData.length > 0) {
                const lastLocation = newLocationData[0];
                setMapCenter({ lat: lastLocation.lat, lng: lastLocation.lng });
                dispatch(setAlert(`Showing ${newLocationData.length} location point(s) for selected period.`, 'info'));
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
        case 'month': newDate.setMonth(newDate.getMonth() + amount, 1); break;
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
         map.flyTo([center.lat, center.lng], map.getZoom());
      }
    }, [center, map]);
    return null;
  };

  // Render
  return (
    <div className='map-container'>
      <Alert />
      <div className='employees-header'>
        <h1>
          <FontAwesomeIcon icon={faMap} /> Map
        </h1>
      </div>

      <div className='breadcrumb'>
        <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
        <span> / </span>
        <span>Map</span>
      </div>

      <div className='date-range'>
        <h3>{dateRange}</h3>
      </div>
      <div className='map-navigation'>
        <button className='nav-button' onClick={handlePrevClick} aria-label={`Previous ${viewType}`}>
          <FontAwesomeIcon icon={faArrowLeft} /> Prev
        </button>
        <div className='select-container'>
          <label htmlFor='viewType' className='visually-hidden'>View Type</label>
          <select id='viewType' value={viewType} onChange={(e) => setViewType(e.target.value)} aria-label="Select time period view type">
            <option value='Daily'>Daily</option>
            <option value='Weekly'>Weekly</option>
            <option value='Fortnightly'>Fortnightly</option>
            <option value='Monthly'>Monthly</option>
          </select>
        </div>
         <button className='nav-button' onClick={handleNextClick} aria-label={`Next ${viewType}`}>
          Next <FontAwesomeIcon icon={faArrowRight} />
        </button>
      </div>

      <div className='map-filters-toolbar'>
        <div className='marker-filters'>
          <h3>Marker Filters:</h3>
          <div className='check-box'>
            <label>
              <input
                type='checkbox'
                name="showStartLocation"
                checked={showStartLocation}
                onChange={(e) => setShowStartLocation(e.target.checked)}
              /> Show Start
            </label>
            <label>
              <input
                type='checkbox'
                name="showEndLocation"
                checked={showEndLocation}
                onChange={(e) => setShowEndLocation(e.target.checked)}
               /> Show End
            </label>
          </div>
        </div>
        <div className='employee-filter'>
          <h4>Select Employee:</h4>
          <div className='select-container'>
             <label htmlFor='employee' className='visually-hidden'>Employee</label>
            <select
              id='employee'
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              aria-label="Select employee to view"
            >
              <option value='All'>All Employees</option>
              {Array.isArray(employees) && employees.map((employee) => (
                  <option key={employee._id || employee.id} value={employee._id}>
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
              <FontAwesomeIcon icon={faLocationCrosshairs} /> {isLocating ? 'Locating...' : 'Center on Me'}
            </button>
        </div>
      </div>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={12}
        style={{ height: '400px', width: '100%' }}
        zoomControl={false}
        className="leaflet-map-container"
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <MarkerClusterGroup>
          {locationData
              .filter(loc => {
                  if (loc.type === 'Start Location') return showStartLocation;
                  if (loc.type === 'End Location') return showEndLocation;
                  if (loc.type === 'Combined Location') return showStartLocation && showEndLocation;
                  return true;
               })
              .map(loc => {
                  let iconToUse;
                  if (loc.type === 'Start Location') {
                      iconToUse = blueIcon;
                  } else if (loc.type === 'End Location') {
                      iconToUse = redIcon;
                  } else if (loc.type === 'Combined Location') {
                      iconToUse = greenIcon;
                  } else {
                      iconToUse = L.Icon.Default();
                  }
                  return (
                    <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={iconToUse}>
                       <Popup>
                          <strong>{loc.employeeNames.join(', ')}</strong> <br />
                          {loc.type} {loc.address && loc.address !== 'N/A' ? `at ${loc.address}` : ''}<br />
                          Date: {new Date(loc.timestamp).toLocaleDateString()}
                          {loc.popupNotes.length > 0 && <hr style={{margin: '5px 0'}}/>}
                          {loc.popupNotes.map((note, index) => (
                              <div key={index} style={{fontSize: '0.9em', marginBottom: '3px'}}>
                                  {note}
                              </div>
                          ))}
                        </Popup>
                    </Marker>
                );
            })}
        </MarkerClusterGroup>

        <ChangeMapCenter center={mapCenter} />
      </MapContainer>
    </div>
  );
};

export default Map;
