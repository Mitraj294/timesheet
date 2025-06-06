// /home/digilab/timesheet/client/src/components/setting/VehicleSettingsSection.js
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateEmployerSettings,
  selectShowVehiclesTabInSidebar,
  selectSettingsStatus
} from '../../redux/slices/settingsSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faSave } from '@fortawesome/free-solid-svg-icons';
import '../../styles/VehicleSettingsSection.scss';

const VehicleSettingsSection = () => {
  const dispatch = useDispatch();
  const showVehiclesTabFromStore = useSelector(selectShowVehiclesTabInSidebar);
  const settingsStatus = useSelector(selectSettingsStatus);
  const isSaving = settingsStatus === 'loading';

  // Local state for select input
  const [localShowVehiclesTab, setLocalShowVehiclesTab] = useState(
    typeof showVehiclesTabFromStore === 'boolean' ? showVehiclesTabFromStore : false
  );

  // Sync local state with Redux store
  useEffect(() => {
    if (typeof showVehiclesTabFromStore === 'boolean') {
      setLocalShowVehiclesTab(showVehiclesTabFromStore);
    }
  }, [showVehiclesTabFromStore]);

  useEffect(() => {
    console.log("[VehicleSettingsSection] Component mounted");
    return () => {
      console.log("[VehicleSettingsSection] Component unmounted");
    };
  }, []);

  const handleSelectChange = (e) => {
    setLocalShowVehiclesTab(e.target.value === 'true');
    console.log("[VehicleSettingsSection] Changed showVehiclesTabInSidebar to:", e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("[VehicleSettingsSection] Submitting vehicle settings:", localShowVehiclesTab);
    dispatch(updateEmployerSettings({ showVehiclesTabInSidebar: localShowVehiclesTab }));
  };

  return (
    <div className="tablet-view-settings-card">
      <h3 className="tablet-view-title">Vehicle Settings</h3>
      <form onSubmit={handleSubmit}>
        <div className="tablet-view-input select-input">
          <p className="select-slim-label">Show Vehicles Tab in Sidebar?</p>
          <select
            id="showVehiclesTabSelect"
            name="showVehiclesTabSelect"
            value={localShowVehiclesTab.toString()}
            onChange={handleSelectChange}
            disabled={isSaving}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="tablet-view-button-group">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
            <span className="button-text">{isSaving ? 'Saving...' : 'Update'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default VehicleSettingsSection;