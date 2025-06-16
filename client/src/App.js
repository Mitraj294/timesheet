// /home/digilab/timesheet/client/src/App.js
import React, { useEffect, useLayoutEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useSelector, Provider, useDispatch } from "react-redux";
import store from "./store/store";
import { SidebarProvider } from "./context/SidebarContext";
import {
  loadUserFromToken,
  selectIsAuthenticated,
  selectAuthUser,
  selectIsTabletViewUnlocked,
  setTabletViewUnlocked
} from './redux/slices/authSlice';
import { setAlert } from './redux/slices/alertSlice';
import { fetchEmployerSettings } from './redux/slices/settingsSlice';

// Layout
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Alert from "./components/layout/Alert";

// Auth pages
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// Main pages
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
import TabletView from './components/pages/TabletView';
import ConfirmDeleteAccountPage from './components/pages/ConfirmDeleteAccountPage';
import 'leaflet/dist/leaflet.css';

import "./styles/App.css";

// Protects routes that require authentication
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

// Layout for authenticated and unauthenticated pages
const LayoutWrapper = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth || {});
  if (!isAuthenticated) return <div className="auth-page">{children}</div>;
  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="main-content authenticated">{children}</main>
    </>
  );
};

// Main app logic and routing
const AppContent = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectAuthUser);
  const isTabletViewUnlocked = useSelector(selectIsTabletViewUnlocked);
  const navigate = useNavigate();
  const location = useLocation();

  // Load user from token on app start
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) dispatch(loadUserFromToken());
  }, [dispatch]);

  // Fetch employer settings after authentication
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      dispatch(fetchEmployerSettings());
    }
  }, [dispatch, isAuthenticated, user?.id]);

  // Restore tablet view lock state from session storage
  useEffect(() => {
    const storedTabletLockState = sessionStorage.getItem('tabletViewUnlocked');
    if (storedTabletLockState === 'true') {
      dispatch(setTabletViewUnlocked(true));
    }
  }, [dispatch]);

  // Restrict navigation when tablet view is active
  useLayoutEffect(() => {
    const handlePopState = () => {
      if (isTabletViewUnlocked && window.location.pathname !== '/tablet-view') {
        navigate('/tablet-view', { replace: true });
        dispatch(setAlert('Navigation is restricted. Stay on Tablet View.', 'warning', 3500));
      }
    };
    if (isTabletViewUnlocked) {
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [isTabletViewUnlocked, navigate, dispatch]);

  // Redirect to /tablet-view if tablet view is active
  useEffect(() => {
    if (isTabletViewUnlocked && location.pathname !== '/tablet-view') {
      navigate('/tablet-view', { replace: true });
      dispatch(setAlert('Redirected to Tablet View as it is active.', 'warning', 3500));
    }
  }, [isTabletViewUnlocked, location.pathname, navigate, dispatch]);

  return (
    <LayoutWrapper>
      <Alert />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/" element={<PrivateRoute><Navigate to="/dashboard" replace /></PrivateRoute>} />

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
        <Route path="/timesheets" element={<PrivateRoute><Timesheet /></PrivateRoute>} />
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
        <Route path="/tablet-view" element={<PrivateRoute><TabletView /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        {/* <Route path="*" element={<NotFoundPage />} /> */}
      </Routes>
    </LayoutWrapper>
  );
};

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