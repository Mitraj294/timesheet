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
          console.log('Authentication error. Please log in.');
          return;
        }
        console.log("[Map] Fetching employees...");
        const response = await fetch(`${API_URL}/employees`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            console.log('Session expired. Please log in again.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEmployees(Array.isArray(data) ? data : []);
        console.log("[Map] Employees loaded:", data.length);
      } catch (error) {
        setEmployees([]);
        console.error("[Map] Error fetching employees:", error);
        console.log(`Error fetching employees: ${error.message}`);
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
      console.log("[Map] Updated date range:", viewType, dateRange);
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
        // Only count markers that will actually be shown on the map for the current period
        let visibleMarkers = newLocationData;
        if (viewType === 'Daily') {
          const selectedDateStr = currentDate.toISOString().slice(0, 10);
          visibleMarkers = newLocationData.filter(loc => {
            if (!loc.timestamp) return false;
            const d = new Date(loc.timestamp);
            const locDateStr = d.toISOString().slice(0, 10);
            return locDateStr === selectedDateStr;
          });
        } else {
          const { startDate, endDate } = getQueryDateRange(currentDate, viewType);
          visibleMarkers = newLocationData.filter(loc => {
            if (!loc.timestamp) return false;
            const d = new Date(loc.timestamp);
            return d >= startDate && d <= endDate;
          });
        }
        if (visibleMarkers.length > 0) {
          const lastLocation = visibleMarkers[0];
          setMapCenter({ lat: lastLocation.lat, lng: lastLocation.lng });
          // console.log(`Showing ${visibleMarkers.length} location point(s) for selected period.`);
        } else {
          // console.log(`No location data found for selected criteria.`);
        }
      } catch (error) {
        console.error("[Map] Error fetching location data:", error);
        console.log(`Error fetching location data: ${error.message}`);
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
        if (!isNaN(lat) && !isNaN(lon)) {
          console.log("[Map] IP location fetched:", lat, lon);
          return { latitude: lat, longitude: lon };
        }
        throw new Error('Invalid latitude/longitude format from IP Geolocation API.');
      } else {
        throw new Error(data.message || 'Could not determine location from IP. API response missing lat/lon.');
      }
    } catch (error) {
      console.log(`Error getting network location: ${error.message}`);
      console.error("[Map] Error getting IP location:", error);
      return null;
    }
  }, []);

  const fetchDeviceLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("[Map] Device geolocation found:", position.coords.latitude, position.coords.longitude);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          console.warn("[Map] Device geolocation error:", err);
          reject(new Error('Permission denied or unable to retrieve location.'));
        }
      );
    });
  }, []);

  // Center map on user
  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    console.log("[Map] Locating user...");
    try {
      const deviceLocation = await fetchDeviceLocation();
      setMapCenter({ lat: deviceLocation.latitude, lng: deviceLocation.longitude });
      // console.log('Accurate device location found!');
      setIsLocating(false);
      return;
    } catch (err) {
      // console.log('Could not get precise device location, using network location.');
      console.warn("[Map] Could not get device location, falling back to IP location.");
    }
    const ipLocation = await fetchIPLocation();
    if (ipLocation) {
      console.log("[Map] Network IP location found!");
      setMapCenter({ lat: ipLocation.latitude, lng: ipLocation.longitude });
      // console.log('Location based on your network IP found!');
    } else {
      // console.log('Could not determine your location.');
      console.error("[Map] Could not determine user location.");
    }
    setIsLocating(false);
  }, [fetchDeviceLocation, fetchIPLocation]);

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
    setLocationData([]);
    console.log("[Map] Date adjusted:", newDate, "unit:", unit, "amount:", amount);
  }, [currentDate]);

  const handlePrevClick = useCallback(() => {
    const unitMap = { Daily: 'day', Weekly: 'week', Fortnightly: 'fortnight', Monthly: 'month' };
    console.log("[Map] Previous button clicked. ViewType:", viewType);
    adjustDate(-1, unitMap[viewType]);
  }, [adjustDate, viewType]);

  const handleNextClick = useCallback(() => {
    const unitMap = { Daily: 'day', Weekly: 'week', Fortnightly: 'fortnight', Monthly: 'month' };
    console.log("[Map] Next button clicked. ViewType:", viewType);
    adjustDate(1, unitMap[viewType]);
  }, [adjustDate, viewType]);

  // Filter locationData for map markers based on viewType and currentDate
  const filteredLocationData = React.useMemo(() => {
    if (!currentDate || !locationData.length) return [];
    if (viewType === 'Daily') {
      // Only show markers for the selected day
      const selectedDateStr = currentDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'
      return locationData.filter(loc => {
        if (!loc.timestamp) return false;
        const d = new Date(loc.timestamp);
        const locDateStr = d.toISOString().slice(0, 10);
        return locDateStr === selectedDateStr;
      });
    } else {
      // For Weekly, Fortnightly, Monthly: show markers within the calculated date range
      const { startDate, endDate } = getQueryDateRange(currentDate, viewType);
      return locationData.filter(loc => {
        if (!loc.timestamp) return false;
        const d = new Date(loc.timestamp);
        return d >= startDate && d <= endDate;
      });
    }
  }, [locationData, viewType, currentDate, getQueryDateRange]);

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

      {/* Heading and breadcrumb for Map page, matching other pages */}
      <div className="ts-page-header__main-content">
        <h3 className="ts-page-header__title">
          <FontAwesomeIcon icon={faMap} className="ts-page-header__title-icon" /> Map
        </h3>
        <div className="ts-page-header__breadcrumbs">
          <Link to="/dashboard" className="ts-page-header__breadcrumb-link">Dashboard</Link>
          <span className="ts-page-header__breadcrumb-separator"> / </span>
          <span className="ts-page-header__breadcrumb-current">Map</span>
        </div>
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
          <select id='viewType' value={viewType} onChange={(e) => {
            setViewType(e.target.value);
            console.log("[Map] ViewType changed:", e.target.value);
          }} aria-label="Select time period view type">
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
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                console.log("[Map] Employee filter changed:", e.target.value);
              }}
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
          {filteredLocationData
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