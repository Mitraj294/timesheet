// /home/digilab/timesheet/client/src/components/auth/Register.js
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
// Correct the import name here - assuming you created and exported 'register'
import { register } from "../../redux/slices/authSlice"; // Changed from registerUser
import "../../styles/Register.scss";

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

  // Local state for alert messages derived from Redux error state
  const [alert, setAlert] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      // Redirect after successful registration and authentication
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Show alert messages based on Redux error state and clear them after 3 seconds
  useEffect(() => {
    if (error) {
      // Use the error message directly from Redux state
      setAlert(error);
      const timer = setTimeout(() => {
        setAlert("");
        // Optional: Dispatch an action to clear the error in Redux state as well
        // dispatch(clearAuthError()); // You would need to create this action/reducer
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // Clear local alert if Redux error becomes null
      setAlert("");
    }
  }, [error]); // Depend only on the error from Redux

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Registering user:", formData);
    // Use the correctly imported action here
    dispatch(register(formData)); // Changed from registerUser
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
      {/* Display the local alert message */}
      {alert && <p className="error-message">{alert}</p>}
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
