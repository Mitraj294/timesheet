import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import '../../styles/Vehicles.scss';

const ViewReview = () => {
  const location = useLocation();
  const { reviewData } = location.state || {}; // Get the review data passed from ViewVehicle

  if (!reviewData) {
    return <p>Review data not found.</p>;
  }

  return (
    <div className="vehicles-page">
      <div className="vehicles-header">
        <h4>Review Details</h4>
        <div className="breadcrumbs">
          <Link to="/dashboard">Dashboard</Link> /
          <Link to="/vehicles"> Vehicles</Link> /
          <Link to={`/vehicles/view/${reviewData.vehicleId}`}>View Vehicle</Link> /
          View Review
        </div>
      </div>

      <div className="vehicles-actions">
        <button className="btn btn-purple">Send Report</button>
        <button className="btn btn-red">Download Report</button>
      </div>

      <div className="vehicle-name-section">
        <h2 className="vehicle-name-heading">{reviewData.name}</h2>
      </div>

      <div className="review-grid">
        <div>
          <p className="label">Date Reviewed</p>
          <h4 className="value">{reviewData.dateReviewed?.split('T')[0]}</h4>
        </div>
        <div>
          <p className="label">Employee Name</p>
          <h4 className="value">{reviewData.employeeName}</h4>
        </div>
        <div>
          <p className="label">Oil Checked</p>
          <div className="status-group">
            <span className={`status-icon ${reviewData.oilChecked ? 'green' : 'red'}`}>
              {reviewData.oilChecked ? '✔' : '✘'}
            </span>
            <h4 className="value">{reviewData.oilChecked ? 'YES' : 'NO'}</h4>
          </div>
        </div>
        <div>
          <p className="label">Vehicle Checked</p>
          <div className="status-group">
            <span className={`status-icon ${reviewData.vehicleChecked ? 'green' : 'red'}`}>
              {reviewData.vehicleChecked ? '✔' : '✘'}
            </span>
            <h4 className="value">{reviewData.vehicleChecked ? 'YES' : 'NO'}</h4>
          </div>
        </div>
        <div>
          <p className="label">Vehicle Broken</p>
          <div className="status-group">
            <span className={`status-icon ${reviewData.vehicleBroken ? 'red' : 'green'}`}>
              {reviewData.vehicleBroken ? '✘' : '✔'}
            </span>
            <h4 className="value">{reviewData.vehicleBroken ? 'YES' : 'NO'}</h4>
          </div>
        </div>
        <div>
          <p className="label">Hours Used</p>
          <h4 className="value">{reviewData.hours || '--'} hrs</h4>
        </div>
        <div>
          <p className="label">Notes</p>
          <h4 className="value">{reviewData.notes || 'N/A'}</h4>
        </div>
      </div>
    </div>
  );
};

export default ViewReview;
