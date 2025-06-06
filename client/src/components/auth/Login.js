import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login, clearAuthError } from "../../redux/slices/authSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faEnvelope, faSignInAlt, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import { setAlert } from "../../redux/slices/alertSlice";
import "../../styles/Login.scss";
import Alert from "../layout/Alert";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, error, loading } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: location.state?.email || "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  // Clear errors on mount/unmount
  useEffect(() => {
    dispatch(clearAuthError());
    return () => { 
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  // Redirect if logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Show alerts for errors or password change
  useEffect(() => {
    if (error) {
      dispatch(setAlert(error, 'danger'));
    } else if (location.state?.passwordChanged) {
      dispatch(setAlert('Password changed successfully. Please log in.', 'success'));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [error, location.state, dispatch, navigate, location.pathname]);

  // Update form fields
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle login
  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    try {
      await dispatch(login(formData)).unwrap();
      dispatch(setAlert('Login successful!', 'success'));
    } catch (loginError) {
      // Error alert handled by useEffect
    }
  };

  return (
    <div className="styles_LoginSignupContainer">
      <Alert />
      <div className="styles_Card styles_Login">
        <div className="styles_Login_header">
          <img src="/img/download.png" alt="App Logo" className="styles_LoginLogo" />
        </div>
        <hr className="styles_Separator" />
        <h5 className="styles_FormHeader">Sign In with TimeSheet</h5>
        <hr className="styles_Separator" />
        <form onSubmit={handleSubmit} className="styles_LoginForm">
          <div className="styles_InputGroup">
            <label htmlFor="email">Email</label>
            <div className="styles_InputWithIcon">
              <input
                id="email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="username"
              />
              <FontAwesomeIcon icon={faEnvelope} className="styles_InputIcon styles_InputIconRight" />
            </div>
          </div>
          <div className="styles_InputGroup">
            <label htmlFor="password">Password</label>
            <div className="styles_PasswordInputContainer">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="styles_PasswordToggleBtn" disabled={loading}>
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="styles_InputIcon styles_InputIconRight" />
              </button>
            </div>
          </div>
          <div className="styles_ForgotPasswordLink">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
          <button type="submit" className="styles_Button" disabled={loading}>
            {loading ? "Logging in..." : <><FontAwesomeIcon icon={faSignInAlt} className="button-icon" /> Login</>}
          </button>
        </form>
        <p className="styles_SignupPrompt">
          Don't have an account?
          <button
            className="styles_SignupButton"
            onClick={() => navigate("/register", { state: { email: formData.email } })}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faUserPlus} className="button-icon" /> Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
