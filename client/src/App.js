// /home/digilab/timesheet/client/src/App.js
import React, { useEffect } from "react"; // Added useEffect
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector, Provider, useDispatch } from "react-redux"; // Added useDispatch
import store from "./store/store";
import { SidebarProvider } from "./context/SidebarContext";
import { loadUserFromToken } from './redux/slices/authSlice'; // Import the thunk

// Layout Components
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Alert from "./components/layout/Alert";

// Auth
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from './components/auth/ForgotPassword'; // Import ForgotPassword
import ResetPassword from './components/auth/ResetPassword';   // Import ResetPassword

// Pages
import Dashboard from "./components/pages/Dashboard";
import Employees from "./components/pages/Employees";
import EmployeeForm from "./components/pages/EmployeeForm"; // This handles both add and edit
import Clients from "./components/pages/Clients";
import CreateClient from "./components/pages/CreateClient";
import ViewClient from "./components/pages/ViewClient";
import Map from "./components/pages/Map";
import Timesheet from "./components/pages/Timesheet";
import CreateTimesheet from "./components/pages/CreateTimesheet";
import CreateProjectTimesheet from './components/pages/CreateProjectTimesheet'; // Import the new component
import CreateProject from "./components/pages/CreateProject";
import RosterPage from "./components/pages/RosterPage";
import CreateRole from "./components/pages/CreateRole";
import Vehicles from "./components/pages/Vehicles";
import CreateOrUpdateVehicle from "./components/pages/CreateOrUpdateVehicle";
import ViewProject from "./components/pages/ViewProject";
import ViewVehicle from "./components/pages/ViewVehicle";
import ViewReview from './components/pages/ViewReview';
import CreateOrUpdateVehicleReview from "./components/pages/CreateOrUpdateVehicleReview";
import SettingsPage from './components/pages/SettingsPage'; // Import SettingsPage

import ConfirmDeleteAccountPage from './components/pages/ConfirmDeleteAccountPage'; // Import ConfirmDeleteAccountPage
import 'leaflet/dist/leaflet.css';


import "./styles/App.css";


// Protected route wrapper
const PrivateRoute = ({ children }) => {
  // Select isAuthenticated and isLoading state from auth slice
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth || {});

  // Show loading indicator while checking auth status
  if (isLoading) {
    // Optional: Return a loading spinner or null
    // Consider a more visually appealing loading state
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f8' }}>
        {/* You can replace this with a proper spinner component */}
        <div className="spinner" style={{ border: '4px solid rgba(0,0,0,.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: '#09f' }}></div>
        <p style={{ marginTop: '10px', color: '#333' }}>Loading Authentication...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated and not loading
  return isAuthenticated ? children : <Navigate to="/login" replace />; // Added replace prop
};

// Layout wrapper component to manage structure based on auth state
const LayoutWrapper = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth || {});

  if (!isAuthenticated) {
    // Render only the children (Login/Register pages) without Navbar/Sidebar
    return <div className="auth-page">{children}</div>;
  }

  // Render the full layout for authenticated users
  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-content authenticated"> {/* Use main tag for semantic content */}
        {children}
      </main>
    </>
  );
};


// Component to handle the main application logic including routing
const AppContent = () => {
  const dispatch = useDispatch();

  // Effect to load user from token on initial mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(loadUserFromToken());
    }
  }, [dispatch]); // Dependency array ensures this runs only once on mount

  return (
    <LayoutWrapper>
      <Alert /> {/* Alert is placed within the layout */}
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} /> {/* Add Forgot Password Route */}
        <Route path="/reset-password/:token" element={<ResetPassword />} /> {/* Add Reset Password Route */}

        {/* Redirect root to dashboard if authenticated, else to login */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Navigate to="/dashboard" replace />
            </PrivateRoute>
          }
        />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
        <Route path="/employees/add" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />
        <Route path="/employees/edit/:id" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />

        <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
        <Route path="/clients/create" element={<PrivateRoute><CreateClient /></PrivateRoute>} />
        <Route path="/clients/update/:id" element={<PrivateRoute><CreateClient /></PrivateRoute>} />
        <Route path="/clients/view/:clientId" element={<PrivateRoute><ViewClient /></PrivateRoute>} />
        <Route path="/clients/view/:clientId/project/:projectId" element={<ViewProject />} />
        <Route path="/clients/:clientId/create-project" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
        <Route path="/clients/:clientId/projects/update/:projectId" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
        <Route path="/clients/:clientId/projects/view/:projectId" element={<PrivateRoute><ViewProject /></PrivateRoute>} />

        {/* General Timesheet Create/Edit */}
        <Route path="/timesheet" element={<PrivateRoute><Timesheet /></PrivateRoute>} />
        {/* This route handles both creating a new timesheet (no ID) and editing (with timesheetId) */}
        <Route path="/timesheet/create" element={<PrivateRoute><CreateTimesheet /></PrivateRoute>} />
        <Route path="/timesheet/create/:timesheetId" element={<PrivateRoute><CreateTimesheet /></PrivateRoute>} />

        {/* Project-Specific Timesheet Create/Edit */}
        <Route path="/timesheet/project/create/:clientId/:projectId" element={<PrivateRoute><CreateProjectTimesheet /></PrivateRoute>} />
        <Route path="/timesheet/project/edit/:clientId/:projectId/:timesheetId" element={<PrivateRoute><CreateProjectTimesheet /></PrivateRoute>} />

        <Route path="/map" element={<PrivateRoute><Map /></PrivateRoute>} />

        <Route path="/rosterpage" element={<PrivateRoute><RosterPage /></PrivateRoute>} />
        <Route path="/createrole" element={<PrivateRoute><CreateRole /></PrivateRoute>} />
        <Route path="/createrole/:roleId?" element={<PrivateRoute><CreateRole /></PrivateRoute>} />


        <Route path="/vehicles" element={<PrivateRoute><Vehicles /></PrivateRoute>} />
        {/* Route for creating a new vehicle */}
        <Route path="/vehicles/create" element={<PrivateRoute><CreateOrUpdateVehicle /></PrivateRoute>} />
        <Route path="/vehicles/update/:vehicleId" element={<PrivateRoute><CreateOrUpdateVehicle /></PrivateRoute>} />
        <Route path="/vehicles/view/:vehicleId" element={<PrivateRoute><ViewVehicle /></PrivateRoute>} />

        <Route path="/vehicles/:vehicleId/review" element={<PrivateRoute><CreateOrUpdateVehicleReview /></PrivateRoute>} />
        <Route path="/vehicles/:vehicleId/reviews/:reviewId/edit" element={<PrivateRoute><CreateOrUpdateVehicleReview /></PrivateRoute>} />
        <Route path="/vehicles/reviews/:reviewId/view" element={<PrivateRoute><ViewReview /></PrivateRoute>} />
        <Route path="/confirm-delete-account/:token" element={<ConfirmDeleteAccountPage />} /> {/* Add route for account deletion confirmation */}
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} /> {/* Protect Settings Route */}



      </Routes>
    </LayoutWrapper>
  );
}


// Main App component: Sets up Providers and Router
function App() {
  return (
    <Provider store={store}>
      <SidebarProvider>
        <Router>
          <AppContent /> {/* Render the component that handles logic and routing */}
        </Router>
      </SidebarProvider>
    </Provider>
  );
}

export default App;
