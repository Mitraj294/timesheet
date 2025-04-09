import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Provider } from "react-redux";
import store from "./store/store"; 
import { SidebarProvider } from "./context/SidebarContext";

// Import Components
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Alert from "./components/layout/Alert";

import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
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
import ViewProject from "./components/pages/ViewProject";  
import RosterPage from './components/pages/RosterPage';
import CreateRole from "./components/pages/CreateRole";

import "./styles/App.css";  


const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

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
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Provider store={store}>
      <SidebarProvider>
        <Router>
          <Layout>
            <Alert />
            <Routes>
              <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
              <Route path="/employees/add" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />
              <Route path="/employees/add/:id" element={<PrivateRoute><EmployeeForm /></PrivateRoute>} />
              <Route path="/employees/edit/:id" element={<PrivateRoute><EditEmployee /></PrivateRoute>} />

              <Route path="/rosterpage" element={<PrivateRoute><RosterPage /></PrivateRoute>} />
              <Route path="/createrole" element={<PrivateRoute><CreateRole /></PrivateRoute>} />
              <Route path="/createrole/:roleId?" element={<PrivateRoute><CreateRole /></PrivateRoute>} />
              <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
              <Route path="/clients/create" element={<PrivateRoute><CreateClient /></PrivateRoute>} />
              <Route path="/clients/update/:id" element={<PrivateRoute><CreateClient  /></PrivateRoute>} />
              <Route path="/clients/view/:clientId" element={<PrivateRoute><ViewClient /></PrivateRoute>} />
              <Route path="/clients/:clientId/create-project" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
              <Route path="/clients/:clientId/projects/update/:projectId" element={<PrivateRoute><CreateProject /></PrivateRoute>} />
              <Route path="/clients/:clientId/projects/view/:projectId"  element={<PrivateRoute><ViewProject /></PrivateRoute>} />


           

              <Route path="/map" element={<PrivateRoute><Map /></PrivateRoute>} />
              <Route path="/timesheet" element={<PrivateRoute><Timesheet /></PrivateRoute>} />
              <Route path="/timesheet/create" element={<PrivateRoute><CreateTimesheet /></PrivateRoute>} />
              <Route path="/timesheet/edit/:id" element={<PrivateRoute><CreateTimesheet /></PrivateRoute>} />
            </Routes>
          </Layout>
        </Router>
      </SidebarProvider>
    </Provider>
  );
}

export default App;
