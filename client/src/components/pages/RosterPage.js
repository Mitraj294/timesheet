import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  startOfWeek,
  addWeeks,
  format,
  endOfWeek,
  isAfter
} from 'date-fns';

import '../../styles/RosterPage.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faArrowRight,
  faPlus,
  faSyncAlt,
  faCalendar
} from '@fortawesome/free-solid-svg-icons';

const RosterPage = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/employees', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmployees(res.data);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
        if (err.response?.status === 401) navigate('/login');
      }
    };

    fetchEmployees();
  }, [navigate]);

  const handlePrevWeek = () => setCurrentWeekStart(prev => addWeeks(prev, -1));
  const handleNextWeek = () => {
    const next = addWeeks(currentWeekStart, 1);
    const maxWeekStart = startOfWeek(new Date('2025-04-14'), { weekStartsOn: 1 });
    if (!isAfter(next, maxWeekStart)) setCurrentWeekStart(next);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    format(addWeeks(currentWeekStart, 0).setDate(currentWeekStart.getDate() + i), 'EEEE, MMM d')
  );

  return (
    <div className="roster-page">
      <header className="roster-header">
        <div className="title">
          <h2><FontAwesomeIcon icon={faCalendar} /> Rosters</h2>
          <div className="breadcrumbs">
            <Link to="/dashboard">Dashboard</Link> / <span>Rosters</span>
          </div>
        </div>
        <button className="btn btn-blue">
          <FontAwesomeIcon icon={faSyncAlt} className="icon-left" />
          Rollout Schedules to Next Week
        </button>
      </header>

      <div className="week-nav">
        <button className="btn btn-purple" onClick={handlePrevWeek}>
          <FontAwesomeIcon icon={faArrowLeft} className="icon-left" /> Prev Week
        </button>

        <h4>
          {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </h4>

        {!isAfter(currentWeekStart, startOfWeek(new Date('2025-04-14'), { weekStartsOn: 1 })) && (
          <button className="btn btn-purple" onClick={handleNextWeek}>
            Next Week <FontAwesomeIcon icon={faArrowRight} className="icon-right" />
          </button>
        )}
      </div>

      <div className="roster-body">
        {/* Sidebar: Roles */}
        <aside className="roles-sidebar">
          <div className="sidebar-header">
            <p>Roles</p>
            <button className="btn btn-green" onClick={() => navigate('/createrole')}>
              Create <FontAwesomeIcon icon={faPlus} className="icon-right" />
            </button>
          </div>
          {/* Future: Role List */}
        </aside>

        {/* Grid: Weekly Schedule */}
        <section className="schedule-grid">
          {weekDays.map(day => (
            <div key={day} className="grid-header">{day}</div>
          ))}
          {weekDays.map((_, i) => (
            <div key={i} className={`grid-cell ${i % 2 ? 'even' : ''}`} />
          ))}
        </section>

        {/* Sidebar: Employees */}
        <aside className="employees-sidebar">
          <div className="sidebar-header">
            <p>Employees</p>
          </div>
          <div className="employee-list">
            {employees.length > 0 ? (
              employees.map(emp => (
                <button key={emp._id} className="btn btn-purple">{emp.name}</button>
              ))
            ) : (
              <p>No employees found.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default RosterPage;
