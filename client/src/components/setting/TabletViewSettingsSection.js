import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { setAlert } from '../../redux/slices/alertSlice';
import { updateEmployerSettings, selectEmployerSettings, selectSettingsStatus } from '../../redux/slices/settingsSlice'; // Assuming these are correct
import '../../styles/TabletViewSettings.scss';

const TabletViewSettingsSection = () => {
  const dispatch = useDispatch();
  const currentSettings = useSelector(selectEmployerSettings);
  const settingsStatus = useSelector(selectSettingsStatus);

  const [formData, setFormData] = useState({
    tabletViewRecordingType: 'Automatically Record',
    tabletViewPasswordRequired: 'false',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        tabletViewRecordingType: currentSettings.tabletViewRecordingType || 'Automatically Record',
        tabletViewPasswordRequired: (currentSettings.tabletViewPasswordRequired === true || currentSettings.tabletViewPasswordRequired === 'true') ? 'true' : 'false',
      });
    }
  }, [currentSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Prepare data to be sent, converting boolean string back to boolean if necessary
      const settingsToSave = {
        ...formData,
        tabletViewPasswordRequired: formData.tabletViewPasswordRequired === 'true',
      };
      await dispatch(updateEmployerSettings(settingsToSave)).unwrap();
      dispatch(setAlert('Tablet view settings updated successfully!', 'success'));
    } catch (error) {
      // Error alert is handled by the thunk or a global error handler
      console.error('Failed to update tablet settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const recordingTypeOptions = [
    { value: 'Automatically Record', label: 'Automatically Record' },
    { value: 'Manually Record', label: 'Manually Record' },
  ];

  const passwordRequiredOptions = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ];

  if (settingsStatus === 'loading' && !currentSettings) {
    return (
      <div className="settings-placeholder-content">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="tablet-view-settings-card">
      <div>
        <h3 className="tablet-view-title">Tablet View</h3>
        <form onSubmit={handleSubmit}>
          <div className="tablet-view-input select-input" id="tabletViewRecordingType">
            <p className="select-slim-label">Recording Type*</p>
            <select
              name="tabletViewRecordingType"
              value={formData.tabletViewRecordingType}
              onChange={handleChange}
              disabled={isSaving || settingsStatus === 'loading'}
            >
              {recordingTypeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="tablet-view-input select-input" id="tabletViewPasswordRequired">
            <p className="select-slim-label">Password Is Required?</p>
            <select
              name="tabletViewPasswordRequired"
              value={formData.tabletViewPasswordRequired}
              onChange={handleChange}
              disabled={isSaving || settingsStatus === 'loading'}
            >
              {passwordRequiredOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="tablet-view-button-group">
            <button type="submit" className="btn btn-primary" disabled={isSaving || settingsStatus === 'loading'}>
              {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
              <span className="button-text">{isSaving ? 'Updating...' : 'Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TabletViewSettingsSection;
