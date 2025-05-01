// /home/digilab/timesheet/client/src/components/auth/Login.js
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
// Correct the import name here
import { login } from "../../redux/slices/authSlice"; // Changed from loginUser to login
import { setAlert } from "../../redux/slices/alertSlice"; // Import setAlert
import "../../styles/Login.scss";
import Alert from "../layout/Alert"; // Import the Alert component

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Selects state needed for UI feedback and redirection
  const { isAuthenticated, error, loading } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Redirects user to dashboard upon successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Dispatch alert on error change
  useEffect(() => {
    if (error) {
      dispatch(setAlert(error, 'danger')); // Dispatch error alert
    }
  }, [error, dispatch]);

  // Handles form input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handles form submission by dispatching the login action
  const handleSubmit = async (e) => { // Make the function async
    e.preventDefault();
    try {
      // Attempt login and wait for the result
      await dispatch(login(formData)).unwrap();
      // If login succeeds, show success alert (redirect is handled by useEffect)
      dispatch(setAlert('Login successful!', 'success'));
    } catch (loginError) {
      // Login failed - error alert is handled by the useEffect watching state.error
      console.error("Login failed:", loginError);
    }
  };

  return (
    <div className="styles_LoginSignupContainer">
      <Alert /> {/* Render Alert component */}
      <div className="styles_Card styles_Login">
        <div className="styles_Login_header">
          <img src="/img/download.png" alt="App Logo" />
        </div>
        <form onSubmit={handleSubmit} className="styles_LoginForm">
          <div className="styles_InputGroup">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="styles_InputGroup">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          {/* Displays login errors */}
          {/* {error && <p className="styles_Error">{error}</p>}  <- Removed inline error display */}
          {/* Disables button while loading */}
          <button type="submit" className="styles_Button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="styles_SignupPrompt">
          Don't have an account?
          <button
            className="styles_SignupButton"
            onClick={() => navigate("/register", { state: { email: formData.email } })}
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;