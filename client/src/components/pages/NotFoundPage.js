// /home/digilab/timesheet/client/src/components/pages/NotFoundPage.js
import React from 'react';
import { Link } from 'react-router-dom';

// Shows a simple message for 404 (not found) routes
const NotFoundPage = () => {
  console.warn("[NotFoundPage] 404 page rendered.");
  return (
    <div style={{ textAlign: 'center', marginTop: 50 }}>
      <h1>404 - Page Not Found</h1>
      <p>Sorry, the page you are looking for does not exist.</p>
      <Link to="/">Go to Homepage</Link>
    </div>
  );
};

export default NotFoundPage;
