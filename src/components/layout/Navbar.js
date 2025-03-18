import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="navbar">
      <button id="menuButton" className="menu-button">
        <i className="fas fa-bars"></i>
      </button>
      <div className="navbar-center">
        <h4 className="logo">TimeSheet</h4>
      </div>
      <div className="navbar-user">
        <Link to="/login" className="user-button">
          <i className="fas fa-user"></i> Login
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
