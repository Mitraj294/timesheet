import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faDownload,
  faPaperPlane,
  faEye,
  faSearch,
  faCheck,
  faTimes,
  faPen,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import '../../styles/Vehicles.scss';

const ViewVehicle = () => {
  const { vehicleId } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicleWithReviews = async () => {
      try {
        const token = localStorage.getItem('token');
        const vehicleRes = await axios.get(`http://localhost:5000/api/vehicles/${vehicleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicle(vehicleRes.data);

        const reviewsRes = await axios.get(`http://localhost:5000/api/vehicles/reviews/${vehicleId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicleHistory(reviewsRes.data.reviews);
      } catch (err) {
        console.error('Error fetching vehicle with reviews:', err);
        alert('Failed to load vehicle or reviews.');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleWithReviews();
  }, [vehicleId]);

  const filteredHistory = vehicleHistory.filter((entry) => {
    const employeeName = entry.employeeId?.name?.toLowerCase() || '';
    return employeeName.includes(search.toLowerCase());
  });

  const handleCreateReviewClick = () => {
    navigate(`/vehicles/${vehicleId}/review`);
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/vehicles/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicleHistory((prev) => prev.filter((review) => review._id !== reviewId));
    } catch (err) {
      console.error('Error deleting review:', err);
      alert('Error deleting review');
    }
  };

  const handleViewReviewClick = (item) => {
 
    navigate(`/vehicles/${item._id}/review`, { state: { reviewData: item } });
  };
  

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="vehicles-page">
      <div className="vehicles-header">
        <h4>View Vehicle</h4>
        <div className="breadcrumbs">
          <Link to="/dashboard">Dashboard</Link>
          <span>/</span>
          <Link to="/vehicles">Vehicles</Link>
          <span>/</span>
          <span>View Vehicle</span>
        </div>
      </div>

      <div className="vehicles-actions">
        <button className="btn btn-purple" onClick={handleCreateReviewClick}>
          <FontAwesomeIcon icon={faPaperPlane} /> Create Review
        </button>
        <button className="btn btn-red">
          <FontAwesomeIcon icon={faDownload} /> Download Report
        </button>
      </div>

      <div className="vehicle-name-section">
        <h2 className="vehicle-name-heading">{vehicle?.name ?? 'Vehicle'}</h2>
      </div>

      <div className="vehicles-search">
        <input
          type="text"
          placeholder="Search by Employee"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FontAwesomeIcon icon={faSearch} className="search-icon" />
      </div>

      <div className="vehicles-grid">
        <div className="vehicles-row header">
          <div>Date</div>
          <div>Employee</div>
          <div>WOF/Rego</div>
          <div>Oil</div>
          <div>Checked</div>
          <div>Broken</div>
          <div>Hours</div>
          <div>Action</div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="no-reviews-message">No reviews found for the employee: {search}</div>
        ) : (
          filteredHistory.map((item) => (
            <div key={item._id} className="vehicles-row">
              <div>{item.dateReviewed ? new Date(item.dateReviewed).toLocaleDateString() : '--'}</div>
              <div>{item.employeeId?.name || '--'}</div>
              <div>{item.vehicle?.wofRego ?? 'N/A'}</div>
              <div>
                <FontAwesomeIcon
                  icon={item.oilChecked ? faCheck : faTimes}
                  className={item.oilChecked ? 'green' : 'red'}
                />
              </div>
              <div>
                <FontAwesomeIcon
                  icon={item.vehicleChecked ? faCheck : faTimes}
                  className={item.vehicleChecked ? 'green' : 'red'}
                />
              </div>
              <div>{item.vehicleBroken ? 'Yes' : 'No'}</div>
              <div>{item.hours || '--'}</div>
              <div className="action-buttons">
                <button onClick={() => handleViewReviewClick(item)}>
                  <FontAwesomeIcon icon={faEye} className="eye-icon" />
                </button>
                <Link to={`/vehicles/${item._id}/review`}>
                  <FontAwesomeIcon icon={faPen} className="edit-icon" />
                </Link>
                <button onClick={() => handleDeleteReview(item._id)} className="btn-icon btn-red">
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ViewVehicle;
