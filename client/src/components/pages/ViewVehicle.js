import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEye } from '@fortawesome/free-solid-svg-icons';

const ViewVehicle = () => {
  const { vehicleId } = useParams();
  const [vehicleHistory, setVehicleHistory] = useState([]);

  useEffect(() => {
    const fetchVehicleHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/vehicles/${vehicleId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVehicleHistory(res.data);
      } catch (err) {
        console.error('Error fetching vehicle history:', err);
      }
    };

    fetchVehicleHistory();
  }, [vehicleId]);

  return (
    <div className="view-vehicle container">
      <Link to="/vehicles" className="btn btn-back mb-3">
        <FontAwesomeIcon icon={faArrowLeft} /> Back to Vehicles
      </Link>

      <h2>Hired Vehicle/Plant</h2>

      <table className="table">
        <thead>
          <tr style={{ backgroundColor: '#a278db', color: '#fff' }}>
            <th>Date</th>
            <th>Employee Name</th>
            <th>WOF/Rego</th>
            <th>Oil Checked</th>
            <th>Vehicle Checked</th>
            <th>Vehicle Broken</th>
            <th>Hours</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {vehicleHistory.map((item) => (
            <tr key={item._id}>
              <td>{item.dateReviewed?.split('T')[0]}</td>
              <td>{item.employeeName}</td>
              <td>{item.wofRego ?? 'null'}</td>
              <td>{item.oilChecked ? '✔' : '✘'}</td>
              <td>{item.vehicleChecked ? '✔' : '✘'}</td>
              <td style={{ color: item.vehicleBroken ? 'red' : 'inherit' }}>
                {item.vehicleBroken ? 'Yes' : 'No'}
              </td>
              <td>{item.hours}</td>
              <td>
                <FontAwesomeIcon icon={faEye} style={{ cursor: 'pointer', color: '#22c55e' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ViewVehicle;
