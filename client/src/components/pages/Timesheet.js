import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faArrowLeft,
  faArrowRight,
  faPlus,
  faChevronDown,
  faChevronUp,
  faTrash,
  faDownload,
  faEnvelope 
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/Timesheet.scss';
import { DateTime } from 'luxon';

const API_URL = process.env.REACT_APP_API_URL || 'https://timesheet-c4mj.onrender.com/api';


 const formatDate = iso =>
   DateTime.fromISO(iso, { zone: 'utc' })
          .setZone(DateTime.local().zoneName)
          .toFormat('yyyy‑LL‑dd');

 const formatTime = iso =>
   DateTime.fromISO(iso, { zone: 'utc' })
          .setZone(DateTime.local().zoneName)
          .toFormat('HH:mm');

const Timesheet = () => {
  const [viewType, setViewType] = useState('Weekly');
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
const [selectedEmployee, setSelectedEmployee] = useState('');
const [startDate,      setStartDate]      = useState(null);
const [endDate,        setEndDate]        = useState(null);
const [showDownloadFilters, setShowDownloadFilters] = useState(false);

const [showSendFilters, setShowSendFilters] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTimesheets();
    fetchEmployees();
    fetchClients();
    fetchProjects();
  }, [currentDate, viewType]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found!');
        return;
      }
  
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/employees`, config);
      setEmployees(response.data);
    } catch (error) {
      console.error(
        'Error fetching employees:',
        error.response?.data || error.message
      );
      alert('Failed to fetch employees, please try again later.');
    }
  };
  
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found!');
        return;
      }
  
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/clients`, config);
      setClients(response.data);
    } catch (error) {
      console.error(
        'Error fetching clients:',
        error.response?.data || error.message
      );
      alert('Failed to fetch clients, please try again later.');
    }
  };
  

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found!');
        return;
      }
  
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(`${API_URL}/projects`, config);
      setProjects(response.data);
    } catch (error) {
      console.error(
        'Error fetching projects:',
        error.response?.data || error.message
      );
      alert('Failed to fetch projects, please try again later.');
    }
  };
  

  const fetchTimesheets = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found!');
        return;
      }
  
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get(
        `${API_URL}/timesheets`, // Using the API_URL constant
        config
      );
  
      const fetchedTimesheets = response.data?.timesheets;
      setTimesheets(Array.isArray(fetchedTimesheets) ? fetchedTimesheets : []);
    } catch (error) {
      console.error(
        'Error fetching timesheets:',
        error.response?.data || error.message
      );
      alert('Failed to fetch timesheets, please try again later.');
      setTimesheets([]);
    } finally {
      setIsLoading(false);
    }
  };
  

  const toggleExpand = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdate = (timesheet) => {
    navigate('/timesheet/create', { state: { timesheet, isUpdate: true } });
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this timesheet?'))
      return;
  
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication error! Please log in again.');
        return;
      }
  
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`${API_URL}/timesheets/${id}`, config); // Use API_URL constant
      alert('Timesheet deleted successfully!');
      fetchTimesheets();
    } catch (error) {
      console.error(
        'Error deleting timesheet:',
        error.response?.data || error.message
      );
      alert('Failed to delete timesheet. Check console for details.');
    }
  };
  

  const adjustToMonday = (date) => {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return new Date(date.setDate(date.getDate() + diff));
  };

  const handlePrev = () => {
    let newDate = new Date(currentDate);

    if (viewType === 'Daily') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      if (viewType === 'Weekly') newDate.setDate(newDate.getDate() - 7);
      else if (viewType === 'Fortnightly')
        newDate.setDate(newDate.getDate() - 14);
      else if (viewType === 'Monthly') newDate.setMonth(newDate.getMonth() - 1);

      newDate = adjustToMonday(newDate);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    let newDate = new Date(currentDate);

    if (viewType === 'Daily') {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      if (viewType === 'Weekly') newDate.setDate(newDate.getDate() + 7);
      else if (viewType === 'Fortnightly')
        newDate.setDate(newDate.getDate() + 14);
      else if (viewType === 'Monthly') newDate.setMonth(newDate.getMonth() + 1);

      newDate = adjustToMonday(newDate);
    }
    setCurrentDate(newDate);
  };

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const generateDateColumns = useMemo(() => {
    let startDate = new Date(currentDate);

    if (viewType !== 'Daily') {
      startDate = adjustToMonday(startDate);
    }

    let daysCount =
      viewType === 'Daily'
        ? 1
        : viewType === 'Weekly'
        ? 7
        : viewType === 'Fortnightly'
        ? 14
        : 28;

    return Array.from({ length: daysCount }, (_, i) => {
      let day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      return {
        date: day,
        formatted: format(day, 'EEE, MMM dd'),
      };
    });
  }, [currentDate, viewType]);

  const groupTimesheets = useMemo(() => {
    let grouped = {};
    timesheets.forEach((timesheet) => {
      const employeeId = timesheet.employeeId?._id || timesheet.employeeId;

      const employee = employees.find((emp) => emp._id === employeeId);
      const employeeName = employee ? employee.name : 'Unknown';

      const client = clients.find((c) => c._id === timesheet.clientId);
      const clientName = client ? client.name : 'Unknown Client';

      const project = projects.find((p) => p._id === timesheet.projectId);
      const projectName = project ? project.name : 'Unknown Project';

      if (!grouped[employeeId]) {
        grouped[employeeId] = {
          id: employeeId,
          name: employeeName,
          hoursPerDay: {},
          details: [],
        };
        generateDateColumns.forEach(
          (day) => (grouped[employeeId].hoursPerDay[day.formatted] = 0)
        );
      }

      const date = new Date(timesheet.date);
      const formattedDate = format(date, 'EEE, MMM dd');

      if (grouped[employeeId].hoursPerDay[formattedDate] !== undefined) {
        grouped[employeeId].hoursPerDay[formattedDate] += parseFloat(
          timesheet.totalHours
        );
      }
      grouped[employeeId].details.push({
        ...timesheet,
        clientName,
        projectName,
      });
    });

    return Object.values(grouped);
  }, [timesheets, employees, generateDateColumns]);



  const handleSendEmail = async () => {
    if (!email) {
      alert('Please enter a valid email address.');
      return;
    }
  
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication error! Please log in again.');
        return;
      }
  
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };
  
      const body = {
        email,
        employeeIds: selectedEmployee ? [selectedEmployee] : [],
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      };
  
      const response = await axios.post(
        `${API_URL}/timesheets/send`, // Use the API_URL constant here
        body,
        config
      );
  
      alert(response.data.message || 'Timesheet sent successfully!');
    } catch (error) {
      console.error('Error sending timesheet email:', error);
      alert('Failed to send timesheet. Please try again.');
    }
  };
  
  


// ...

const handleDownload = async () => {
  try {
    const response = await fetch(`${API_URL}/timesheets/download`, {  // Use the API_URL constant here
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeIds: selectedEmployee ? [selectedEmployee] : [],
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch download');
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'timesheets.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error('Download failed', err);
    alert('Could not download report');
  }
};







  const renderTableHeaders = () => {
    if (viewType === 'Daily') {
      return (
        <>
          <th>Expand</th>
          <th>Employee</th>
          <th>{generateDateColumns[0]?.formatted || 'Date'}</th>
          <th>Total</th>
        </>
      );
    }
    if (viewType === 'Weekly') {
      return (
        <>
          <th>Expand</th>
          <th>Employee</th>
          <th>Week Period</th>
          <th>Mon</th>
          <th>Tue</th>
          <th>Wed</th>
          <th>Thu</th>
          <th>Fri</th>
          <th>Sat</th>
          <th>Sun</th>
          <th>Total</th>
        </>
      );
    } else {
      return (
        <>
          <th>Expand</th>
          <th>Employee</th>
          <th>Week</th>
          <th>Week Period</th>
          <th>Mon</th>
          <th>Tue</th>
          <th>Wed</th>
          <th>Thu</th>
          <th>Fri</th>
          <th>Sat</th>
          <th>Sun</th>
          <th>Total</th>
        </>
      );
    }
  };
  return (
    <div className='Timesheet-container'>
<div className="timesheet-header">
<div className="header-left">
    <h3><FontAwesomeIcon icon={faPen} /> Timesheet</h3>
    <div className="breadcrumb">
      <Link to="/dashboard">Dashboard</Link>
      <span className="breadcrumb-separator"> / </span>
      <span className="breadcrumb-current">Timesheet</span>
    </div>
  </div>
  <div className="header-right">
    <button className="btn btn-red" onClick={() => setShowDownloadFilters(prev => !prev)}>
      <FontAwesomeIcon icon={faDownload} /> Download Report
    </button>
    <button className="btn btn-purple" onClick={() => setShowSendFilters(prev => !prev)}>
      <FontAwesomeIcon icon={faEnvelope} /> Send Report
    </button>
  </div>








  {showDownloadFilters && (
  <div className="filter-panel">
    <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="filter-select">
      <option value="">All Employees</option>
      {employees.map(emp => (
        <option key={emp._id} value={emp._id}>{emp.name}</option>
      ))}
    </select>
    <DatePicker selected={startDate} onChange={setStartDate} placeholderText="From" dateFormat="yyyy-MM-dd" className="filter-datepicker" />
    <DatePicker selected={endDate} onChange={setEndDate} minDate={startDate} placeholderText="To" dateFormat="yyyy-MM-dd" className="filter-datepicker" />
    <button className="btn btn-red" onClick={handleDownload}>
      <FontAwesomeIcon icon={faDownload} /> Download
    </button>
  </div>
)}

{showSendFilters && (
  <div className="filter-panel">
    <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} className="filter-select">
      <option value="">All Employees</option>
      {employees.map(emp => (
        <option key={emp._id} value={emp._id}>{emp.name}</option>
      ))}
    </select>
    <DatePicker selected={startDate} onChange={setStartDate} placeholderText="From" dateFormat="yyyy-MM-dd" className="filter-datepicker" />
    <DatePicker selected={endDate} onChange={setEndDate} minDate={startDate} placeholderText="To" dateFormat="yyyy-MM-dd" className="filter-datepicker" />
    <input type="email" placeholder="Recipient email" value={email} onChange={e => setEmail(e.target.value)} className="filter-email" />
    <button className="btn btn-purple" onClick={handleSendEmail}>
      <FontAwesomeIcon icon={faEnvelope} /> Send
    </button>
  </div>
)}
</div>



      <div className='timesheet-top-bar'>
        <div className='timesheet-period'>
          {viewType === 'Daily'
            ? generateDateColumns[0].formatted
            : `${generateDateColumns[0].formatted} - ${
                generateDateColumns[generateDateColumns.length - 1].formatted
              }`}
        </div>
        <div className='view-type-container'>
          <button
            className='nav-button'
            onClick={handlePrev}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          <select
            id='viewType'
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            className='view-type-dropdown'
          >
            <option value='Daily'>Daily</option>
            <option value='Weekly'>Weekly</option>
            <option value='Fortnightly'>Fortnightly</option>
            <option value='Monthly'>Monthly</option>
          </select>
          <button
            className='nav-button'
            onClick={handleNext}
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </button>
        </div>

        <button
          className='create-timesheet-btn'
          onClick={() => navigate('/timesheet/create')}
        >
          <FontAwesomeIcon icon={faPlus} /> Create Timesheet
        </button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="timesheet-table-wrapper">
        <table className='timesheet-table'>
          <thead>
            <tr>{renderTableHeaders()}</tr>
          </thead>
          <tbody>
            {groupTimesheets.map((employee, index) => {
              const totalHours = formatHours(
                Object.values(employee.hoursPerDay).reduce(
                  (sum, h) => sum + h,
                  0
                )
              );

              let dayChunks = [];
              if (viewType === 'Fortnightly' || viewType === 'Monthly') {
                let chunkSize = 7;
                for (
                  let i = 0;
                  i < generateDateColumns.length;
                  i += chunkSize
                ) {
                  dayChunks.push(generateDateColumns.slice(i, i + chunkSize));
                }
              } else {
                dayChunks = [generateDateColumns];
              }

              return (
                <React.Fragment
                  key={`${employee.employeeId || 'unknown'}-${index}`}
                >
                  {dayChunks.map((week, weekIndex) => {
                    const weekLabel = `Week ${weekIndex + 1}`;
                    const weekPeriod = `${week[0].formatted} - ${
                      week[week.length - 1].formatted
                    }`;

                    return (
                      <tr key={`${employee.employeeId}-week-${weekIndex}`}>
                        {weekIndex === 0 && (
                          <>
                            <td rowSpan={dayChunks.length}>
                              <button
                                onClick={() => toggleExpand(employee.name)}
                                className='expand-btn'
                              >
                                <FontAwesomeIcon
                                  icon={
                                    expandedRows[employee.name]
                                      ? faChevronUp
                                      : faChevronDown
                                  }
                                />
                              </button>
                            </td>
                            <td rowSpan={dayChunks.length}>{employee.name}</td>
                            {viewType === 'Weekly' && (
                              <td rowSpan={dayChunks.length}>
                                {`${generateDateColumns[0].formatted} - ${generateDateColumns[6].formatted}`}
                              </td>
                            )}
                          </>
                        )}

                        {viewType === 'Fortnightly' ||
                        viewType === 'Monthly' ? (
                          <>
                            <td>{weekLabel}</td>
                            <td>{weekPeriod}</td>
                          </>
                        ) : null}

                        {week.map((day, dayIndex) => {
                          const dayHours = formatHours(
                            employee.hoursPerDay[day.formatted]
                          );
                          return (
                            <td
                              key={`${employee.employeeId}-${day.formatted}-${dayIndex}`}
                              className='timesheet-cell'
                            >
                              {!expandedRows[employee.name] ? (
                                dayHours
                              ) : (
                                <div className='expanded-content'>
                                  <strong>{dayHours}</strong>
                                  {employee.details
                                    .filter(
                                      (entry) =>
                                        new Date(entry.date).toDateString() ===
                                        day.date.toDateString()
                                    )
                                    .map((entry) => (
                                      <div
                                        key={entry._id || `entry-${Math.random()}`}
                                        className='timesheet-entry'
                                      >
                                        <button
                                          className='icon-btn'
                                          onClick={() => handleUpdate(entry)}
                                        >
                                          <FontAwesomeIcon icon={faPen} />
                                        </button>
                                        <button
                                          className='icon-btn delete-btn'
                                          onClick={() =>
                                            handleDelete(entry._id)
                                          }
                                        >
                                          <FontAwesomeIcon icon={faTrash} />
                                        </button>
                          
                                        <p>
                                          <b>Employee Name:</b> {employee.name || 'N/A'}
                                        </p>
                                        <p>
                                          <b>Date:</b>{' '}
                                          {entry.date
                                            ? formatDate(entry.date)
                                            : 'N/A'}
                                        </p>
                                        <p>
                                          <b>Client:</b> {entry.clientId?.name || 'N/A'}
                                        </p>
                                        <p>
                                          <b>Project:</b> {entry.projectId?.name || 'N/A'}
                                        </p>
                                        <p>
                                          <b>Start Time:</b>{' '}
                                          {entry.startTime
                                            ? formatTime(entry.startTime)
                                            : 'N/A'}
                                        </p>
                                        <p>
                                          <b>End Time:</b>{' '}
                                          {entry.endTime
                                            ? formatTime(entry.endTime)
                                            : 'N/A'}
                                        </p>
                                        {(() => {
                                          const [h, m] = entry.lunchDuration
                                            .split(':')
                                            .map(Number);
                                          const mins = h * 60 + m;
                                          return (
                                            <p>
                                              <b>Lunch Break:</b>{' '}
                                              {entry.lunchBreak === 'Yes'
                                                ? `${mins} mins`
                                                : 'No break'}
                                            </p>
                                          );
                                        })()}
                          
                                        <p>
                                          <b>Total Hours Worked:</b>{' '}
                                          {entry.totalHours || 'N/A'}
                                        </p>
                          
                                        <p>
                                          <b>Leave Type:</b>{' '}
                                          {entry.leaveType !== 'None'
                                            ? entry.leaveType
                                            : 'Not on leave'}
                                        </p>
                          
                                        {/* show description only if leaveType isn’t “None” */}
                                        {entry.leaveType !== 'None' && entry.description && (
                                          <p>
                                            <b>Description:</b> {entry.description}
                                          </p>
                                        )}
                          
                                        {/* always show notes */}
                                        <p>
                                          <b>Notes:</b> {entry.notes || 'N/A'}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </td>
                          );
                          
                        })}
                        <td>{totalHours}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
