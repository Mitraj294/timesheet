import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useSelector, useDispatch } from 'react-redux'; // <-- Import Redux hooks
import {
  faMapMarkedAlt, // Changed icon for better representation
  faArrowLeft,
  faArrowRight,
  faLocationCrosshairs,
  faSpinner, // Added for loading state
  faExclamationCircle // Added for error state
} from '@fortawesome/free-solid-svg-icons';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
// --- Import Redux Actions and Selectors ---
import { fetchEmployees, selectAllEmployees, selectEmployeeStatus, selectEmployeeError, clearEmployeeError } from '../../redux/slices/employeeSlice';
import { fetchLocations, selectAllLocations, selectLocationStatus, selectLocationError, clearLocationError } from '../../redux/slices/locationSlice';
// --- End Redux Imports ---
import L from 'leaflet';
import { DateTime } from 'luxon'; // Using Luxon for date manipulation consistency

// Leaflet CSS and Icon Fix
import 'leaflet/dist/leaflet.css';
import '../../styles/Map.scss'; // Import the updated SCSS styles
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// --- Leaflet Icon Fix ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});
// --- End of Icon Fix ---

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';

// Default center (e.g., company HQ or a general area)
const DEFAULT_MAP_CENTER = { lat: 37.7749, lng: -122.4194 }; // San Francisco example
const DEFAULT_ZOOM = 12;

// Helper to get period label
const getPeriodLabel = (viewType) => {
    switch (viewType) {
        case 'Daily': return 'Day';
        case 'Weekly': return 'Week';
        case 'Fortnightly': return 'Fortnight';
        case 'Monthly': return 'Month';
        default: return 'Period';
    }
};

// Helper function to calculate date range (ensure consistency)
const calculateDateRange = (baseDate, type) => {
    let startDt = DateTime.fromJSDate(baseDate);
    let endDt;

    if (type === 'Daily') {
        startDt = startDt.startOf('day');
        endDt = startDt.endOf('day');
    } else if (type === 'Monthly') {
        // Using rolling 4-week logic from Dashboard
        startDt = startDt.minus({ weeks: 3 }).startOf('week');
        endDt = startDt.endOf('week');
    } else if (type === 'Fortnightly') {
        startDt = startDt.minus({ weeks: 1 }).startOf('week');
        endDt = startDt.plus({ days: 13 }).endOf('day');
    } else { // Weekly (default)
        startDt = startDt.startOf('week');
        endDt = startDt.endOf('week');
    }
    return { start: startDt.toJSDate(), end: endDt.toJSDate() };
};

// Component to change map center smoothly
const ChangeMapCenter = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
      if (center && typeof center.lat === 'number' && typeof center.lng === 'number') {
         map.flyTo([center.lat, center.lng], zoom || map.getZoom());
      }
    }, [center, zoom, map]);
    return null;
};


const Map = () => { // Renamed component to Map
  const dispatch = useDispatch(); // <-- Initialize dispatch
  const navigate = useNavigate(); // Hook for navigation

  // --- Local UI State ---
  const [viewType, setViewType] = useState('Daily');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('All'); // Store ID
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [isLocating, setIsLocating] = useState(false);
  const [showStartLocation, setShowStartLocation] = useState(true);
  const [showEndLocation, setShowEndLocation] = useState(true);

  // --- Get Data from Redux Store ---
  const { token, isLoading: isAuthLoading } = useSelector((state) => state.auth || {});
  const employees = useSelector(selectAllEmployees);
  const employeeStatus = useSelector(selectEmployeeStatus);
  const employeeError = useSelector(selectEmployeeError);
  const locations = useSelector(selectAllLocations); // <-- Get locations from Redux
  const locationStatus = useSelector(selectLocationStatus); // <-- Get location status
  const locationError = useSelector(selectLocationError); // <-- Get location error

  // --- TODO: State for actual location data ---
  // const [locationData, setLocationData] = useState([]);
  // const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  // const [locationError, setLocationError] = useState(null);

  // --- Effect to Fetch Employees ---
  useEffect(() => {
    // Fetch only if idle or failed, and token is available
    if (!isAuthLoading && token && (employeeStatus === 'idle' || employeeStatus === 'failed')) {
        console.log(`[${new Date().toISOString()}] Map: Dispatching fetchEmployees.`);
        dispatch(fetchEmployees());
    }
  }, [dispatch, token, isAuthLoading, employeeStatus]);

  // --- Effect to Fetch Location Data ---
  useEffect(() => {
    // Wait for auth and token
    if (isAuthLoading || !token) {
        console.log(`[${new Date().toISOString()}] Map: Waiting for auth/token to fetch locations.`);
        return;
    }

    // Fetch locations if status is idle or failed
    // Also refetch if dependencies like employeeId, date, or viewType change
    console.log(`[${new Date().toISOString()}] Map: Dispatching fetchLocations.`);
    try {
        const { start, end } = calculateDateRange(currentDate, viewType); // Use existing range calc
        const params = {
            startDate: DateTime.fromJSDate(start).toISODate(),
            endDate: DateTime.fromJSDate(end).toISODate(),
        };
        if (selectedEmployeeId !== 'All') {
            params.employeeId = selectedEmployeeId;
        }
        dispatch(fetchLocations(params));
    } catch (error) {
        console.error("Error preparing params for location fetch:", error);
        // Optionally dispatch an action to set a local error state if needed
    }
    // No cleanup needed here as createAsyncThunk handles cancellation
  }, [dispatch, selectedEmployeeId, currentDate, viewType, token, isAuthLoading]); // Removed locationStatus dependency to allow refetch


  // Calculate Date Range Display Text using Luxon
  const dateRangeDisplayText = useMemo(() => {
    const baseDt = DateTime.fromJSDate(currentDate);
    let startDt, endDt;

    if (viewType === 'Daily') {
        return baseDt.toFormat('MMM dd, yyyy');
    } else if (viewType === 'Weekly') {
        startDt = baseDt.startOf('week'); // Assumes week starts Monday based on Luxon default
        endDt = baseDt.endOf('week');
    } else if (viewType === 'Fortnightly') {
        startDt = baseDt.minus({ weeks: 1 }).startOf('week'); // Match Dashboard logic
        endDt = startDt.plus({ days: 13 }); // 14 days total
    } else if (viewType === 'Monthly') {
        startDt = baseDt.startOf('month');
        endDt = baseDt.endOf('month');
    } else {
        return 'Invalid View Type';
    }

    const startFormat = 'MMM dd';
    const endFormat = startDt.year !== endDt.year ? 'MMM dd, yyyy' : 'MMM dd, yyyy';
    return `${startDt.toFormat(startFormat)} - ${endDt.toFormat(endFormat)}`;
  }, [viewType, currentDate]);


  // Geolocation Handler
  const handleLocateMe = useCallback(() => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter({ lat: latitude, lng: longitude });
          setMapZoom(15); // Zoom in closer when locating
          setIsLocating(false);
        },
        (error) => {
          console.error('Error fetching user location:', error);
          alert(`Error getting location: ${error.message}`);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }, []);

  // Date Navigation Logic using Luxon
  const adjustDate = useCallback((amount, unit) => {
    const currentDt = DateTime.fromJSDate(currentDate);
    let newDt;
    switch (unit) {
        case 'day': newDt = currentDt.plus({ days: amount }); break;
        case 'week': newDt = currentDt.plus({ weeks: amount }); break;
        case 'fortnight': newDt = currentDt.plus({ weeks: amount * 2 }); break;
        case 'month': newDt = currentDt.plus({ weeks: amount * 4 }); break; // Match Dashboard rolling 4 weeks
        default: newDt = currentDt; break;
    }
    setCurrentDate(newDt.toJSDate());
  }, [currentDate]);

  const handlePrevClick = useCallback(() => {
    const unitMap = { Daily: 'day', Weekly: 'week', Fortnightly: 'fortnight', Monthly: 'month' };
    adjustDate(-1, unitMap[viewType]);
  }, [adjustDate, viewType]);

  const handleNextClick = useCallback(() => {
    const unitMap = { Daily: 'day', Weekly: 'week', Fortnightly: 'fortnight', Monthly: 'month' };
    adjustDate(1, unitMap[viewType]);
  }, [adjustDate, viewType]);

  const periodLabel = useMemo(() => getPeriodLabel(viewType), [viewType]);

  // --- Combined Loading/Error States ---
  const isLoadingEmployees = employeeStatus === 'loading';
  const isLoadingLocations = locationStatus === 'loading';
  const isLoading = isAuthLoading || isLoadingEmployees || isLoadingLocations;
  const combinedError = employeeError || locationError;

  // --- Filtered Locations for Map ---
  const filteredLocations = useMemo(() => {
      return locations.filter(loc => {
          if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return false;
          if (loc.type === 'start' && !showStartLocation) return false;
          if (loc.type === 'end' && !showEndLocation) return false;
          // Add any other filtering logic if needed
          return true;
      });
  }, [locations, showStartLocation, showEndLocation]);

  // --- Recenter Map when filtered locations change ---
  useEffect(() => {
    if (filteredLocations.length > 0) {
        // Basic centering on the first location - could be improved (e.g., calculate bounds)
        const firstLoc = filteredLocations[0];
        setMapCenter({ lat: firstLoc.latitude, lng: firstLoc.longitude });
        // Optionally adjust zoom based on number of markers or bounds
    } else if (!isLoading && !combinedError) {
        // If no locations and not loading/error, reset to default
        setMapCenter(DEFAULT_MAP_CENTER);
        setMapZoom(DEFAULT_ZOOM);
    }
  }, [filteredLocations, isLoading, combinedError]); // Depend on the filtered data


  return (
    <div className='map-page'> {/* Changed class name */}
      {/* Header Section - Adopted structure */}
      <div className='map-header'>
        <div className="title-breadcrumbs">
          <h2>
            <FontAwesomeIcon icon={faMapMarkedAlt} /> Map View
          </h2>
          <div className="breadcrumbs">
            <Link to='/dashboard' className='breadcrumb-link'>Dashboard</Link>
            <span className="breadcrumb-separator"> / </span>
            <span className="breadcrumb-current">Map</span>
          </div>
        </div>
        {/* No header actions needed for map? */}
      </div>

      {/* Navigation Bar - Combined controls */}
      <div className='map-navigation-bar'>
         <div className='period-display'><h4>{dateRangeDisplayText}</h4></div>
         <div className='navigation-controls'>
            <button className='nav-button btn btn-blue' onClick={handlePrevClick} aria-label={`Previous ${periodLabel}`}>
              <FontAwesomeIcon icon={faArrowLeft} />
              <span>Prev {periodLabel}</span>
            </button>
            <div className='view-type-select-wrapper'>
              <label htmlFor='viewType' className='visually-hidden'>View Type</label>
              <select id='viewType' value={viewType} onChange={(e) => setViewType(e.target.value)} className='view-type-dropdown' aria-label="Select View Type">
                <option value='Daily'>Daily</option>
                <option value='Weekly'>Weekly</option>
                <option value='Fortnightly'>Fortnightly</option>
                <option value='Monthly'>Monthly</option>
              </select>
            </div>
            <button className='nav-button btn btn-blue' onClick={handleNextClick} aria-label={`Next ${periodLabel}`}>
              <span>Next {periodLabel}</span>
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
         </div>
         {/* Locate Me button moved to filters bar for better grouping */}
      </div>

      {/* Filters Toolbar */}
      <div className='map-filters-toolbar'>
        {/* Employee Selection */}
        <div className='filter-group employee-filter'>
          <label htmlFor='employeeSelect' className='filter-label'>Employee:</label>
          <div className='select-container'>
            <select
              id='employeeSelect'
              value={selectedEmployeeId} // Use ID state
              onChange={(e) => setSelectedEmployeeId(e.target.value)} // Update ID state
              aria-label="Select employee to view"
              disabled={isLoadingEmployees}
            >
              <option value='All'>All Employees</option>
              {Array.isArray(employees) && employees.map((employee) => (
                  <option key={employee._id} value={employee._id}> {/* Use ID as value */}
                    {employee.name}
                  </option>
                ))}
            </select>
             {isLoadingEmployees && <FontAwesomeIcon icon={faSpinner} spin className="loading-icon-inline"/>}
          </div>
           {employeeError && <span className="error-text-inline">{employeeError}</span>}
        </div>

        {/* Marker Filters */}
        <div className='filter-group marker-filters'>
          <span className='filter-label'>Show Markers:</span>
          <div className='checkbox-group'>
            <label className='checkbox-label'>
              <input
                type='checkbox'
                name="showStartLocation"
                checked={showStartLocation}
                onChange={(e) => setShowStartLocation(e.target.checked)}
              /> Start
            </label>
            <label className='checkbox-label'>
              <input
                type='checkbox'
                name="showEndLocation"
                checked={showEndLocation}
                onChange={(e) => setShowEndLocation(e.target.checked)}
               /> End
            </label>
          </div>
        </div>

        {/* Locate Me Button */}
        <div className="filter-group locate-me-container">
           <button
              className="btn btn-secondary locate-button" // Use standard button class
              onClick={handleLocateMe}
              disabled={isLocating}
              aria-label="Center map on my current location"
            >
              <FontAwesomeIcon icon={isLocating ? faSpinner : faLocationCrosshairs} spin={isLocating} />
              {isLocating ? 'Locating...' : 'Center on Me'}
            </button>
        </div>
      </div>

      {/* Map Display Area */}
      <div className="map-display-area">
        {/* Loading/Error states */}
        {isLoading && <div className='loading-indicator'><FontAwesomeIcon icon={faSpinner} spin size='2x' /><p>Loading data...</p></div>}
        {combinedError && !isLoading && (
            <div className='error-message'>
                <FontAwesomeIcon icon={faExclamationCircle} />
                <p>{combinedError}</p>
                {/* Add retry logic if needed */}
                {/* <button onClick={handleRetry} className="btn btn-secondary retry-button">Retry</button> */}
            </div>
        )}

        {/* Render map only when not loading/erroring locations? Or show map always? */}
        {/* {!isLoadingLocations && !locationError && ( */}
            <MapContainer
                key={JSON.stringify(mapCenter)} // Force re-render if center object changes instance
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={mapZoom}
                style={{ height: '500px', width: '100%' }} // Increased height
                className="leaflet-map-container"
                scrollWheelZoom={true} // Enable scroll wheel zoom
            >
                <TileLayer
                attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />

                {/* Render actual location markers based on fetched locationData */}
                {filteredLocations.map(loc => {
                    // Find employee name - consider optimizing if many locations/employees
                    const employeeName = employees.find(emp => emp._id === loc.employeeId)?.name || 'Unknown';
                    return (
                        <Marker key={loc._id} position={[loc.latitude, loc.longitude]}>
                            <Popup>
                                Employee: {employeeName} <br />
                                Type: {loc.type} <br />
                                Time: {DateTime.fromISO(loc.timestamp).toLocaleString(DateTime.DATETIME_SHORT)}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Display message if no locations found */}
                {!isLoading && !combinedError && filteredLocations.length === 0 && (
                    <div className="no-locations-overlay">No locations found for the selected criteria.</div>
                )}

                <ChangeMapCenter center={mapCenter} zoom={mapZoom} />
            </MapContainer>
        {/* )} */}
      </div>
    </div>
  );
};

export default Map; // Export with the new name
