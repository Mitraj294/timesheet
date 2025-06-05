import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { setAlert } from '../../redux/slices/alertSlice';
import { updateEmployerSettings, selectEmployerSettings, selectSettingsStatus } from '../../redux/slices/settingsSlice';
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

  // Load settings from backend
  useEffect(() => {
    if (currentSettings) {
      setFormData({
        tabletViewRecordingType: currentSettings.tabletViewRecordingType || 'Automatically Record',
        tabletViewPasswordRequired:
          (currentSettings.tabletViewPasswordRequired === true || currentSettings.tabletViewPasswordRequired === 'true')
            ? 'true' : 'false',
      });
    }
  }, [currentSettings]);

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Save settings
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const settingsToSave = {
        ...formData,
        tabletViewPasswordRequired: formData.tabletViewPasswordRequired === 'true',
      };
      await dispatch(updateEmployerSettings(settingsToSave)).unwrap();
      dispatch(setAlert('Tablet view settings updated successfully!', 'success'));
    } catch (error) {
      // Error handled by alert system
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
      <h3 className="tablet-view-title">Tablet View</h3>
      <form onSubmit={handleSubmit}>
        <div className="tablet-view-input select-input">
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
        <div className="tablet-view-input select-input">
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
  );
};

export default TabletViewSettingsSection;
