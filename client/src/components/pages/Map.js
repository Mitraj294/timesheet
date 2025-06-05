// /home/digilab/timesheet/client/src/components/pages/Map.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useDispatch } from 'react-redux';
import {
  faMap,
  faArrowLeft,
  faArrowRight,
  faLocationCrosshairs,
} from '@fortawesome/free-solid-svg-icons';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { ZoomControl } from 'react-leaflet';
import { setAlert } from '../../redux/slices/alertSlice';
import Alert from '../layout/Alert';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import '../../styles/Map.scss';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const blueIcon = new L.Icon.Default();
const greenIcon = new L.Icon.Default({ className: 'leaflet-marker-icon-green' });
const redIcon = new L.Icon.Default({ className: 'leaflet-marker-icon-red' });

if (typeof window !== "undefined") {
  const styleId = "leaflet-marker-color-override";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
      .leaflet-marker-icon-green {
        filter: sepia(1) hue-rotate(90deg) saturate(4) !important;
      }
      .leaflet-marker-icon-red {
        filter: grayscale(0) brightness(1.1) sepia(1) hue-rotate(-35deg) saturate(6) !important;
      }
    `;
    document.head.appendChild(style);
  }
}

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';
const DEFAULT_MAP_CENTER = { lat: 37.7749, lng: -122.4194 };

const Map = () => {
  const dispatch = useDispatch();
  // State for filters, employees, date, map, and markers
  const [viewType, setViewType] = useState('Daily');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('All');
  const [employees, setEmployees] = useState([]);
  const [dateRange, setDateRange] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const [showStartLocation, setShowStartLocation] = useState(true);
  const [showEndLocation, setShowEndLocation] = useState(true);
  const [locationData, setLocationData] = useState([]);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
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
            dispatch(setAlert('Session expired. Please log in again.', 'danger'));
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (error) {
        setEmployees([]);
        dispatch(setAlert(`Error fetching employees: ${error.message}`, 'danger'));
      }
    };
    fetchEmployees();

    // Set date range string for display
    const updateDateRange = () => {
      let startDateStr, endDateStr;
      const baseDate = new Date(currentDate);
      if (viewType === 'Daily') {
        startDateStr = baseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        setDateRange(startDateStr);
      } else {
        let startDate = new Date(baseDate);
        let endDate = new Date(baseDate);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        if (viewType === 'Weekly') {
          const dayOfWeek = startDate.getDay();
          const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          startDate.setDate(diff);
          endDate.setDate(startDate.getDate() + 6);
        } else if (viewType === 'Fortnightly') {
          const dayOfWeek = startDate.getDay();
          const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
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

  // Helper: get start/end date for API query
  const getQueryDateRange = useCallback((baseDateInput, viewTypeInput) => {
    let startDate, endDate;
    if (viewTypeInput === 'Daily') {
      const year = baseDateInput.getFullYear();
      const month = baseDateInput.getMonth();
      const day = baseDateInput.getDate();
      startDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    } else {
      startDate = new Date(baseDateInput);
      endDate = new Date(baseDateInput);
      if (viewTypeInput === 'Weekly') {
        const dayOfWeek = startDate.getDay();
        const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (viewTypeInput === 'Fortnightly') {
        const dayOfWeek = startDate.getDay();
        const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 13);
        endDate.setHours(23, 59, 59, 999);
      } else if (viewTypeInput === 'Monthly') {
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      }
    }
    return { startDate, endDate };
  }, []);

  // Fetch location data for map markers
  useEffect(() => {
    const fetchLocationData = async () => {
      let employeeIdsToQuery = selectedEmployeeId === 'All'
        ? employees.map(emp => emp._id)
        : [selectedEmployeeId];
      if (!employeeIdsToQuery.length) {
        setLocationData([]);
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
          dispatch(setAlert(`Failed to fetch timesheets. Status: ${response.status}.`, 'danger'));
          setLocationData([]);
          return;
        }
        const responseData = await response.json();
        let timesheetsArray = Array.isArray(responseData.timesheets) ? responseData.timesheets : [];
        // Filter timesheets by date range (client-side)
        const { startDate: queryStartDate, endDate: queryEndDate } = getQueryDateRange(currentDate, viewType);
        const clientSideFilteredTimesheets = timesheetsArray.filter(ts => {
          if (!ts.date || typeof ts.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ts.date)) return false;
          const queryStartStr = queryStartDate.getFullYear() + '-' + String(queryStartDate.getMonth() + 1).padStart(2, '0') + '-' + String(queryStartDate.getDate()).padStart(2, '0');
          const queryEndStr = queryEndDate.getFullYear() + '-' + String(queryEndDate.getMonth() + 1).padStart(2, '0') + '-' + String(queryEndDate.getDate()).padStart(2, '0');
          return ts.date >= queryStartStr && ts.date <= queryEndStr;
        });

        // Helper to extract coordinates from GeoJSON
        function extractCoords(locObj) {
          if (!locObj) return null;
          if (locObj.type === 'Point' && Array.isArray(locObj.coordinates) && locObj.coordinates.length === 2) {
            return locObj;
          }
          return null;
        }

        // Group timesheets into marker objects for clustering
        function groupTimesheetsForClustering(timesheets) {
          const markers = [];
          for (const ts of timesheets) {
            const employeeName = ts.employeeId?.name || 'Unknown Employee';
            const startLoc = extractCoords(ts.startLocation);
            const endLoc = extractCoords(ts.endLocation);
            const hasStart = !!(startLoc && Array.isArray(startLoc.coordinates) && startLoc.coordinates.length === 2);
            const hasEnd = !!(endLoc && Array.isArray(endLoc.coordinates) && endLoc.coordinates.length === 2);
            // If both exist and are at the same spot, make a combined marker (blue)
            if (
              hasStart && hasEnd &&
              startLoc.coordinates[0] === endLoc.coordinates[0] &&
              startLoc.coordinates[1] === endLoc.coordinates[1]
            ) {
              markers.push({
                id: `${ts._id}_combined`,
                lat: startLoc.coordinates[1],
                lng: startLoc.coordinates[0],
                type: 'Combined Location',
                employeeNames: [employeeName],
                popupNotes: [
                  `Start: ${ts.startTime ? new Date(ts.startTime).toLocaleTimeString() : 'N/A'} (${employeeName})`,
                  `End: ${ts.endTime ? new Date(ts.endTime).toLocaleTimeString() : 'N/A'} (${employeeName})`
                ],
                timestamp: ts.startTime || ts.date,
                address: startLoc.address || endLoc.address || 'N/A',
              });
            } else {
              if (hasStart) {
                markers.push({
                  id: `${ts._id}_start`,
                  lat: startLoc.coordinates[1],
                  lng: startLoc.coordinates[0],
                  type: 'Start Location',
                  employeeNames: [employeeName],
                  popupNotes: [`Start: ${ts.startTime ? new Date(ts.startTime).toLocaleTimeString() : 'N/A'} (${employeeName})`],
                  timestamp: ts.startTime || ts.date,
                  address: startLoc.address || 'N/A',
                });
              }
              if (hasEnd) {
                markers.push({
                  id: `${ts._id}_end`,
                  lat: endLoc.coordinates[1],
                  lng: endLoc.coordinates[0],
                  type: 'End Location',
                  employeeNames: [employeeName],
                  popupNotes: [`End: ${ts.endTime ? new Date(ts.endTime).toLocaleTimeString() : 'N/A'} (${employeeName})`],
                  timestamp: ts.endTime || ts.date,
                  address: endLoc.address || 'N/A',
                });
              }
            }
          }
          return markers;
        }

        const newLocationData = groupTimesheetsForClustering(clientSideFilteredTimesheets);
        setLocationData(newLocationData);

        if (newLocationData.length > 0) {
          const lastLocation = newLocationData[0];
          setMapCenter({ lat: lastLocation.lat, lng: lastLocation.lng });
          dispatch(setAlert(`Showing ${newLocationData.length} location point(s) for selected period.`, 'info'));
        } else {
          dispatch(setAlert(`No location data found for selected criteria.`, 'warning'));
        }
      } catch (error) {
        dispatch(setAlert(`Error fetching location data: ${error.message}`, 'danger'));
        setLocationData([]);
      }
    };
    fetchLocationData();
  }, [selectedEmployeeId, currentDate, viewType, employees, dispatch, getQueryDateRange]);

  // Get user's location (device or IP)
  const fetchIPLocation = useCallback(async () => {
    try {
      const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
      if (!response.ok) throw new Error(`IP Geolocation API request failed with status ${response.status}`);
      const data = await response.json();
      if (data.latitude && data.longitude) {
        const lat = parseFloat(data.latitude);
        const lon = parseFloat(data.longitude);
        if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
        throw new Error('Invalid latitude/longitude format from IP Geolocation API.');
      } else {
        throw new Error(data.message || 'Could not determine location from IP. API response missing lat/lon.');
      }
    } catch (error) {
      dispatch(setAlert(`Error getting network location: ${error.message}`, 'danger'));
      return null;
    }
  }, [dispatch]);

  const fetchDeviceLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          reject(new Error('Permission denied or unable to retrieve location.'));
        }
      );
    });
  }, []);

  // Center map on user
  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const deviceLocation = await fetchDeviceLocation();
      setMapCenter({ lat: deviceLocation.latitude, lng: deviceLocation.longitude });
      dispatch(setAlert('Accurate device location found!', 'success'));
      setIsLocating(false);
      return;
    } catch (err) {
      dispatch(setAlert('Could not get precise device location, using network location.', 'warning'));
    }
    const ipLocation = await fetchIPLocation();
    if (ipLocation) {
      setMapCenter({ lat: ipLocation.latitude, lng: ipLocation.longitude });
      dispatch(setAlert('Location based on your network IP found!', 'info'));
    } else {
      dispatch(setAlert('Could not determine your location.', 'danger'));
    }
    setIsLocating(false);
  }, [dispatch, fetchDeviceLocation, fetchIPLocation]);

  // Change date by period
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

  // Helper to move map center
  const ChangeMapCenter = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
        map.flyTo([center.lat, center.lng], map.getZoom());
      }
    }, [center, map]);
    return null;
  };

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
              if (loc.type === 'Combined Location') iconToUse = blueIcon;
              else if (loc.type === 'Start Location') iconToUse = greenIcon;
              else if (loc.type === 'End Location') iconToUse = redIcon;
              else iconToUse = L.Icon.Default();
              const formattedDate = loc.timestamp
                ? (() => {
                  const d = new Date(loc.timestamp);
                  const day = String(d.getDate()).padStart(2, '0');
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const year = d.getFullYear();
                  return `${day}/${month}/${year}`;
                })()
                : '';
              return (
                <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={iconToUse}>
                  <Popup>
                    <strong>{loc.employeeNames[0]}</strong> <br />
                    {loc.type} {loc.address && loc.address !== 'N/A' ? `at ${loc.address}` : ''}<br />
                    Date: {formattedDate}
                    {loc.popupNotes.length > 0 && <hr style={{ margin: '5px 0' }} />}
                    {loc.popupNotes.map((note, index) => (
                      <div key={index} style={{ fontSize: '0.9em', marginBottom: '3px' }}>
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