// /home/digilab/timesheet/client/src/components/auth/Register.js
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
// Correct the import name here - assuming you created and exported 'register'
import { register, login } from "../../redux/slices/authSlice"; // Import login action as well
import { setAlert } from "../../redux/slices/alertSlice"; // Import setAlert
import "../../styles/Register.scss";
import Alert from "../layout/Alert"; // Import the Alert component

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, error, loading } = useSelector((state) => state.auth);
  const { email: initialEmail, name: initialName } = location.state || {}; // Pre-fill if available

  const [formData, setFormData] = useState({
    name: initialName || "",
    email: initialEmail || "",
    password: "",
    role: "employee", // Default role
  });

  useEffect(() => {
    if (isAuthenticated) {
      // Redirect after successful registration and authentication
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Dispatch alert on error change
  useEffect(() => {
    if (error) {
      dispatch(setAlert(error, 'danger')); // Dispatch error alert
      // Note: The Alert component itself handles the timeout based on alertSlice logic
      // Optional: Dispatch an action here to clear the error in authSlice if needed after showing the alert
    }
  }, [error]); // Depend only on the error from Redux

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => { // <-- Add async here
    e.preventDefault();
    const { email, password } = formData; // Extract credentials for login

    try {
      // Attempt registration
      await dispatch(register(formData)).unwrap();

      // If registration succeeds, show alert and attempt login
      dispatch(setAlert('Registration successful!', 'success'));

      try {
        // Attempt automatic login
        await dispatch(login({ email, password })).unwrap();
        // If login succeeds, show alert (redirect is handled by useEffect)
        dispatch(setAlert('Login successful!', 'success'));
      } catch (loginError) {
        // Handle login failure after successful registration
        dispatch(setAlert(loginError || 'Automatic login failed. Please log in manually.', 'warning'));
      }
    } catch (registerError) {
      // Registration failed - error alert is handled by the useEffect watching state.error
      console.error("Registration failed:", registerError);
      // No need to dispatch alert here, useEffect [error] handles it
    }
  };

  return (
    <div className="auth-container">
      <Alert /> {/* Render Alert component */}
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength="6" // Example: Add password validation
        />
        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="employee">Employee</option>
          <option value="employer">Employer</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? "Signing Up..." : "Sign Up"}
        </button>
      </form>
      <p className="styles_SignupPrompt">
        Already have an account?
        <button
          className="styles_SignupButton"
          onClick={() => navigate("/login", { state: { email: formData.email } })}
        >
          Sign in
        </button>
      </p>
    </div>
  );
};

export default Register;
