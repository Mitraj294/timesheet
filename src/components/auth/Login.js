import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom"; 
import { loginUser } from "../../redux/slices/authSlice"; 
import "../../styles/Login.scss"; 

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, error, loading } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard"); // Redirect after successful login
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(formData));
  };

  return (
    <div className="styles_LoginSignupContainer">
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
          {error && <p className="styles_Error">{error}</p>}
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
