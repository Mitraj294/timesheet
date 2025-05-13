import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { register, login, clearAuthError, checkProspectiveEmployee, selectProspectiveEmployeeCheck, clearProspectiveEmployeeCheck, requestCompanyInvitation } from "../../redux/slices/authSlice"; // Added requestCompanyInvitation
import { FontAwesomeIcon, } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faUser, faEnvelope, faUserPlus, faSignInAlt, faGlobe, faPhone, faBuilding, faLock, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { parsePhoneNumberFromString, isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { setAlert } from "../../redux/slices/alertSlice";
import "../../styles/Register.scss";
import Alert from "../layout/Alert";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const { isAuthenticated, error: authApiError, loading } = useSelector((state) => state.auth);
  const prospectiveEmployeeCheck = useSelector(selectProspectiveEmployeeCheck);
  const { email: initialEmail, name: initialName } = location.state || {};

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: initialName || "",
    email: initialEmail || "",
    password: "",
    role: "", // Start with no role selected
    country: "",
    phoneNumber: "",
    companyName: "",
  });
  const [invitationFormData, setInvitationFormData] = useState({
    prospectiveEmployeeName: initialName || "",
    prospectiveEmployeeEmail: initialEmail || "",
    companyName: "", // Company they want to join
    companyEmail: "", // Email of the company/employer
  });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countryCode, setCountryCode] = useState('IN');
  const [isSubmittingInvitation, setIsSubmittingInvitation] = useState(false);


  // Effects
  useEffect(() => {
    dispatch(clearAuthError());
    dispatch(clearProspectiveEmployeeCheck()); // Clear check on mount
    return () => {
        dispatch(clearAuthError());
    };
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);
  useEffect(() => {
    if (authApiError) {
      dispatch(setAlert(authApiError, 'danger'));
    }
  }, [authApiError, dispatch]);

  useEffect(() => {
    if (prospectiveEmployeeCheck.status === 'succeeded' && prospectiveEmployeeCheck.result && !prospectiveEmployeeCheck.result.canProceed) {
        dispatch(setAlert(prospectiveEmployeeCheck.result.message, 'warning'));
    } else if (prospectiveEmployeeCheck.status === 'failed' && prospectiveEmployeeCheck.error) {
        const errorMessage = typeof prospectiveEmployeeCheck.error === 'string' ? prospectiveEmployeeCheck.error : prospectiveEmployeeCheck.error?.message || 'Failed to verify email.';
        dispatch(setAlert(errorMessage, 'danger'));
    }
}, [prospectiveEmployeeCheck, dispatch]);

  // Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'role' && step === 1 && value) {
      setStep(2);
      // Pre-fill invitation form if name/email already exist from location state
      if (value === 'employee') {
        setInvitationFormData(prev => ({
          ...prev,
          prospectiveEmployeeName: formData.name || initialName || "",
          prospectiveEmployeeEmail: formData.email || initialEmail || "",
        }));
      }
    }
  };

  const handleBack = () => {
    setStep(1);
    setFormData(prev => ({ ...prev, role: '' }));
    // Optionally clear invitationFormData too
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password, role } = formData;
    dispatch(clearAuthError()); // Clear previous errors before new attempt

    if (role === 'employer' && password !== confirmPassword) {
      dispatch(setAlert('Passwords do not match', 'danger'));
      return;
    }
    
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
      } catch (loginError) {
        dispatch(setAlert(loginError || 'Automatic login failed. Please log in manually.', 'warning'));
        navigate('/login', { state: { email } });
      }
    } catch (registerError) {
      dispatch(setAlert('Registration failed. Please try again.', 'danger'));
    }
  };

  const handleInvitationChange = (e) => {
    const { name, value } = e.target;
    setInvitationFormData({ ...invitationFormData, [name]: value });
  };

  const handleProspectiveEmailBlur = () => {
    if (formData.role === 'employee' && invitationFormData.prospectiveEmployeeEmail) {
      if (!/\S+@\S+\.\S+/.test(invitationFormData.prospectiveEmployeeEmail)) {
        dispatch(setAlert('Invalid email format.', 'warning'));
        dispatch(clearProspectiveEmployeeCheck());
        return;
      }
      dispatch(checkProspectiveEmployee({ email: invitationFormData.prospectiveEmployeeEmail }));
    } else {
      dispatch(clearProspectiveEmployeeCheck()); 
    }
  };

  const handleInvitationSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    setIsSubmittingInvitation(true);
    try {
      if (prospectiveEmployeeCheck.result && !prospectiveEmployeeCheck.result.canProceed) {
        dispatch(setAlert(prospectiveEmployeeCheck.result.message || "Cannot proceed with this email. It's already associated with an active employee.", 'warning'));
        setIsSubmittingInvitation(false);
        return;
      }
      // Dispatch the requestCompanyInvitation thunk
      await dispatch(requestCompanyInvitation(invitationFormData)).unwrap();
      // Success alert is handled within the thunk
      setInvitationFormData({ prospectiveEmployeeName: "", prospectiveEmployeeEmail: "", companyName: "", companyEmail: "" }); // Clear form
      setStep(1); // Go back to role selection or a success message page
    } catch (error) {
      // Error alert is handled within the thunk if it uses rejectWithValue and dispatches setAlert
      // If not, you might need to dispatch an alert here based on the error.
      // The thunk already dispatches setAlert on error.
      console.error("Error submitting invitation request from component:", error);
    } finally {
      setIsSubmittingInvitation(false);
    }
  };

  // Memoized Data
  const countryOptions = useMemo(() => {
    const countries = getCountries();
    return countries.map(country => ({
      value: country,
      label: `+${getCountryCallingCode(country)} (${country})`
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Render
  return (
    <div className="styles_LoginSignupContainer">
      <Alert />
      <div className="styles_Card">
        <div className="styles_Login_header">
          <img src="/img/download.png" alt="App Logo" className="styles_LoginLogo" />
        </div>
        <hr className="styles_Separator" />
        <h5 className="styles_FormHeader">Sign Up with TimeSheet</h5>
        <hr className="styles_Separator" />
        {step === 1 && (
          <div className="styles_LoginForm">
            <div className="styles_InputGroup styles_RoleSelection">
              <label htmlFor="role">Select Your Role to Continue</label>
              <div className="styles_InputWithIcon">
                <select id="role" name="role" value={formData.role} onChange={handleChange} disabled={loading}>
                  <option value="" disabled>Select Role...</option> {/* Placeholder */}
                  <option value="employee">👤 Employee</option>
                  <option value="employer">🏢 Employer</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <>
            {formData.role === 'employer' && (
              <form onSubmit={handleSubmit} className="styles_LoginForm">
                <button type="button" onClick={handleBack} className="styles_BackButton" disabled={loading}>
                  <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <p className="styles_SelectedRole">
                  Registering as: <strong>🏢 Employer</strong>
                </p>

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
                          {countryOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      <input id="phoneNumber" type="tel" name="phoneNumber" placeholder="Enter phone number" value={formData.phoneNumber} onChange={handleChange} disabled={loading} />
                    </div>
                      <FontAwesomeIcon icon={faPhone} className="styles_InputIcon styles_InputIconRight" />
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
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye}  className="styles_InputIcon styles_InputIconRight" />
                    </button>
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="confirmPassword">Confirm Password*</label>
                  <div className="styles_PasswordInputContainer">
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
                     <FontAwesomeIcon icon={faLock} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <button type="submit" className="styles_Button" disabled={loading}>
                  {loading ? "Signing Up..." : <><FontAwesomeIcon icon={faUserPlus} className="button-icon" /> Sign Up</>}
                </button>
              </form>
            )}

            {formData.role === 'employee' && (
              <form onSubmit={handleInvitationSubmit} className="styles_LoginForm">
                 <button type="button" onClick={handleBack} className="styles_BackButton" disabled={isSubmittingInvitation}>
                  <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <p className="styles_SelectedRole">
                  Request to Join a Company as: <strong>👤 Employee</strong>
                </p>
                <div className="styles_InputGroup">
                  <label htmlFor="prospectiveEmployeeName">Full Name*</label>
                  <div className="styles_InputWithIcon">
                    <input id="prospectiveEmployeeName" type="text" name="prospectiveEmployeeName" placeholder="Your Full Name" value={invitationFormData.prospectiveEmployeeName} onChange={handleInvitationChange} required disabled={isSubmittingInvitation} />
                    <FontAwesomeIcon icon={faUser} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="prospectiveEmployeeEmail">Email Address*</label>
                  <div className="styles_InputWithIcon">
                    <input id="prospectiveEmployeeEmail" type="email" name="prospectiveEmployeeEmail" placeholder="Your Email Address" value={invitationFormData.prospectiveEmployeeEmail} onChange={handleInvitationChange} onBlur={handleProspectiveEmailBlur} required disabled={isSubmittingInvitation || prospectiveEmployeeCheck.status === 'loading'} />
                    <FontAwesomeIcon icon={faEnvelope} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="targetCompanyName">Company Name*</label>
                  <div className="styles_InputWithIcon">
                    <input id="targetCompanyName" type="text" name="companyName" placeholder="Company You Want to Join" value={invitationFormData.companyName} onChange={handleInvitationChange} required disabled={isSubmittingInvitation} />
                    <FontAwesomeIcon icon={faBuilding} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                <div className="styles_InputGroup">
                  <label htmlFor="targetCompanyEmail">Company Email Address*</label>
                  <div className="styles_InputWithIcon">
                    <input id="targetCompanyEmail" type="email" name="companyEmail" placeholder="Employer's Email Address" value={invitationFormData.companyEmail} onChange={handleInvitationChange} required disabled={isSubmittingInvitation} />
                    <FontAwesomeIcon icon={faEnvelope} className="styles_InputIcon styles_InputIconRight" />
                  </div>
                </div>
                {prospectiveEmployeeCheck.status === 'loading' && <p className="styles_InfoText">Checking email...</p>}
                <button 
                  type="submit" 
                  className="styles_Button" 
                  disabled={isSubmittingInvitation || prospectiveEmployeeCheck.status === 'loading' || (prospectiveEmployeeCheck.result && !prospectiveEmployeeCheck.result.canProceed)}
                >
                  {isSubmittingInvitation ? "Sending Request..." : 
                   (prospectiveEmployeeCheck.status === 'loading' ? "Verifying..." : <><FontAwesomeIcon icon={faUserPlus} className="button-icon" /> Send Request</>)}
                </button>
              </form>
            )}
          </>
        )}

        <p className="styles_SignupPrompt">
          Already have an account?
          <button
            className="styles_SignupButton"
            onClick={() => navigate("/login", { state: { email: formData.email } })}
            disabled={loading}
          > 
            <FontAwesomeIcon icon={faSignInAlt} className="button-icon" /> Sign In
          </button>
        </p>
      </div>
    </div>
  );
};
export default Register;
