// /home/digilab/timesheet/client/src/components/auth/Register.js
import React, { useState, useEffect, useMemo } from "react"; // Import useMemo
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom"; // Import Link
import { register, login, clearAuthError } from "../../redux/slices/authSlice"; // Import clearAuthError
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faUser, faEnvelope, faUserPlus, faSignInAlt, faGlobe, faPhone, faBuilding, faLock, faArrowLeft } from "@fortawesome/free-solid-svg-icons"; // Added/updated icons
import { parsePhoneNumberFromString, isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js'; // Import validation functions
import { setAlert } from "../../redux/slices/alertSlice";
import "../../styles/Register.scss"; // Use Register specific styles
// Removed logo import, using direct path now
import Alert from "../layout/Alert";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, error, loading } = useSelector((state) => state.auth);
  const { email: initialEmail, name: initialName } = location.state || {};

  const [step, setStep] = useState(1); // Step 1: Role selection, Step 2: Details
  const [formData, setFormData] = useState({
    name: initialName || "",
    email: initialEmail || "",
    password: "",
    role: "", // Start with no role selected
    country: "",
    phoneNumber: "",
    companyName: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countryCode, setCountryCode] = useState('IN'); // Default country code for phone validation

  // Clear errors on mount/unmount
  useEffect(() => {
    dispatch(clearAuthError());
    return () => {
        dispatch(clearAuthError());
    };
  }, [dispatch]);

  // Removed useEffect that automatically advanced step based on initial role

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Dispatch alert on error change
  useEffect(() => {
    if (error) {
      dispatch(setAlert(error, 'danger'));
    }
  }, [error, dispatch]); // Updated dependency array

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // If the role is changed while on step 1, advance to step 2
    // Ensure a valid role (not the placeholder "") is selected
    if (name === 'role' && step === 1 && value !== "") {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
    // Optional: Reset role if you want the user to explicitly re-select every time they go back
    setFormData(prev => ({ ...prev, role: '' })); // Reset role to placeholder
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password, role } = formData;
    dispatch(clearAuthError()); // Clear previous errors before new attempt

    if (role === 'employer' && password !== confirmPassword) {
      dispatch(setAlert('Passwords do not match', 'danger'));
      return;
    }

    // Validate phone number if provided (only for employer role where it's shown)
    if (role === 'employer' && formData.phoneNumber) {
        try {
            if (!isValidPhoneNumber(formData.phoneNumber, countryCode)) {
                dispatch(setAlert(`Please enter a valid phone number for the selected country (${countryCode}).`, 'warning'));
                return;
            }
        } catch (e) {
            dispatch(setAlert("Invalid phone number format.", 'warning'));
            return;
        }
    }

    try {
      await dispatch(register(formData)).unwrap();
      dispatch(setAlert('Registration successful!', 'success'));

      try {
        await dispatch(login({ email, password })).unwrap();
        dispatch(setAlert('Login successful!', 'success'));
        // Redirect is handled by the useEffect watching isAuthenticated
      } catch (loginError) {
        dispatch(setAlert(loginError || 'Automatic login failed. Please log in manually.', 'warning'));
        // Navigate to login page even if auto-login fails after registration
        navigate('/login', { state: { email } });
      }
    } catch (registerError) {
      // Error alert is handled by the useEffect watching state.error
      console.error("Registration failed:", registerError);
    }
  };

  // Generate country code options dynamically
  const countryOptions = useMemo(() => {
    const countries = getCountries(); // Gets ['AC', 'AD', 'AE', ...]
    return countries.map(country => ({
      value: country,
      label: `+${getCountryCallingCode(country)} (${country})`
    })).sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically by label
  }, []);

  return (
    // Use the same container class as Login for consistency if desired, or keep 'auth-container'
    <div className="styles_LoginSignupContainer"> {/* Changed to match Login */}
      <Alert />
      {/* Use styles_Card to match Login */}
      <div className="styles_Card"> {/* Removed styles_Login specific class */}
        {/* Header with Logo (like Login.js) */}
        <div className="styles_Login_header">
          <img src="/img/download.png" alt="App Logo" className="styles_LoginLogo" /> {/* Changed src and alt */}
        </div>
        <hr className="styles_Separator" />
        {/* Form Header Text (like Login.js, but changed text) */}
        <h5 className="styles_FormHeader">Sign Up with TimeSheet</h5>
        <hr className="styles_Separator" />
        {/* Use styles_LoginForm to match Login */}
        {step === 1 && (
          <div className="styles_LoginForm"> {/* Use form class for consistent spacing */}
            <div className="styles_InputGroup">
              <label htmlFor="role">Select Your Role to Continue</label> {/* Updated label */}
              <div className="styles_InputWithIcon">
                <select id="role" name="role" value={formData.role} onChange={handleChange} disabled={loading}>
                  <option value="" disabled>Select Role...</option> {/* Placeholder */}
                  <option value="employee">👤 Employee</option>
                  <option value="employer">🏢 Employer</option>
                </select>
              </div>
            </div>
            {/* Next button removed */}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="styles_LoginForm">
            {/* Back Button */}
            <button type="button" onClick={handleBack} className="styles_BackButton" disabled={loading}>
              <FontAwesomeIcon icon={faArrowLeft} /> Back
            </button>

            {/* Display Selected Role */}
            <p className="styles_SelectedRole">
              Registering as: <strong>{formData.role === 'employee' ? '👤 Employee' : '🏢 Employer'}</strong>
            </p>

            {/* Common Fields */}
            <div className="styles_InputGroup">
              <label htmlFor="name">Full Name*</label>
              <div className="styles_InputWithIcon">
                <input id="name" type="text" name="name" placeholder="Your Full Name" value={formData.name} onChange={handleChange} required disabled={loading} />
                <FontAwesomeIcon icon={faUser} className="styles_InputIcon styles_InputIconRight" />
              </div>
            </div>
            <div className="styles_InputGroup">
              <label htmlFor="email">Email Address*</label>
              <div className="styles_InputWithIcon">
                <input id="email" type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required disabled={loading} />
                <FontAwesomeIcon icon={faEnvelope} className="styles_InputIcon styles_InputIconRight" />
              </div>
            </div>

            {/* Employer Specific Fields */}
            {formData.role === 'employer' && (
              <>
                <div className="styles_InputGroup">
                  <label htmlFor="country">Country</label>
                  <div className="styles_InputWithIcon">
                    <input id="country" type="text" name="country" placeholder="Your Country" value={formData.country} onChange={handleChange} disabled={loading} />
                    <FontAwesomeIcon icon={faGlobe} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="phoneNumber">Phone Number</label>
                  {/* Re-add outer styles_InputWithIcon wrapper */}
                  <div className="styles_InputWithIcon">
                  <div className="phone-input-group">
                     <select
                        name="countryCode"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="country-code-select"
                        disabled={loading}
                        aria-label="Country Code"
                      >
                        {/* Dynamically generate options */}
                        {countryOptions.map(option => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    <input id="phoneNumber" type="tel" name="phoneNumber" placeholder="Enter phone number" value={formData.phoneNumber} onChange={handleChange} disabled={loading} />
                  </div>
                    <FontAwesomeIcon icon={faPhone} className="styles_InputIcon styles_InputIconRight" /> {/* Add icon back */}
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="companyName">Company Name*</label>
                  <div className="styles_InputWithIcon">
                    <input id="companyName" type="text" name="companyName" placeholder="Your Company Name" value={formData.companyName} onChange={handleChange} required disabled={loading} />
                    <FontAwesomeIcon icon={faBuilding} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
              </>
            )}

            {/* Common Password Fields */}
            <div className="styles_InputGroup">
              <label htmlFor="password">Password*</label>
              <div className="styles_PasswordInputContainer">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength="6"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="styles_PasswordToggleBtn" disabled={loading}>
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            {/* Employer Confirm Password */}
            {formData.role === 'employer' && (
              <div className="styles_InputGroup">
                <label htmlFor="confirmPassword">Confirm Password*</label>
                <div className="styles_PasswordInputContainer"> {/* Reuse style for consistency */}
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"} // Link visibility to main password toggle
                    name="confirmPassword"
                    placeholder="Confirm Your Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength="6"
                    disabled={loading}
                  />
                   <FontAwesomeIcon icon={faLock} className="styles_InputIcon styles_InputIconRight" /> {/* Ensure correct classes */}
                </div>
              </div>
            )}

            <button type="submit" className="styles_Button" disabled={loading}>
              {loading ? "Signing Up..." : <><FontAwesomeIcon icon={faUserPlus} className="button-icon" /> Sign Up</>}
            </button>
          </form>
        )}

        <p className="styles_SignupPrompt">
          Already have an account?
          <button
            className="styles_SignupButton"
            onClick={() => navigate("/login", { state: { email: formData.email } })}
            disabled={loading}
          >
            <FontAwesomeIcon icon={faSignInAlt} className="button-icon" /> Sign In {/* Added icon */}
          </button>
        </p>
      </div>
    </div>
  );
};


export default Register;

// Add styles for BackButton and SelectedRole in Register.scss if needed:
/*
.styles_BackButton {
  background: none;
  border: 1px solid #ccc;
  color: #555;
  padding: 8px 15px;
  // ... other styles similar to styles_SignupButton but maybe less prominent
}

.styles_SelectedRole {
  text-align: center; // Or left
  margin-bottom: 1rem; // Space before the form fields start
  color: #333;
}
*/
