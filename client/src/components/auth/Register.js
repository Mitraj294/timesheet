import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom"; 
import { registerUser } from "../../redux/slices/authSlice"; 
import "../../styles/Register.scss"; 

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { isAuthenticated, error, loading } = useSelector((state) => state.auth);
  const { email, name } = location.state || {}; // Pre-fill if available

  const [formData, setFormData] = useState({
    name: name || "",
    email: email || "",
    password: "",
    role: "employee", // "employee" or "employer"
  });

  // Local state for alert messages
  const [alert, setAlert] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      // Redirect after successful registration
      // You can change the redirect route based on the role (employee/employer)
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Show alert messages and clear them after 3 seconds
  useEffect(() => {
    if (error) {
      setAlert(error);
      const timer = setTimeout(() => {
        setAlert("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Registering user:", formData);
    dispatch(registerUser(formData));
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
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
