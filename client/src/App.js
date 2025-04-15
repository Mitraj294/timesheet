import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector, Provider } from "react-redux";
import store from "./store/store";
import { SidebarProvider } from "./context/SidebarContext";

// Layout Components
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Alert from "./components/layout/Alert";

// Auth
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";

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
import CreateProject from "./components/pages/CreateProject";
import EditEmployee from "./components/pages/updateEmployee";
import RosterPage from "./components/pages/RosterPage";
import CreateRole from "./components/pages/CreateRole";
import Vehicles from "./components/pages/Vehicles";
import CreateOrUpdateVehicle from "./components/pages/CreateOrUpdateVehicle";
import ViewProject from "./components/pages/ViewProject";
import ViewVehicle from "./components/pages/ViewVehicle";
import ViewReview from './components/pages/ViewReview';
import CreateOrUpdateVehicleReview from "./components/pages/CreateOrUpdateVehicleReview";


import "./styles/App.css";


// Protected route wrapper
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Layout wrapper
const Layout = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return (
    <>
      {isAuthenticated && <Navbar />}
      {isAuthenticated && <Sidebar />}
      <div className={`main-content ${isAuthenticated ? "authenticated" : "auth-page"}`}>
        {children}
      </div>
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <SidebarProvider>
        <Router>
          <Layout>
            <Alert />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/login" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
              <Route path="/employees/add" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />
              <Route path="/employees/add/:id" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />
              <Route path="/employees/edit/:id" element={<PrivateRoute><EditEmployee /></PrivateRoute>} />

              <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
              <Route path="/clients/create" element={<PrivateRoute><CreateClient /></PrivateRoute>} />
              <Route path="/clients/update/:id" element={<PrivateRoute><CreateClient /></PrivateRoute>} />
              <Route path="/clients/view/:clientId" element={<PrivateRoute><ViewClient /></PrivateRoute>} />
              <Route path="/clients/:clientId/create-project" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
              <Route path="/clients/:clientId/projects/update/:projectId" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
              <Route path="/clients/:clientId/projects/view/:projectId" element={<PrivateRoute><ViewProject /></PrivateRoute>} />

              <Route path="/timesheet" element={<PrivateRoute><Timesheet /></PrivateRoute>} />
              <Route path="/timesheet/create" element={<PrivateRoute><CreateTimesheet /></PrivateRoute>} />
              <Route path="/timesheet/edit/:id" element={<PrivateRoute><CreateTimesheet /></PrivateRoute>} />

              <Route path="/map" element={<PrivateRoute><Map /></PrivateRoute>} />

              <Route path="/rosterpage" element={<PrivateRoute><RosterPage /></PrivateRoute>} />
              <Route path="/createrole" element={<PrivateRoute><CreateRole /></PrivateRoute>} />
              <Route path="/createrole/:roleId?" element={<PrivateRoute><CreateRole /></PrivateRoute>} />

        {/* Vehicle Pages */}
<Route path="/vehicles" element={<PrivateRoute><Vehicles /></PrivateRoute>} />
<Route path="/employer/vehicles/create" element={<PrivateRoute><CreateOrUpdateVehicle /></PrivateRoute>} />
<Route path="/vehicles/update/:vehicleId" element={<PrivateRoute><CreateOrUpdateVehicle /></PrivateRoute>} />
<Route path="/vehicles/view/:vehicleId" element={<PrivateRoute><ViewVehicle /></PrivateRoute>} />

{/* For creating a review */}
<Route path="/vehicles/:vehicleId/review" element={<PrivateRoute><CreateOrUpdateVehicleReview /></PrivateRoute>} />

{/* For editing a review */}
<Route path="/vehicles/:vehicleId/reviews/:reviewId/edit" element={<PrivateRoute><CreateOrUpdateVehicleReview /></PrivateRoute>} />

{/* (Optional) If you have a separate view route */}
<Route path="/vehicles/:vehicleId/reviews/:reviewId" element={<PrivateRoute><ViewReview /></PrivateRoute>} />


<Route path="/vehicles/reviews/:reviewId/view" element={<PrivateRoute><ViewReview /></PrivateRoute>} />

            </Routes>
          </Layout>
        </Router>
      </SidebarProvider>
    </Provider>
  );
}

export default App;
