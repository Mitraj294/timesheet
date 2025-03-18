import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store/store"; 

import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Alert from "./components/layout/Alert";

import Dashboard from "./components/pages/Dashboard";
import Employees from "./components/pages/Employees"; 
import Clients from "./components/pages/Clients"; 
import Map from "./components/pages/Map"; 
import Login from "./components/auth/Login"; 

import "./styles/App.css";  

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Navbar />
        <Sidebar />
        <div className="main-content">
          <Alert />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/map" element={<Map />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
