// /home/digilab/timesheet/client/src/components/setting/VehicleSettingsSection.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    updateEmployerSettings,
    selectShowVehiclesTabInSidebar, // Re-import this selector
    selectSettingsStatus
} from '../../redux/slices/settingsSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSave } from '@fortawesome/free-solid-svg-icons'; // Added faSave
// Link import removed as breadcrumbs are removed
import '../../styles/VehicleSettingsSection.scss';

const VehicleSettingsSection = () => {
  const dispatch = useDispatch();

  // Get the setting from the Redux store
  const showVehiclesTabFromStore = useSelector(selectShowVehiclesTabInSidebar);
  const settingsStatus = useSelector(selectSettingsStatus);
  const isSaving = settingsStatus === 'loading';

  // Local state for the select input.
  // Initialize with a default boolean value (e.g., false) if showVehiclesTabFromStore is not yet a boolean.
  const [localShowVehiclesTab, setLocalShowVehiclesTab] = useState(
    typeof showVehiclesTabFromStore === 'boolean' ? showVehiclesTabFromStore : false
  );

  // Effect to update local state if the store value changes (e.g., after fetching settings)
  useEffect(() => {
      // Ensure that we are not in an undefined state before setting
      if (typeof showVehiclesTabFromStore === 'boolean') {
        setLocalShowVehiclesTab(showVehiclesTabFromStore);
      }
  }, [showVehiclesTabFromStore]);

  const handleSelectChange = (e) => {
      const newValue = e.target.value === 'true';
      setLocalShowVehiclesTab(newValue);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateEmployerSettings({ showVehiclesTabInSidebar: localShowVehiclesTab }));
  };

  return (
    // Adopt structure similar to TabletViewSettingsSection
    <div className="tablet-view-settings-card"> {/* Using class from TabletViewSettings */}
      <div>
        <h3 className="tablet-view-title">Vehicle Settings</h3> {/* Using class from TabletViewSettings */}
        <form onSubmit={handleSubmit}>
          {/* Adopt input structure from TabletViewSettings */}
          <div className="tablet-view-input select-input" id="vehicleSettingsShowVehiclesTab">
            <p className="select-slim-label">Show Vehicles Tab in Sidebar?</p>
            <select
              id="showVehiclesTabSelect"
              name="showVehiclesTabSelect"
              value={localShowVehiclesTab.toString()}
              onChange={handleSelectChange}
              disabled={isSaving}
              // className="form-control" // form-control class removed to match TabletViewSettings select styling
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Adopt button group structure from TabletViewSettings */}
          <div className="tablet-view-button-group">
            <button
              type="submit"
              className="btn btn-primary" // Assuming .btn and .btn-primary are globally styled or defined below
              disabled={isSaving}
            >
              {isSaving ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faSave} />
              )}
              <span className="button-text">{isSaving ? 'Saving...' : 'Update '}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default VehicleSettingsSection;