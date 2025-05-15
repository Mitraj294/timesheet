// /home/digilab/timesheet/client/src/components/setting/VehicleSettingsSection.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    updateEmployerSettings, 
    selectShowVehiclesTabInSidebar, 
    selectSettingsStatus 
} from '../../redux/slices/settingsSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCar, faSave, faSpinner } from '@fortawesome/free-solid-svg-icons';

const VehicleSettingsSection = () => {
  const dispatch = useDispatch();
  
  // Get the persisted setting and API status from Redux
  const showVehiclesTabFromStore = useSelector(selectShowVehiclesTabInSidebar);
  const settingsStatus = useSelector(selectSettingsStatus);
  const isSaving = settingsStatus === 'loading';

  // Local state to manage the dropdown's current selection before saving
  const [localShowVehiclesTab, setLocalShowVehiclesTab] = useState(showVehiclesTabFromStore);

  // Sync local state if the Redux store's version changes (e.g., after initial fetch or successful save)
  useEffect(() => {
      setLocalShowVehiclesTab(showVehiclesTabFromStore);
  }, [showVehiclesTabFromStore]);
  
  // Update local state when the select dropdown changes
  const handleSelectChange = (e) => {
      const newValue = e.target.value === 'true';
      setLocalShowVehiclesTab(newValue); 
  };

  // Handle form submission to save the staged setting
  const handleSubmit = (e) => {
    e.preventDefault();
    // Dispatch the update thunk with the locally staged value
    dispatch(updateEmployerSettings({ showVehiclesTabInSidebar: localShowVehiclesTab }));
  };

  return (
    <div className="simple-card"> {/* Ensure this class matches your SCSS */}
      <h2><FontAwesomeIcon icon={faCar} /> Vehicle Settings</h2>
      <p>Configure visibility options for vehicle-related features.</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group"> {/* Ensure this class matches your SCSS */}
          <label htmlFor="showVehiclesTabSelect">Show "Vehicles" Tab in Main Navigation?</label>
          <select
            id="showVehiclesTabSelect"
            name="showVehiclesTabSelect" // Good practice to have a name
            value={localShowVehiclesTab.toString()} // Bind to local state
            onChange={handleSelectChange} 
            disabled={isSaving} 
            className="form-control" // Ensure this class matches your SCSS
          >
            <option value="true">Yes, show the tab</option>
            <option value="false">No, hide the tab</option>
          </select>
          <small className="form-text text-muted">
            This controls whether the "Vehicles" link appears in the main sidebar navigation.
          </small>
        </div>

        <div className="form-footer"> {/* Ensure this class matches your SCSS */}
           <button
             type="submit"
             className="btn btn-primary" // Ensure .btn and .btn-primary are styled
             disabled={isSaving}
           >
             {isSaving ? (
                <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</>
             ) : (
                <><FontAwesomeIcon icon={faSave} /> Update Settings</>
             )}
           </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleSettingsSection;
