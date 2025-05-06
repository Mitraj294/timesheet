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

import 'leaflet/dist/leaflet.css';
import '../../styles/Map.scss'; // Import your custom SCSS styles
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

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-slpc.onrender.com/api';

// Default map center, e.g., company HQ or a general area
const DEFAULT_MAP_CENTER = { lat: 37.7749, lng: -122.4194 };

const Map = () => {
  const dispatch = useDispatch();

  // Local component state
  const [viewType, setViewType] = useState('Daily');
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [employees, setEmployees] = useState([]);
  const [dateRange, setDateRange] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [isLocating, setIsLocating] = useState(false); // Tracks if geolocation is active
  const [showStartLocation, setShowStartLocation] = useState(true); // Checkbox for start location markers
  const [showEndLocation, setShowEndLocation] = useState(true);   // Checkbox for end location markers

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

  // Placeholder for where you would fetch/filter actual location points
  // const [locationData, setLocationData] = useState([]);
  // useEffect(() => {
  //    const fetchLocationData = async () => {
  //        // Fetch data based on selectedEmployee, dateRange (derived from currentDate and viewType)
  //        // Example: const response = await fetch(`${API_URL}/locations?employee=${selectedEmployee}&startDate=...&endDate=...`);
  //        // const data = await response.json();
  //        // setLocationData(data);
  //    }
  //    fetchLocationData();
  // }, [selectedEmployee, currentDate, viewType]);

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
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              aria-label="Select employee to view"
            >
              <option value='All'>All Employees</option>
              {Array.isArray(employees) && employees.map((employee) => (
                  <option key={employee._id || employee.id} value={employee.name}>
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
        zoomControl={false} // Disable the default zoom control
        className="leaflet-map-container"
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <Marker position={[mapCenter.lat, mapCenter.lng]}>
          <Popup>Current Map Center</Popup>
        </Marker>

        {/* Placeholder for rendering actual location markers based on fetched data */}
        {/* Example: {locationData
            .filter(loc => {
                // Filter based on showStartLocation / showEndLocation checkboxes
                if (!showStartLocation && loc.type === 'start') return false;
                if (!showEndLocation && loc.type === 'end') return false;
                return true;
             })
            .map(loc => (
              <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
                  <Popup>
                      {loc.employeeName || selectedEmployee} <br />
                      {loc.type === 'start' ? 'Start' : 'End'}: {new Date(loc.timestamp).toLocaleString()}
                  </Popup>
              </Marker>
          ))} */}
        <ChangeMapCenter center={mapCenter} />
      </MapContainer>
    </div>
  );
};

export default Map;
