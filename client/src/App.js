// /home/digilab/timesheet/client/src/App.js
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector, Provider, useDispatch } from "react-redux";
import store from "./store/store";
import { SidebarProvider } from "./context/SidebarContext";
import { 
    loadUserFromToken, 
    selectIsAuthenticated, 
    selectAuthUser 
} from './redux/slices/authSlice';
import { fetchEmployerSettings } from './redux/slices/settingsSlice'; // Import the fetch settings thunk

// Layout Components
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Alert from "./components/layout/Alert";

// Auth
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// Pages
import Dashboard from "./components/pages/Dashboard";
import Employees from "./components/pages/Employees";
import EmployeeForm from "./components/pages/EmployeeForm";
import Clients from "./components/pages/Clients";
import CreateClient from "./components/pages/CreateClient";
import ViewClient from "./components/pages/ViewClient";
import Map from "./components/pages/Map";
import Timesheet from "./components/pages/Timesheet";
import CreateTimesheet from "./components/pages/CreateTimesheet";
import CreateProjectTimesheet from './components/pages/CreateProjectTimesheet';
import CreateProject from "./components/pages/CreateProject";
import RosterPage from "./components/pages/RosterPage";
import CreateRole from "./components/pages/CreateRole";
import Vehicles from "./components/pages/Vehicles";
import CreateOrUpdateVehicle from "./components/pages/CreateOrUpdateVehicle";
import ViewProject from "./components/pages/ViewProject";
import ViewVehicle from "./components/pages/ViewVehicle";
import ViewReview from './components/pages/ViewReview';
import CreateOrUpdateVehicleReview from "./components/pages/CreateOrUpdateVehicleReview";
import SettingsPage from './components/setting/SettingsPage';
import TabletView from './components/pages/TabletView'; // Import TabletView

import ConfirmDeleteAccountPage from './components/pages/ConfirmDeleteAccountPage';
import 'leaflet/dist/leaflet.css';
// import NotFoundPage from './components/pages/NotFoundPage';


import "./styles/App.css";


// Protected route wrapper
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth || {});

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f8' }}>
        <div className="spinner" style={{ border: '4px solid rgba(0,0,0,.1)', width: '36px', height: '36px', borderRadius: '50%', borderLeftColor: '#09f' }}></div>
        <p style={{ marginTop: '10px', color: '#333' }}>Loading Authentication...</p>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Layout wrapper component
const LayoutWrapper = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth || {});

  if (!isAuthenticated) {
    return <div className="auth-page">{children}</div>;
  }

  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-content authenticated">
        {children}
      </main>
    </>
  );
};


// Component to handle the main application logic including routing
const AppContent = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectAuthUser);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(loadUserFromToken());
    }
  }, [dispatch]);

  // Effect to fetch employer settings after user is authenticated and is an employer
  useEffect(() => {
    if (isAuthenticated && user?.role === 'employer') {
      dispatch(fetchEmployerSettings());
    }
  }, [dispatch, isAuthenticated, user]); // Dependencies ensure this runs when auth state changes
  
  return (
    <LayoutWrapper>
      <Alert />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

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
        <Route path="/clients/view/:clientId/project/:projectId" element={<PrivateRoute><ViewProject /></PrivateRoute>} />
        <Route path="/clients/:clientId/create-project" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
        <Route path="/clients/:clientId/projects/update/:projectId" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
        <Route path="/clients/:clientId/projects/view/:projectId" element={<PrivateRoute><ViewProject /></PrivateRoute>} />

        <Route path="/timesheet" element={<PrivateRoute><Timesheet /></PrivateRoute>} />
        <Route path="/timesheet/create" element={<PrivateRoute><CreateTimesheet /></PrivateRoute>} />
        <Route path="/timesheet/create/:timesheetId" element={<PrivateRoute><CreateTimesheet /></PrivateRoute>} />

        <Route path="/timesheet/project/create/:clientId/:projectId" element={<PrivateRoute><CreateProjectTimesheet /></PrivateRoute>} />
        <Route path="/timesheet/project/edit/:clientId/:projectId/:timesheetId" element={<PrivateRoute><CreateProjectTimesheet /></PrivateRoute>} />

        <Route path="/map" element={<PrivateRoute><Map /></PrivateRoute>} />

        <Route path="/rosterpage" element={<PrivateRoute><RosterPage /></PrivateRoute>} />
        <Route path="/createrole" element={<PrivateRoute><CreateRole /></PrivateRoute>} />
        <Route path="/createrole/:roleId?" element={<PrivateRoute><CreateRole /></PrivateRoute>} />


        <Route path="/vehicles" element={<PrivateRoute><Vehicles /></PrivateRoute>} />
        <Route path="/vehicles/create" element={<PrivateRoute><CreateOrUpdateVehicle /></PrivateRoute>} />
        <Route path="/vehicles/update/:vehicleId" element={<PrivateRoute><CreateOrUpdateVehicle /></PrivateRoute>} />
        <Route path="/vehicles/view/:vehicleId" element={<PrivateRoute><ViewVehicle /></PrivateRoute>} />

        <Route path="/vehicles/:vehicleId/review" element={<PrivateRoute><CreateOrUpdateVehicleReview /></PrivateRoute>} />
        <Route path="/vehicles/:vehicleId/reviews/:reviewId/edit" element={<PrivateRoute><CreateOrUpdateVehicleReview /></PrivateRoute>} />
        <Route path="/vehicles/reviews/:reviewId/view" element={<PrivateRoute><ViewReview /></PrivateRoute>} />
        
        <Route path="/confirm-delete-account/:token" element={<ConfirmDeleteAccountPage />} />
        <Route path="/tablet-view" element={<PrivateRoute><TabletView /></PrivateRoute>} /> {/* Add the new Tablet View route */}
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />

        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </LayoutWrapper>
  );
}

function App() {
  return (
    <Provider store={store}>
      <SidebarProvider>
        <Router>
          <AppContent />
        </Router>
      </SidebarProvider>
    </Provider>
  );
}

export default App;
